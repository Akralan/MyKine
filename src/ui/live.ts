import { AngleSmoother, computeAngles } from "../geometry/angles";
import { CameraPoseSource, DEFAULT_POSE_MODEL, POSE_MODELS, isPoseModel, type PoseModel } from "../pose/mediapipe";
import type { Frame } from "../pose/types";
import type { ExerciseDefinition } from "../scoring/exercise";
import { RepCounter, summarize, type LiveMetrics } from "../scoring/repCounter";
import { saveSession, type SessionRecord } from "../storage/db";
import { KNEE_HIGHLIGHT, drawSkeleton } from "./skeleton";

const MODEL_STORAGE_KEY = "mycoach.poseModel";

function loadPreferredModel(): PoseModel {
  try {
    const v = localStorage.getItem(MODEL_STORAGE_KEY);
    return isPoseModel(v) ? v : DEFAULT_POSE_MODEL;
  } catch {
    return DEFAULT_POSE_MODEL;
  }
}

/** Écran de séance : caméra + squelette live + mesures. Enregistre les frames et sauvegarde à l'arrêt. */
export function renderLive(root: HTMLElement, exercise: ExerciseDefinition, onSaved: (id: string) => void): () => void {
  let model = loadPreferredModel();
  root.innerHTML = `
    <section class="live">
      <video playsinline muted></video>
      <canvas></canvas>
      <div class="hud hud-top">
        <div class="hud-reps"><span class="value" data-m="reps">0</span><span class="label">reps</span></div>
        <div class="hud-grid">
          <div class="metric"><span class="label">Genou</span><span class="value" data-m="angle">–</span></div>
          <div class="metric"><span class="label">Profondeur</span><span class="value" data-m="depth">–</span></div>
          <div class="metric"><span class="label">Meilleure</span><span class="value" data-m="best">–</span></div>
          <div class="metric"><span class="label">Asym. G/D</span><span class="value" data-m="asym">–</span></div>
          <div class="metric"><span class="label">Tronc</span><span class="value" data-m="lean">–</span></div>
        </div>
        <div class="warnings" data-m="warnings"></div>
      </div>
      <div class="hud hud-bottom">
        <div class="status">Chargement du modèle…</div>
        <label class="model-picker">
          <span>Modèle</span>
          <select data-a="model">
            ${(Object.keys(POSE_MODELS) as PoseModel[])
              .map((k) => `<option value="${k}"${k === model ? " selected" : ""}>${POSE_MODELS[k].label} — ${POSE_MODELS[k].hint}</option>`)
              .join("")}
          </select>
          <span class="fps" data-m="fps"></span>
        </label>
        <details class="instructions" open>
          <summary>Consignes de placement</summary>
          <ul>${exercise.instructions.map((i) => `<li>${i}</li>`).join("")}</ul>
        </details>
        <div class="actions">
          <button class="primary" data-a="start" disabled>Démarrer</button>
          <button data-a="stop" disabled>Terminer</button>
        </div>
      </div>
    </section>`;

  const video = root.querySelector("video")!;
  const canvas = root.querySelector("canvas")!;
  const ctx = canvas.getContext("2d")!;
  const status = root.querySelector<HTMLElement>(".status")!;
  const m = (k: string) => root.querySelector<HTMLElement>(`[data-m="${k}"]`)!;
  const btnStart = root.querySelector<HTMLButtonElement>('[data-a="start"]')!;
  const btnStop = root.querySelector<HTMLButtonElement>('[data-a="stop"]')!;
  const selModel = root.querySelector<HTMLSelectElement>('[data-a="model"]')!;

  const source = new CameraPoseSource(video, model);
  const smoother = new AngleSmoother(0.5);
  let counter = new RepCounter(exercise);
  let recording = false;
  let frames: Frame[] = [];
  let tRecStart = Number.NaN;

  const fmt = (v: number | null | undefined, unit = "°") => (v == null || Number.isNaN(v) ? "–" : `${Math.round(v)}${unit}`);

  function updateMetrics(metrics: LiveMetrics) {
    const s = summarize(metrics.reps);
    m("reps").textContent = `${s.repsTotal}${s.repsTotal !== s.repsComplete ? ` (${s.repsComplete} complètes)` : ""}`;
    m("angle").textContent = fmt(metrics.primaryAngle);
    m("depth").textContent = fmt(metrics.currentMinAngle);
    m("best").textContent = fmt(s.bestMinAngle);
    m("asym").textContent = fmt(metrics.asymmetry);
    m("lean").textContent = fmt(metrics.trunkLean);
    m("asym").classList.toggle("warn", metrics.warnings.asymmetry);
    m("lean").classList.toggle("warn", metrics.warnings.trunkLean);
    const w: string[] = [];
    if (metrics.warnings.asymmetry) w.push("Asymétrie gauche/droite");
    if (metrics.warnings.trunkLean) w.push("Tronc trop penché");
    m("warnings").innerHTML = w.map((x) => `<span class="badge">${x}</span>`).join("");
  }

  // Débit de frames traitées, lissé sur ~1 s : c'est la mesure la plus parlante pour comparer les modèles.
  let fpsWindowStart = 0;
  let fpsWindowCount = 0;
  function trackFps(t: number) {
    fpsWindowCount++;
    if (t - fpsWindowStart >= 1000) {
      m("fps").textContent = `${Math.round((fpsWindowCount * 1000) / (t - fpsWindowStart))} fps`;
      fpsWindowStart = t;
      fpsWindowCount = 0;
    }
  }

  function onFrame(frame: Frame) {
    trackFps(frame.t);
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawSkeleton(ctx, frame, { mirror: true, highlight: KNEE_HIGHLIGHT });

    if (!recording) return;
    // L'origine temporelle de la séance est la première frame reçue après « Démarrer ».
    if (Number.isNaN(tRecStart)) tRecStart = frame.t;
    const rel = { ...frame, t: frame.t - tRecStart };
    frames.push(rel);
    updateMetrics(counter.update(rel.t, smoother.next(computeAngles(rel))));
  }

  source
    .start(onFrame)
    .then(() => {
      status.textContent = "";
      btnStart.disabled = false;
    })
    .catch((err: unknown) => {
      status.textContent = `Caméra indisponible : ${err instanceof Error ? err.message : String(err)}`;
    });

  selModel.onchange = async () => {
    const next = selModel.value;
    if (!isPoseModel(next) || next === model) return;
    model = next;
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, next);
    } catch {
      /* stockage indisponible : le choix vaut pour cette séance seulement */
    }
    selModel.disabled = true;
    btnStart.disabled = true;
    status.textContent = `Chargement du modèle ${POSE_MODELS[next].label}…`;
    m("fps").textContent = "";
    try {
      await source.setModel(next);
      status.textContent = "";
    } catch (err: unknown) {
      status.textContent = `Modèle ${POSE_MODELS[next].label} indisponible : ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      selModel.disabled = false;
      if (!recording) btnStart.disabled = false;
    }
  };

  btnStart.onclick = () => {
    frames = [];
    selModel.disabled = true; // un seul modèle par séance, pour que les mesures restent comparables
    counter = new RepCounter(exercise);
    smoother.reset();
    tRecStart = Number.NaN;
    recording = true;
    btnStart.disabled = true;
    btnStop.disabled = false;
    root.querySelector<HTMLDetailsElement>(".instructions")!.open = false;
    status.textContent = "Enregistrement…";
  };

  btnStop.onclick = async () => {
    recording = false;
    btnStop.disabled = true;
    status.textContent = "Sauvegarde…";
    const reps = counter.getReps();
    const record: SessionRecord = {
      id: crypto.randomUUID(),
      exerciseId: exercise.id,
      createdAt: Date.now(),
      durationMs: frames.length ? frames[frames.length - 1]!.t : 0,
      frameCount: frames.length,
      aspectRatio: video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : undefined,
      poseModel: model,
      reps,
      summary: summarize(reps),
      frames,
    };
    await saveSession(record);
    source.stop();
    onSaved(record.id);
  };

  return () => source.stop();
}
