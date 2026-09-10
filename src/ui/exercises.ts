import { computeProgress, doseOf, type TodayItem } from "../program/progress";
import type { Dose, Program } from "../program/types";
import { EXERCISE_LIST, type BodyZone, type ExerciseDefinition } from "../scoring/exercise";
import { listSessions } from "../storage/db";
import { el, escapeHtml, mountTabScreen, type TabName } from "./shell";

const THUMB = `<span>photo<br>exercice</span>`;
const THUMB_WIDE = `<span>photo exercice</span>`;

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** « 3 × 12 · amplitude cible 100° », « 3 × 10 par jambe », « 2 × 15 · tenue 3 s ». */
export function doseText(def: ExerciseDefinition, dose: Dose): string {
  let head = `${dose.sets} × ${dose.reps}`;
  if (def.unilateral) head += " par jambe";
  const extras: string[] = [];
  if (dose.holdMs) extras.push(`tenue ${Math.round(dose.holdMs / 1000)} s`);
  const target = dose.targetDeg ?? def.thresholds.target;
  if (!def.unilateral && extras.length === 0) extras.push(`amplitude cible ${target}°`);
  return [head, ...extras].join(" · ");
}

/** 02 · Sélection d'exercice — chaque ligne lance directement l'exercice. */
export async function renderExercises(
  root: HTMLElement,
  program: Program,
  onNav: (t: TabName) => void,
  onLaunch: (def: ExerciseDefinition) => void,
): Promise<() => void> {
  const { body, dispose } = mountTabScreen(root, "exercises", onNav);
  const progress = computeProgress(program, await listSessions());
  const byId = new Map(progress.today.map((t) => [t.prescription.exerciseId, t]));

  const prescribedIds = new Set(program.plan.map((p) => p.exerciseId));
  const zones = [...new Set(EXERCISE_LIST.map((e) => e.zone))];

  let zone: BodyZone | "all" = "all";
  let query = "";

  const head = el(`
    <div class="page-head">
      <div class="page-title">Exercices</div>
      <div class="search">
        <span class="glass"></span>
        <input type="search" placeholder="Rechercher un exercice" aria-label="Rechercher un exercice" />
      </div>
    </div>`);

  const filters = el(`
    <div class="filters">
      <button data-zone="all" class="on">Tous</button>
      ${zones.map((z) => `<button data-zone="${z}">${cap(z)}</button>`).join("")}
    </div>`);

  const list = el(`<div style="padding:0 24px 24px"></div>`);
  body.append(head, filters, list);

  const matches = (e: ExerciseDefinition) =>
    (zone === "all" || e.zone === zone) &&
    (query === "" || e.name.toLowerCase().includes(query));

  function paint() {
    const prescribed = program.plan
      .map((p) => ({ def: EXERCISE_LIST.find((e) => e.id === p.exerciseId), dose: doseOf(p) }))
      .filter((x): x is { def: ExerciseDefinition; dose: Dose } => x.def !== undefined)
      .filter((x) => matches(x.def));

    const library = EXERCISE_LIST.filter((e) => !prescribedIds.has(e.id)).filter(matches);

    list.innerHTML = `
      ${
        prescribed.length === 0
          ? ""
          : `<div class="list-head">
              <span class="t">Prescrit par votre kiné</span>
              <span class="badge-count">${prescribed.length}</span>
            </div>
            <div class="ex-rows">${prescribed.map((x) => rowHtml(x.def, x.dose, byId.get(x.def.id))).join("")}</div>`
      }
      ${
        library.length === 0
          ? ""
          : `<div class="lib-title">Bibliothèque</div>
             <div class="lib-grid">${library.map(cardHtml).join("")}</div>`
      }
      ${
        prescribed.length === 0 && library.length === 0
          ? `<div class="empty-note">Aucun exercice ne correspond à cette recherche.</div>`
          : ""
      }`;

    list.querySelectorAll<HTMLElement>("[data-ex]").forEach((node) => {
      node.onclick = () => {
        const def = EXERCISE_LIST.find((e) => e.id === node.dataset.ex);
        if (def) onLaunch(def);
      };
    });
  }

  filters.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
    b.onclick = () => {
      zone = (b.dataset.zone === "all" ? "all" : b.dataset.zone) as BodyZone | "all";
      filters.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      paint();
    };
  });

  const input = head.querySelector<HTMLInputElement>("input")!;
  input.oninput = () => {
    query = input.value.trim().toLowerCase();
    paint();
  };

  paint();
  return dispose;
}

function statusTag(def: ExerciseDefinition, item?: TodayItem): string {
  if (item?.done) return "fait";
  if (def.status === "draft") return "à valider";
  return item && item.setsDone > 0 ? `${item.setsDone}/${item.dose.sets} séries` : "à faire";
}

function rowHtml(def: ExerciseDefinition, dose: Dose, item?: TodayItem): string {
  const done = item?.done ?? false;
  return `
    <button class="ex-row${done ? " done" : ""}" data-ex="${def.id}">
      <span class="thumb">${THUMB}</span>
      <span class="body">
        <span class="name">${escapeHtml(def.name)}</span>
        <span class="dose">${escapeHtml(doseText(def, dose))}</span>
        <span class="tags">
          <span class="tag-mono zone">${escapeHtml(def.zone)}</span>
          <span class="tag-mono">${escapeHtml(statusTag(def, item))}</span>
        </span>
      </span>
      <span class="dot">${done ? "✓" : "›"}</span>
    </button>`;
}

function cardHtml(def: ExerciseDefinition): string {
  const note = def.status === "draft" ? " · à valider" : "";
  return `
    <button class="lib-card" data-ex="${def.id}">
      <span class="thumb">${THUMB_WIDE}</span>
      <span>
        <span class="name">${escapeHtml(def.name)}</span>
        <span class="zone">${escapeHtml(cap(def.zone) + note)}</span>
      </span>
    </button>`;
}
