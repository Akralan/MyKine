import { resetProgramStart } from "../program/demo";
import { computeProgress, computeTotals, doseOf } from "../program/progress";
import type { Program } from "../program/types";
import { POSE_MODELS, type PoseModel } from "../pose/mediapipe";
import { deleteSession, listSessions } from "../storage/db";
import { preferredModel, setPreferredModel } from "./prefs";
import { doseText } from "./exercises";
import { EXERCISES } from "../scoring/exercise";
import { el, escapeHtml, mountTabScreen, type TabName } from "./shell";

/**
 * 07 · Profil — quatrième onglet de la maquette, qui n'y est pas dessiné.
 * Construit avec ses composants : c'est ici qu'atterrissent le choix du modèle de
 * pose et la gestion des données locales (ADR 0005).
 */
export async function renderProfile(
  root: HTMLElement,
  program: Program,
  onNav: (t: TabName) => void,
  onChanged: () => void,
): Promise<() => void> {
  const { body, dispose } = mountTabScreen(root, "profile", onNav);
  const metas = await listSessions();
  const p = computeProgress(program, metas);
  const totals = computeTotals(program, metas);
  const model = preferredModel();

  body.append(
    el(`
    <div class="page-head">
      <div class="page-title">Profil</div>
      <div class="page-sub">Réglages de la démo et données enregistrées sur cet appareil.</div>
    </div>`),
  );

  const list = el(`<div class="profile"></div>`);

  list.append(
    el(`
    <div class="card">
      <b>Programme</b>
      <div class="kv"><span>Zone</span><b>${escapeHtml(program.label)}</b></div>
      <div class="kv"><span>Avancement</span><b>Semaine ${p.week} / ${p.weeks}</b></div>
      <div class="kv"><span>Rythme</span><b>${p.sessionsPerWeek} séances / semaine</b></div>
      ${program.plan
        .map((pr) => {
          const def = EXERCISES[pr.exerciseId];
          return `<div class="kv"><span>${escapeHtml(def?.name ?? pr.exerciseId)}</span><b>${escapeHtml(def ? doseText(def, doseOf(pr)) : "—")}</b></div>`;
        })
        .join("")}
      <p>Programme codé en dur pour la démo : c'est l'interface kiné, encore à faire, qui le remplacera.</p>
      <button class="btn-ghost" data-a="reset-program">Redémarrer le programme</button>
    </div>`),
    el(`
    <div class="card">
      <b>Modèle de pose</b>
      <div class="field">
        <label for="pose-model">Variante BlazePose utilisée pendant les séances</label>
        <select id="pose-model" data-a="model">
          ${(Object.keys(POSE_MODELS) as PoseModel[])
            .map(
              (k) =>
                `<option value="${k}"${k === model ? " selected" : ""}>${POSE_MODELS[k].label} — ${POSE_MODELS[k].hint}</option>`,
            )
            .join("")}
        </select>
      </div>
      <p>Mêmes 33 points dans les trois cas, précision et coût croissants. Le choix s'applique à la prochaine séance et est enregistré avec elle.</p>
    </div>`),
    el(`
    <div class="card">
      <b>Données</b>
      <div class="kv"><span>Séances enregistrées</span><b>${totals.workouts}</b></div>
      <div class="kv"><span>Séries stockées</span><b>${metas.length}</b></div>
      <p>Seule la série temporelle des 33 points est enregistrée, dans le navigateur de cet appareil. Aucune image n'est stockée ni envoyée.</p>
      <button class="danger" data-a="wipe"${metas.length === 0 ? " disabled" : ""}>Effacer toutes les séances</button>
    </div>`),
    el(`
    <div class="card">
      <b>À propos</b>
      <p>Démo MyCoach. Les mesures sont affichées telles quelles, sans consigne corrective : le scoring est une machine à états sur des seuils d'angles, pas un avis médical. Les exercices marqués « à valider » attendent la relecture des kinés partenaires.</p>
    </div>`),
  );

  body.append(list);

  list.querySelector<HTMLSelectElement>('[data-a="model"]')!.onchange = (e) => {
    setPreferredModel((e.target as HTMLSelectElement).value as PoseModel);
  };

  list.querySelector<HTMLButtonElement>('[data-a="reset-program"]')!.onclick = () => {
    if (!confirm("Redémarrer le programme à sa première semaine ? Les séances enregistrées sont conservées.")) return;
    resetProgramStart();
    location.reload();
  };

  const wipe = list.querySelector<HTMLButtonElement>('[data-a="wipe"]')!;
  wipe.onclick = async () => {
    if (!confirm(`Effacer définitivement ${metas.length} série${metas.length > 1 ? "s" : ""} enregistrée${metas.length > 1 ? "s" : ""} ?`)) return;
    wipe.disabled = true;
    await Promise.all(metas.map((m) => deleteSession(m.id)));
    onChanged();
  };

  return dispose;
}
