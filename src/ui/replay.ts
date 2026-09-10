import { AngleSmoother, computeAngles } from "../geometry/angles";
import { EXERCISES } from "../scoring/exercise";
import { loadSession } from "../storage/db";
import { clock, deg, el, escapeHtml, mountFullScreen, timeOf } from "./shell";
import { KNEE_HIGHLIGHT, drawSkeleton, drawSkeleton3D, frameAt, type Orbit } from "./skeleton";

const SPEEDS = [0.25, 0.5, 1, 2];

/**
 * 05 · Replay — squelette en bâtons (2D ou 3D orbitable), timeline scrubbable,
 * marqueurs de reps et courbe d'angle. Ne lit que la série temporelle de points.
 */
export async function renderReplay(root: HTMLElement, sessionId: string, onBack: () => void): Promise<() => void> {
  const session = await loadSession(sessionId);
  const { phone, dispose: disposeShell } = mountFullScreen(root);
  if (!session) {
    phone.append(el(`<div class="notice">Séance introuvable.</div>`));
    return disposeShell;
  }

  const def = EXERCISES[session.exerciseId];
  const { frames, reps, durationMs } = session;
  const total = Math.max(1, durationMs);
  const setLabel = session.setCount && session.setCount > 1 ? ` · série ${session.setIndex}/${session.setCount}` : "";

  const screen = el(`
    <div class="screen">
      <div class="scroll">
        <div class="replay-head">
          <button class="replay-back" aria-label="Retour">←</button>
          <div>
            <div class="t">Replay · ${escapeHtml(def?.name ?? session.exerciseId)}</div>
            <div class="s">${new Date(session.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} ${timeOf(session.createdAt)} · ${clock(durationMs)}${setLabel}</div>
          </div>
        </div>

        <div class="stage">
          <canvas class="skeleton"></canvas>
          <div class="stage-tag" data-m="tag">—</div>
          <div class="stage-views">
            <button data-view="2d" class="on">2D</button>
            <button data-view="3d">3D</button>
          </div>
        </div>

        <div class="transport">
          <div class="transport-row">
            <button class="play">▶</button>
            <span class="time"><span data-m="cur">0:00</span> / ${clock(durationMs)}</span>
            <div class="speeds">
              ${SPEEDS.map((s) => `<button data-speed="${s}" class="${s === 1 ? "on" : ""}">${s}×</button>`).join("")}
            </div>
          </div>
          <div class="track">
            <canvas class="curve"></canvas>
            ${frames.length < 2 ? `<div class="hint">courbe d'angle indisponible</div>` : ""}
            <div class="markers">
              ${reps
                .map(
                  (r) =>
                    `<i data-rep="${r.index}" class="${r.complete ? "" : "miss"}" style="left:${(r.tStart / total) * 100}%;width:${Math.max(1.5, ((r.tEnd - r.tStart) / total) * 100)}%"></i>`,
                )
                .join("")}
            </div>
            <div class="playhead" style="left:0%"></div>
          </div>
        </div>

        <div class="reps-list">
          <div class="t">Répétitions</div>
          ${reps.length === 0 ? `<div class="empty-note">Aucune répétition détectée sur cette série.</div>` : ""}
          <ol>
            ${
              reps.length === 0
                ? ""
                : reps
                    .map(
                      (r) => `<li data-rep="${r.index}">
                        <span class="n">#${r.index}</span>
                        <span class="d">${deg(r.minAngle)}</span>
                        <span class="m">${[
                          def?.asymmetryWarnDeg == null ? "" : `asym. ${deg(r.asymmetryAtBottom)}`,
                          def?.trunkLeanWarnDeg == null ? "" : `tronc ${deg(r.maxTrunkLean)}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}</span>
                        <span class="tag${r.complete ? "" : " miss"}">${r.complete ? "complète" : "incomplète"}</span>
                      </li>`,
                    )
                    .join("")
            }
          </ol>
        </div>
      </div>
    </div>`);
  phone.append(screen);

  const skel = screen.querySelector<HTMLCanvasElement>("canvas.skeleton")!;
  const sctx = skel.getContext("2d")!;
  const curve = screen.querySelector<HTMLCanvasElement>("canvas.curve")!;
  const track = screen.querySelector<HTMLElement>(".track")!;
  const playhead = screen.querySelector<HTMLElement>(".playhead")!;
  const btnPlay = screen.querySelector<HTMLButtonElement>(".play")!;
  const tag = screen.querySelector<HTMLElement>('[data-m="tag"]')!;
  const cur = screen.querySelector<HTMLElement>('[data-m="cur"]')!;

  // Courbe d'angle pilote précalculée avec le même lissage que le live.
  const smoother = new AngleSmoother(0.5);
  const angleSeries = frames.map((f) => {
    const a = smoother.next(computeAngles(f));
    if (!def) return NaN;
    const l = a[def.primaryAngle.left], r = a[def.primaryAngle.right];
    return Number.isNaN(l) ? r : Number.isNaN(r) ? l : (l + r) / 2;
  });

  let t = 0;
  let view3d = false;
  const orbit: Orbit = { yaw: Math.PI, pitch: 0 }; // vue initiale : face au patient
  let playing = false;
  let speed = 1;
  let rafId = 0;
  let lastTick = 0;
  const aspect = session.aspectRatio ?? 16 / 9;

  function resize() {
    const stage = skel.parentElement!;
    const sw = stage.clientWidth, sh = stage.clientHeight;
    const w = Math.round(Math.min(sw, sh * aspect));
    const h = Math.round(w / aspect);
    if (skel.width !== w || skel.height !== h) {
      skel.width = w;
      skel.height = h;
      skel.style.width = `${w}px`;
      skel.style.height = `${h}px`;
    }
    const cw = track.clientWidth, ch = track.clientHeight;
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
    if (!def || frames.length < 2) return;
    const pad = 10;
    const yOf = (v: number) => h - pad - ((v - 40) / (180 - 40)) * (h - pad * 2);
    c.strokeStyle = "rgba(11,31,29,0.12)";
    c.lineWidth = 1;
    c.setLineDash([4, 4]);
    for (const th of [def.thresholds.rest, def.thresholds.target]) {
      c.beginPath();
      c.moveTo(0, yOf(th));
      c.lineTo(w, yOf(th));
      c.stroke();
    }
    c.setLineDash([]);
    c.strokeStyle = "#0d9488";
    c.lineWidth = 1.5;
    c.lineJoin = "round";
    c.beginPath();
    let started = false;
    frames.forEach((f, i) => {
      const v = angleSeries[i]!;
      if (Number.isNaN(v)) return;
      const x = (f.t / total) * w;
      const y = yOf(v);
      if (started) c.lineTo(x, y);
      else {
        c.moveTo(x, y);
        started = true;
      }
    });
    c.stroke();
  }

  function draw() {
    resize();
    sctx.clearRect(0, 0, skel.width, skel.height);
    const f = frameAt(frames, t);
    if (f) {
      if (view3d) drawSkeleton3D(sctx, f, orbit, { highlight: KNEE_HIGHLIGHT });
      else drawSkeleton(sctx, f, { mirror: true, highlight: KNEE_HIGHLIGHT });
    }
    cur.textContent = clock(t);
    playhead.style.left = `${(t / total) * 100}%`;

    const active = reps.find((r) => t >= r.tStart && t <= r.tEnd);
    tag.textContent = active ? `Rep ${active.index} · ${deg(active.minAngle)}` : deg(angleAt(t));
    screen.querySelectorAll<HTMLElement>("li[data-rep]").forEach((li) => {
      li.classList.toggle("active", active?.index === Number(li.dataset.rep));
    });
    screen.querySelectorAll<HTMLElement>(".markers i").forEach((i) => {
      i.classList.toggle("on", active?.index === Number(i.dataset.rep));
    });
  }

  function angleAt(ms: number): number {
    if (frames.length === 0) return NaN;
    let lo = 0;
    for (let i = 0; i < frames.length; i++) if (frames[i]!.t <= ms) lo = i;
    return angleSeries[lo] ?? NaN;
  }

  function seek(ms: number) {
    t = Math.max(0, Math.min(total, ms));
    draw();
  }

  function tick(now: number) {
    if (!playing) return;
    const dt = lastTick ? now - lastTick : 0;
    lastTick = now;
    t += dt * speed;
    if (t >= total) {
      t = total;
      setPlaying(false);
    }
    draw();
    if (playing) rafId = requestAnimationFrame(tick);
  }

  function setPlaying(p: boolean) {
    playing = p;
    btnPlay.textContent = p ? "⏸" : "▶";
    if (p) {
      if (t >= total) t = 0;
      lastTick = 0;
      rafId = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafId);
    }
  }

  // Scrub : la piste elle-même est la barre de lecture (pas d'input range dans la maquette).
  let scrubbing = false;
  const scrubTo = (clientX: number) => {
    const rect = track.getBoundingClientRect();
    seek(((clientX - rect.left) / rect.width) * total);
  };
  track.addEventListener("pointerdown", (e) => {
    scrubbing = true;
    track.setPointerCapture(e.pointerId);
    scrubTo(e.clientX);
  });
  track.addEventListener("pointermove", (e) => scrubbing && scrubTo(e.clientX));
  const endScrub = () => (scrubbing = false);
  track.addEventListener("pointerup", endScrub);
  track.addEventListener("pointercancel", endScrub);

  screen.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((b) => {
    b.onclick = () => {
      view3d = b.dataset.view === "3d";
      screen.querySelectorAll("[data-view]").forEach((x) => x.classList.toggle("on", x === b));
      skel.classList.toggle("orbit", view3d);
      draw();
    };
  });

  // Orbite au glisser en vue 3D
  let drag: { x: number; y: number } | null = null;
  skel.addEventListener("pointerdown", (e) => {
    if (!view3d) return;
    drag = { x: e.clientX, y: e.clientY };
    skel.setPointerCapture(e.pointerId);
  });
  skel.addEventListener("pointermove", (e) => {
    if (!drag) return;
    orbit.yaw += (e.clientX - drag.x) * 0.01;
    orbit.pitch = Math.max(-1.2, Math.min(1.2, orbit.pitch + (e.clientY - drag.y) * 0.01));
    drag = { x: e.clientX, y: e.clientY };
    if (!playing) draw();
  });
  const endDrag = () => (drag = null);
  skel.addEventListener("pointerup", endDrag);
  skel.addEventListener("pointercancel", endDrag);

  btnPlay.onclick = () => setPlaying(!playing);
  screen.querySelectorAll<HTMLButtonElement>("[data-speed]").forEach((b) => {
    b.onclick = () => {
      speed = Number(b.dataset.speed);
      screen.querySelectorAll("[data-speed]").forEach((x) => x.classList.toggle("on", x === b));
    };
  });
  screen.querySelectorAll<HTMLElement>("li[data-rep], .markers i").forEach((node) => {
    node.addEventListener("click", () => {
      const r = reps.find((x) => x.index === Number(node.dataset.rep));
      if (r) seek(r.tStart);
    });
  });
  screen.querySelector<HTMLButtonElement>(".replay-back")!.onclick = onBack;

  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.code === "Space") {
      e.preventDefault();
      setPlaying(!playing);
    } else if (e.code === "ArrowRight") seek(t + (e.shiftKey ? 1000 : 100));
    else if (e.code === "ArrowLeft") seek(t - (e.shiftKey ? 1000 : 100));
  };
  window.addEventListener("keydown", onKey);
  window.addEventListener("resize", draw);
  requestAnimationFrame(draw); // après la première mise en page, pour connaître la taille de la scène

  return () => {
    setPlaying(false);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", draw);
    disposeShell();
  };
}
