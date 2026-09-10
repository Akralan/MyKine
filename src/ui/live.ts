import { AngleSmoother, computeAngles } from "../geometry/angles";
import { currentItem, effectiveDef, type Workout } from "../program/runner";
import { CameraPoseSource } from "../pose/mediapipe";
import type { Frame } from "../pose/types";
import { RepCounter, summarize, type LiveMetrics } from "../scoring/repCounter";
import { saveSession, type SessionRecord } from "../storage/db";
import { preferredModel } from "./prefs";
import { deg, el, escapeHtml, mountFullScreen } from "./shell";
import { KNEE_HIGHLIGHT, drawSkeleton } from "./skeleton";

/** Décompte avant chaque série, pour laisser le temps de se placer. */
const COUNTDOWN = 3;

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * 03 · Séance live. Gère toutes les séries de l'exercice en cours sans relâcher
 * la caméra : une série terminée = une entrée en base, puis décompte et série suivante.
 * Prévient l'appelant seulement quand l'exercice entier est fini.
 */
export function renderLive(
  root: HTMLElement,
  workout: Workout,
  onExerciseDone: () => void,
  onQuit: () => void,
): () => void {
  const pending = currentItem(workout);
  if (!pending) {
    onQuit();
    return () => {};
  }
  const item = pending;

  // Une mesure sans seuil n'a pas de sens pour cet exercice : pas de tuile plutôt qu'un
  // chiffre décoratif (le tronc vaut ~90° en permanence sur un exercice allongé).
  const tiles: { key: string; label: string }[] = [
    { key: "angle", label: cap(item.def.zone) },
    { key: "depth", label: item.def.depthLabel },
  ];
  if (item.def.asymmetryWarnDeg != null) tiles.push({ key: "asym", label: "Asym. G/D" });
  if (item.def.trunkLeanWarnDeg != null) tiles.push({ key: "lean", label: "Tronc" });

  const { phone, dispose: disposeShell } = mountFullScreen(root, { dark: true, status: false });
  const view = el(`
    <div class="live">
      <video playsinline muted autoplay></video>
      <canvas></canvas>
      <div class="stub">Démarrage de la caméra…</div>

      <div class="live-top">
        <div class="live-bar">
          <div class="live-pill paused"><i class="rec"></i><span data-m="set"></span></div>
          <button class="live-close" aria-label="Quitter la séance">✕</button>
        </div>
        <div class="live-count"><b data-m="count">—</b><span data-m="goal"></span></div>
        <div class="live-progress"><i style="width:0%"></i></div>
      </div>

      <div class="live-bottom">
        <div data-m="banner"></div>
        <div class="live-metrics">
          ${tiles
            .map(
              (t) =>
                `<div class="live-metric"><span class="lbl">${escapeHtml(t.label)}</span><span class="val" data-m="${t.key}">—</span></div>`,
            )
            .join("")}
        </div>
        <div class="live-actions">
          <button class="pause" disabled>Pause</button>
          <button class="done" disabled>Terminer la série</button>
        </div>
      </div>
    </div>`);
  phone.append(view);

  const video = view.querySelector("video")!;
  const canvas = view.querySelector("canvas")!;
  const ctx = canvas.getContext("2d")!;
  const stub = view.querySelector<HTMLElement>(".stub")!;
  const pill = view.querySelector<HTMLElement>(".live-pill")!;
  const progress = view.querySelector<HTMLElement>(".live-progress > i")!;
  const btnPause = view.querySelector<HTMLButtonElement>(".pause")!;
  const btnDone = view.querySelector<HTMLButtonElement>(".done")!;
  const m = (k: string) => view.querySelector<HTMLElement>(`[data-m="${k}"]`)!;
  /** Tuiles optionnelles : absentes du DOM quand la mesure n'a pas de sens ici. */
  const asymEl = view.querySelector<HTMLElement>('[data-m="asym"]');
  const leanEl = view.querySelector<HTMLElement>('[data-m="lean"]');

  const model = preferredModel();
  const source = new CameraPoseSource(video, model);
  const smoother = new AngleSmoother(0.5);
  /** Définition avec l'amplitude cible du kiné : c'est elle qui pilote le scoring. */
  const def = effectiveDef(item);
  const goalReps = item.dose.reps;

  let setIndex = 0; // 0-based, série en cours
  let counter = new RepCounter(def);
  let frames: Frame[] = [];
  let tRecStart = Number.NaN;
  let state: "loading" | "countdown" | "running" | "paused" | "saving" = "loading";
  let countdown = COUNTDOWN;
  let countdownTimer = 0;
  let ready = false;
  let disposed = false;

  const seriesLabel = () => `${item.def.name} · série ${setIndex + 1}/${item.dose.sets}`;

  function paintChrome() {
    m("set").textContent = seriesLabel();
    m("goal").textContent = state === "countdown" ? "préparez-vous" : `/ ${goalReps} reps`;
    pill.classList.toggle("paused", state !== "running");
    btnPause.textContent = state === "paused" ? "Reprendre" : "Pause";
    btnPause.disabled = !ready || state === "countdown" || state === "saving";
    btnDone.disabled = !ready || state === "countdown" || state === "saving";
  }

  function banner(html: string) {
    m("banner").innerHTML = html;
  }

  function instructionsBanner() {
    banner(`<div class="live-banner neutral"><i></i><ul>${item.def.instructions
      .map((x) => `<li>${escapeHtml(x)}</li>`)
      .join("")}</ul></div>`);
  }

  /** Une seule mesure signalée à la fois, comme dans la maquette. */
  function warnBanner(metrics: LiveMetrics) {
    if (metrics.warnings.trunkLean) {
      banner(`<div class="live-banner"><i></i><span>Tronc penché à ${deg(metrics.trunkLean)} — mesure, pas une consigne</span></div>`);
    } else if (metrics.warnings.asymmetry) {
      banner(`<div class="live-banner"><i></i><span>Écart gauche/droite de ${deg(metrics.asymmetry)} — mesure, pas une consigne</span></div>`);
    } else {
      banner("");
    }
  }

  function startCountdown() {
    state = "countdown";
    countdown = COUNTDOWN;
    counter = new RepCounter(def);
    smoother.reset();
    frames = [];
    tRecStart = Number.NaN;
    progress.style.width = "0%";
    m("count").textContent = String(countdown);
    instructionsBanner();
    paintChrome();
    countdownTimer = window.setInterval(() => {
      countdown -= 1;
      if (countdown > 0) {
        m("count").textContent = String(countdown);
        return;
      }
      clearInterval(countdownTimer);
      countdownTimer = 0;
      state = "running";
      m("count").textContent = "0";
      banner("");
      paintChrome();
    }, 1000);
  }

  function updateMetrics(metrics: LiveMetrics) {
    const s = summarize(metrics.reps, def);
    m("count").textContent = String(s.repsTotal);
    m("angle").textContent = deg(metrics.primaryAngle);
    m("depth").textContent = deg(metrics.currentMinAngle ?? s.bestMinAngle);
    if (asymEl) {
      asymEl.textContent = deg(metrics.asymmetry);
      asymEl.classList.toggle("warn", metrics.warnings.asymmetry);
    }
    if (leanEl) {
      leanEl.textContent = deg(metrics.trunkLean);
      leanEl.classList.toggle("warn", metrics.warnings.trunkLean);
    }
    progress.style.width = `${Math.min(100, (s.repsTotal / Math.max(1, goalReps)) * 100)}%`;
    warnBanner(metrics);
  }

  function onFrame(frame: Frame) {
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawSkeleton(ctx, frame, { mirror: true, highlight: KNEE_HIGHLIGHT });

    if (state !== "running") return;
    // L'origine temporelle de la série est la première frame enregistrée.
    if (Number.isNaN(tRecStart)) tRecStart = frame.t;
    const rel = { ...frame, t: frame.t - tRecStart };
    frames.push(rel);
    updateMetrics(counter.update(rel.t, smoother.next(computeAngles(rel))));
  }

  async function saveSet(): Promise<void> {
    const reps = counter.getReps();
    const record: SessionRecord = {
      id: crypto.randomUUID(),
      exerciseId: item.def.id,
      createdAt: Date.now() - (frames.length ? frames[frames.length - 1]!.t : 0),
      durationMs: frames.length ? frames[frames.length - 1]!.t : 0,
      frameCount: frames.length,
      aspectRatio: video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : undefined,
      poseModel: model,
      workoutId: workout.id,
      setIndex: setIndex + 1,
      setCount: item.dose.sets,
      targetReps: goalReps,
      reps,
      summary: summarize(reps, def),
      frames,
    };
    await saveSession(record);
    workout.saved[workout.index]?.push(record.id);
  }

  btnDone.onclick = async () => {
    if (state === "saving") return;
    state = "saving";
    paintChrome();
    await saveSet();
    if (disposed) return;
    if (setIndex + 1 < item.dose.sets) {
      setIndex += 1;
      startCountdown();
    } else {
      source.stop();
      onExerciseDone();
    }
  };

  btnPause.onclick = () => {
    state = state === "paused" ? "running" : "paused";
    paintChrome();
  };

  view.querySelector<HTMLButtonElement>(".live-close")!.onclick = () => {
    const done = counter.getReps().length;
    const msg = done
      ? `Quitter la séance ? Les ${done} répétitions de la série en cours ne seront pas enregistrées.`
      : "Quitter la séance ?";
    if (!confirm(msg)) return;
    source.stop();
    onQuit();
  };

  source
    .start(onFrame)
    .then(() => {
      if (disposed) return;
      ready = true;
      stub.remove();
      startCountdown();
    })
    .catch((err: unknown) => {
      if (disposed) return;
      stub.textContent = `Caméra indisponible.\n${err instanceof Error ? err.message : String(err)}`;
      stub.style.whiteSpace = "pre-line";
      m("count").textContent = "—";
      paintChrome();
    });

  paintChrome();

  return () => {
    disposed = true;
    if (countdownTimer) clearInterval(countdownTimer);
    source.stop();
    disposeShell();
  };
}
