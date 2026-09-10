import { computeTotals, groupBlocks, startOfDay, type ExerciseBlock } from "../program/progress";
import type { Program } from "../program/types";
import { listSessions } from "../storage/db";
import { clock, dayLabel, deg, el, escapeHtml, mountTabScreen, timeOf, type TabName } from "./shell";

/** 06 · Historique — séances locales, groupées par jour. */
export async function renderHistory(
  root: HTMLElement,
  program: Program,
  onNav: (t: TabName) => void,
  onReplay: (sessionId: string) => void,
): Promise<() => void> {
  const { body, dispose } = mountTabScreen(root, "history", onNav);
  const metas = await listSessions();
  const blocks = groupBlocks(metas);
  const totals = computeTotals(program, metas);

  body.append(
    el(`
    <div class="page-head">
      <div class="page-title">Historique</div>
      <div class="page-sub">Tout est stocké sur votre téléphone, aucune image enregistrée.</div>
    </div>`),
    el(`
    <div class="totals">
      <div><b>${totals.workouts}</b><span>séance${totals.workouts > 1 ? "s" : ""}</span></div>
      <div><b>${totals.reps}</b><span>répétitions</span></div>
      <div><b>${deg(totals.record)}</b><span>record</span></div>
    </div>`),
  );

  if (blocks.length === 0) {
    body.append(
      el(`<div class="history"><div class="empty-note">Aucune séance enregistrée pour l'instant. Lancez la séance du jour depuis l'accueil, ou choisissez un exercice dans la bibliothèque.</div></div>`),
    );
    return dispose;
  }

  const groups = new Map<number, ExerciseBlock[]>();
  for (const b of blocks) {
    const day = startOfDay(new Date(b.createdAt)).getTime();
    const list = groups.get(day);
    if (list) list.push(b);
    else groups.set(day, [b]);
  }

  const list = el(`<div class="history"></div>`);
  for (const [day, items] of groups) {
    list.append(
      el(`
      <div class="history-group">
        <div class="history-day">${escapeHtml(dayLabel(day))}</div>
        ${items.map(cardHtml).join("")}
      </div>`),
    );
  }
  body.append(list);

  list.querySelectorAll<HTMLButtonElement>("[data-session]").forEach((b) => {
    b.onclick = () => onReplay(b.dataset.session!);
  });

  return dispose;
}

function cardHtml(b: ExerciseBlock): string {
  const sets = b.sets.length > 1 ? ` · ${b.sets.length} séries` : "";
  return `
    <div class="history-card">
      <div class="head">
        <span class="name">${escapeHtml(b.def?.name ?? b.exerciseId)}</span>
        <span class="time">${timeOf(b.createdAt)}${sets}</span>
      </div>
      <div class="stats">
        <div class="stat"><b>${b.summary.repsTotal}</b><span>reps</span></div>
        <div class="stat"><b>${deg(b.summary.bestMinAngle)}</b><span>${escapeHtml(b.def?.depthShort ?? "ampl.")}</span></div>
        <div class="stat"><b>${clock(b.durationMs)}</b><span>durée</span></div>
        <button class="replay" data-session="${b.bestSetId}">Replay</button>
      </div>
    </div>`;
}
