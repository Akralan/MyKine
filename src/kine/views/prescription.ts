import type { Prescription } from "../../program/types";
import { EXERCISE_LIST } from "../../scoring/exercise";
import { el, escapeHtml } from "../ui";

/**
 * Éditeur de prescription : une ligne par exercice de la bibliothèque, cochée si
 * prescrite, avec séries, répétitions, tenue et cible. La cible vide reprend celle
 * de l'exercice ; la remplir individualise le seuil sans toucher à la fiche.
 */
export function prescriptionEditor(initial: Prescription[]): { node: HTMLElement; read: () => Prescription[] } {
  const byId = new Map(initial.map((p) => [p.exerciseId, p]));
  const node = el(`
    <div class="rx">
      <div class="rx-head"><span>Exercice</span><span>Séries</span><span>Reps</span><span>Tenue (s)</span><span>Cible</span></div>
      ${EXERCISE_LIST.map((def) => {
        const p = byId.get(def.id);
        const dose = p ?? def.defaultDose;
        return `<div class="rx-row${p ? " on" : ""}" data-id="${def.id}">
          <label class="rx-name">
            <input type="checkbox" ${p ? "checked" : ""} />
            <span><b>${escapeHtml(def.name)}</b><small>${escapeHtml(def.zone)} · cible par défaut ${def.thresholds.target}°${def.status === "draft" ? " · à valider" : ""}</small></span>
          </label>
          <label class="rx-cell"><span>Séries</span><input class="num" type="number" min="1" max="10" value="${dose.sets}" aria-label="Séries de ${escapeHtml(def.name)}" /></label>
          <label class="rx-cell"><span>Reps</span><input class="num" type="number" min="1" max="50" value="${dose.reps}" aria-label="Répétitions de ${escapeHtml(def.name)}" /></label>
          <label class="rx-cell"><span>Tenue (s)</span><input class="num" type="number" min="0" max="30" value="${dose.holdMs ? dose.holdMs / 1000 : ""}" placeholder="—" aria-label="Tenue de ${escapeHtml(def.name)}, en secondes" /></label>
          <label class="rx-cell"><span>Cible (°)</span><input class="num" type="number" min="0" max="180" value="${p?.targetDeg ?? ""}" placeholder="${def.thresholds.target}" aria-label="Cible de ${escapeHtml(def.name)}, en degrés" /></label>
        </div>`;
      }).join("")}
    </div>`);

  node.querySelectorAll<HTMLElement>(".rx-row").forEach((row) => {
    const box = row.querySelector<HTMLInputElement>("input[type=checkbox]")!;
    box.onchange = () => row.classList.toggle("on", box.checked);
  });

  const read = (): Prescription[] => {
    const out: Prescription[] = [];
    node.querySelectorAll<HTMLElement>(".rx-row").forEach((row) => {
      if (!row.querySelector<HTMLInputElement>("input[type=checkbox]")!.checked) return;
      const [sets, reps, hold, target] = [...row.querySelectorAll<HTMLInputElement>("input.num")].map((i) => i.value.trim());
      const n = (v: string | undefined, min: number, fallback: number) => {
        const x = Number(v);
        return v && Number.isFinite(x) && x >= min ? Math.round(x) : fallback;
      };
      const p: Prescription = { exerciseId: row.dataset.id!, sets: n(sets, 1, 3), reps: n(reps, 1, 10) };
      const h = n(hold, 1, 0);
      if (h > 0) p.holdMs = h * 1000;
      const t = n(target, 1, 0);
      if (t > 0) p.targetDeg = t;
      out.push(p);
    });
    return out;
  };

  return { node, read };
}
