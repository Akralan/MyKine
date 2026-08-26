import { AngleSmoother, computeAngles } from "../geometry/angles";
import { EXERCISES } from "../scoring/exercise";
import { loadSession, type SessionRecord } from "../storage/db";
import { KNEE_HIGHLIGHT, drawSkeleton, frameAt } from "./skeleton";

const SPEEDS = [0.25, 0.5, 1, 2];

/**
 * Replay en bâtons avec timeline « façon YouTube » : lecture/pause, scrub, vitesse,
 * marqueurs de reps cliquables, courbe d'angle genou synchronisée.
 * Ne lit que la série temporelle de points — aucune image.
 */
export async function renderReplay(root: HTMLElement, sessionId: string, onBack: () => void): Promise<() => void> {
  const session = await loadSession(sessionId);
  if (!session) {
    root.innerHTML = `<p>Séance introuvable.</p>`;
    return () => {};
  }
  const exercise = EXERCISES[session.exerciseId];
  const { frames, reps, durationMs } = session;

  root.innerHTML = `
    <section class="replay">
      <div class="replay-head">
        <button data-a="back">← Galerie</button>
        <h2>${exercise?.name ?? session.exerciseId} — ${new Date(session.createdAt).toLocaleString("fr-FR")}</h2>
      </div>
      <div class="replay-body">
        <div class="stage dark"><canvas class="skeleton"></canvas></div>
        <aside class="panel">
          ${summaryHtml(session)}
          <h3>Répétitions</h3>
          <ol class="reps">
            ${reps
              .map(
                (r) => `<li data-rep="${r.index}" class="${r.complete ? "" : "incomplete"}">
                  <b>#${r.index}</b> profondeur ${Math.round(r.minAngle)}°
                  · asym. ${Math.round(r.asymmetryAtBottom)}°
                  · tronc ${Math.round(r.maxTrunkLean)}°
                  · ${((r.tEnd - r.tStart) / 1000).toFixed(1)}s
                  ${r.complete ? "" : '<span class="badge">incomplète</span>'}
                </li>`,
              )
              .join("")}
          </ol>
        </aside>
      </div>
      <div class="timeline">
        <div class="controls">
          <button data-a="play" title="Espace">▶</button>
          <span class="time"><span data-t="cur">0.0</span> / ${(durationMs / 1000).toFixed(1)} s</span>
          <select data-a="speed">${SPEEDS.map((s) => `<option value="${s}" ${s === 1 ? "selected" : ""}>${s}×</option>`).join("")}</select>
        </div>
        <div class="track">
          <canvas class="curve"></canvas>
          <input type="range" min="0" max="${durationMs}" step="1" value="0" />
          <div class="markers">
            ${reps
              .map(
                (r) =>
                  `<span class="marker ${r.complete ? "" : "incomplete"}" data-rep="${r.index}"
                    style="left:${(r.tStart / durationMs) * 100}%;width:${((r.tEnd - r.tStart) / durationMs) * 100}%" title="Rep ${r.index}"></span>`,
              )
              .join("")}
          </div>
        </div>
      </div>
    </section>`;

  const skel = root.querySelector<HTMLCanvasElement>("canvas.skeleton")!;
  const sctx = skel.getContext("2d")!;
  const curve = root.querySelector<HTMLCanvasElement>("canvas.curve")!;
  const range = root.querySelector<HTMLInputElement>("input[type=range]")!;
  const btnPlay = root.querySelector<HTMLButtonElement>('[data-a="play"]')!;
  const speedSel = root.querySelector<HTMLSelectElement>('[data-a="speed"]')!;
  const curLabel = root.querySelector<HTMLElement>('[data-t="cur"]')!;

  // Courbe d'angle genou précalculée avec le même lissage que le live.
  const smoother = new AngleSmoother(0.5);
  const angleSeries = frames.map((f) => {
    const a = smoother.next(computeAngles(f));
    return (a.kneeL + a.kneeR) / 2;
  });

  let t = 0;
  let playing = false;
  let speed = 1;
  let rafId = 0;
  let lastTick = 0;

  function resize() {
    const stage = skel.parentElement!;
    const w = stage.clientWidth, h = stage.clientHeight;
    if (skel.width !== w || skel.height !== h) {
      skel.width = w;
      skel.height = h;
    }
    const cw = curve.clientWidth, ch = curve.clientHeight;
    if (curve.width !== cw || curve.height !== ch) {
      curve.width = cw;
      curve.height = ch;
      drawCurve();
    }
  }

  function drawCurve() {
    const c = curve.getContext("2d")!;
    const { width: w, height: h } = curve;
    c.clearRect(0, 0, w, h);
    if (!exercise || frames.length < 2) return;
    const yOf = (deg: number) => h - ((deg - 40) / (180 - 40)) * h;
    // Repères : seuil de repos et cible
    c.strokeStyle = "rgba(255,255,255,0.15)";
    c.setLineDash([4, 4]);
    for (const th of [exercise.thresholds.rest, exercise.thresholds.target]) {
      c.beginPath();
      c.moveTo(0, yOf(th));
      c.lineTo(w, yOf(th));
      c.stroke();
    }
    c.setLineDash([]);
    c.strokeStyle = "#f97316";
    c.lineWidth = 1.5;
    c.beginPath();
    frames.forEach((f, i) => {
      const x = (f.t / durationMs) * w;
      const y = yOf(angleSeries[i]!);
      i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    });
    c.stroke();
  }

  function draw() {
    resize();
    sctx.clearRect(0, 0, skel.width, skel.height);
    const f = frameAt(frames, t);
    if (f) drawSkeleton(sctx, f, { mirror: true, highlight: KNEE_HIGHLIGHT });
    range.value = String(t);
    curLabel.textContent = (t / 1000).toFixed(1);
    const active = reps.find((r) => t >= r.tStart && t <= r.tEnd);
    root.querySelectorAll<HTMLElement>("li[data-rep]").forEach((li) => {
      li.classList.toggle("active", active?.index === Number(li.dataset.rep));
    });
  }

  function seek(ms: number) {
    t = Math.max(0, Math.min(durationMs, ms));
    draw();
  }

  function tick(now: number) {
    if (!playing) return;
    const dt = lastTick ? now - lastTick : 0;
    lastTick = now;
    t += dt * speed;
    if (t >= durationMs) {
      t = durationMs;
      setPlaying(false);
    }
    draw();
    if (playing) rafId = requestAnimationFrame(tick);
  }

  function setPlaying(p: boolean) {
    playing = p;
    btnPlay.textContent = p ? "⏸" : "▶";
    if (p) {
      if (t >= durationMs) t = 0;
      lastTick = 0;
      rafId = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafId);
    }
  }

  btnPlay.onclick = () => setPlaying(!playing);
  speedSel.onchange = () => (speed = Number(speedSel.value));
  range.oninput = () => seek(Number(range.value));
  root.querySelectorAll<HTMLElement>("[data-rep]").forEach((el) => {
    el.addEventListener("click", () => {
      const r = reps.find((x) => x.index === Number(el.dataset.rep));
      if (r) seek(r.tStart);
    });
  });
  root.querySelector<HTMLButtonElement>('[data-a="back"]')!.onclick = onBack;

  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if (e.code === "Space") {
      e.preventDefault();
      setPlaying(!playing);
    } else if (e.code === "ArrowRight") seek(t + (e.shiftKey ? 1000 : 100));
    else if (e.code === "ArrowLeft") seek(t - (e.shiftKey ? 1000 : 100));
  };
  window.addEventListener("keydown", onKey);
  window.addEventListener("resize", draw);

  draw();

  return () => {
    setPlaying(false);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", draw);
  };
}

export function summaryHtml(s: SessionRecord | { summary: SessionRecord["summary"]; durationMs: number }): string {
  const { summary } = s;
  const deg = (v: number | null) => (v == null ? "–" : `${Math.round(v)}°`);
  return `
    <div class="metrics">
      <div class="metric big"><span class="label">Répétitions</span><span class="value">${summary.repsTotal}${
        summary.repsTotal !== summary.repsComplete ? ` <small>(${summary.repsComplete} complètes)</small>` : ""
      }</span></div>
      <div class="metric"><span class="label">Meilleure profondeur</span><span class="value">${deg(summary.bestMinAngle)}</span></div>
      <div class="metric"><span class="label">Asymétrie moyenne</span><span class="value">${deg(summary.meanAsymmetry)}</span></div>
      <div class="metric"><span class="label">Tronc max</span><span class="value">${deg(summary.maxTrunkLean)}</span></div>
      <div class="metric"><span class="label">Durée</span><span class="value">${(s.durationMs / 1000).toFixed(0)} s</span></div>
    </div>`;
}
