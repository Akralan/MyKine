import { AngleSmoother, computeAngles } from "../geometry/angles";
import { CameraPoseSource } from "../pose/mediapipe";
import type { Frame } from "../pose/types";
import type { ExerciseDefinition } from "../scoring/exercise";
import { RepCounter, summarize, type LiveMetrics } from "../scoring/repCounter";
import { saveSession, type SessionRecord } from "../storage/db";
import { KNEE_HIGHLIGHT, drawSkeleton } from "./skeleton";

/** Écran de séance : caméra + squelette live + mesures. Enregistre les frames et sauvegarde à l'arrêt. */
export function renderLive(root: HTMLElement, exercise: ExerciseDefinition, onSaved: (id: string) => void): () => void {
  root.innerHTML = `
    <section class="live">
      <div class="stage">
        <video playsinline muted></video>
        <canvas></canvas>
        <div class="status">Chargement du modèle…</div>
      </div>
      <aside class="panel">
        <h2>${exercise.name}</h2>
        <ul class="instructions">${exercise.instructions.map((i) => `<li>${i}</li>`).join("")}</ul>
        <div class="metrics">
          <div class="metric big"><span class="label">Répétitions</span><span class="value" data-m="reps">0</span></div>
          <div class="metric"><span class="label">Angle genou</span><span class="value" data-m="angle">–</span></div>
          <div class="metric"><span class="label">Profondeur rep</span><span class="value" data-m="depth">–</span></div>
          <div class="metric"><span class="label">Meilleure profondeur</span><span class="value" data-m="best">–</span></div>
          <div class="metric"><span class="label">Asymétrie G/D</span><span class="value" data-m="asym">–</span></div>
          <div class="metric"><span class="label">Tronc</span><span class="value" data-m="lean">–</span></div>
        </div>
        <div class="warnings" data-m="warnings"></div>
        <div class="actions">
          <button class="primary" data-a="start" disabled>Démarrer</button>
          <button data-a="stop" disabled>Terminer</button>
        </div>
      </aside>
    </section>`;

  const video = root.querySelector("video")!;
  const canvas = root.querySelector("canvas")!;
  const ctx = canvas.getContext("2d")!;
  const status = root.querySelector<HTMLElement>(".status")!;
  const m = (k: string) => root.querySelector<HTMLElement>(`[data-m="${k}"]`)!;
  const btnStart = root.querySelector<HTMLButtonElement>('[data-a="start"]')!;
  const btnStop = root.querySelector<HTMLButtonElement>('[data-a="stop"]')!;

  const source = new CameraPoseSource(video);
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

  function onFrame(frame: Frame) {
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

  btnStart.onclick = () => {
    frames = [];
    counter = new RepCounter(exercise);
    smoother.reset();
    tRecStart = Number.NaN;
    recording = true;
    btnStart.disabled = true;
    btnStop.disabled = false;
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
