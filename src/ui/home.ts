import { DEMO_PATIENT } from "../program/demo";
import { computeProgress, type ProgramProgress } from "../program/progress";
import type { Program } from "../program/types";
import { listSessions } from "../storage/db";
import { deg, el, escapeHtml, longDate, mountTabScreen, type TabName } from "./shell";

/** 01 · Accueil — séance du jour, semaine en cours, progression d'amplitude. */
export async function renderHome(
  root: HTMLElement,
  program: Program,
  onNav: (t: TabName) => void,
  onStart: (startIndex: number) => void,
): Promise<() => void> {
  const { body, dispose } = mountTabScreen(root, "home", onNav);
  const p = computeProgress(program, await listSessions());

  const remaining = p.today.filter((i) => !i.done).length;
  const started = p.today.some((i) => i.setsDone > 0);
  const cta = remaining === 0 ? "Séance du jour terminée" : started ? "Reprendre la séance" : "Commencer la séance";

  body.append(
    el(`
    <div class="home-head">
      <div class="home-date">${longDate(new Date())}</div>
      <div class="home-hello">Bonjour ${escapeHtml(DEMO_PATIENT.firstName)}</div>
    </div>`),
    el(`
    <div class="today">
      <div class="today-top">
        <div>
          <div class="today-kicker">Séance du jour</div>
          <div class="today-name">${escapeHtml(program.label)} · Semaine ${p.week}</div>
        </div>
        <div class="today-time">~${program.estimatedMinutes} min</div>
      </div>
      <div class="today-steps">
        ${p.today
          .map((i) => {
            const pct = i.dose.sets === 0 ? 0 : Math.min(1, i.setsDone / i.dose.sets);
            return `<div class="today-step">
              <div class="bar"><i style="width:${Math.round(pct * 100)}%"></i></div>
              <span class="name">${escapeHtml(i.def?.name ?? i.prescription.exerciseId)}</span>
            </div>`;
          })
          .join("")}
      </div>
      <button class="today-cta"${remaining === 0 ? " disabled" : ""}>${cta}</button>
    </div>`),
    el(`
    <div class="week-head">
      <div class="section-title">Cette semaine</div>
      <span class="week-count">${p.sessionsThisWeek} / ${p.sessionsPerWeek} séances</span>
    </div>`),
    el(`
    <div class="week">
      ${p.days
        .map(
          (d) => `<div class="week-day${d.done ? " done" : d.today ? " is-today" : ""}">
            <div class="box"><span class="mark">${d.done ? "✓" : d.today ? "•" : ""}</span></div>
            <span class="lbl">${d.label}</span>
          </div>`,
        )
        .join("")}
    </div>`),
    el(`<div class="trend-head">Progression amplitude</div>`),
    trendCard(p),
  );

  // On reprend la séance au premier exercice non terminé plutôt qu'au début.
  const firstTodo = Math.max(0, p.today.findIndex((i) => !i.done));
  const cell = body.querySelector<HTMLButtonElement>(".today-cta")!;
  cell.onclick = () => onStart(firstTodo);
  if (remaining === 0) {
    cell.disabled = true;
    cell.style.opacity = "0.55";
    cell.style.cursor = "default";
  }

  return dispose;
}

function trendCard(p: ProgramProgress): HTMLElement {
  const def = p.mainDef;
  const sub = def
    ? `Meilleure ${def.depthLabel.toLowerCase()} de ${def.zone}${p.targetDeg == null ? "" : ` · cible ${p.targetDeg}°`}`
    : "Aucun exercice au programme";

  const delta =
    p.bestDelta == null || Math.round(p.bestDelta) === 0
      ? ""
      : `<span>${p.bestDelta > 0 ? "+" : "−"}${Math.abs(Math.round(p.bestDelta))}° en ${p.week} semaine${p.week > 1 ? "s" : ""}</span>`;

  const bars =
    p.trend.length === 0
      ? `<div class="trend-empty">Les premières séances rempliront cette courbe : une barre par séance, d'autant plus haute que l'amplitude cible est approchée.</div>`
      : `<div class="trend-bars">${p.trend
          .map((b) => `<i class="${b.recent ? "recent" : ""}" style="height:${Math.round(30 + b.pct * 65)}%"></i>`)
          .join("")}</div>`;

  return el(`
    <div class="card trend">
      <div class="trend-value"><b>${deg(p.best)}</b>${delta}</div>
      <div class="trend-sub">${escapeHtml(sub)}</div>
      ${bars}
    </div>`);
}
