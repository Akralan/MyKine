import { amplitudePct, groupBlocks, type ExerciseBlock } from "../program/progress";
import { currentItem, effectiveDef, hasNext, remainingNames, targetOf, type Workout } from "../program/runner";
import { listSessions } from "../storage/db";
import { deg, duration, el, escapeHtml, mountFullScreen, timeOf } from "./shell";

/**
 * 04 · Fin de séance — bilan de l'exercice qui vient d'être fait, toutes séries agrégées.
 * Tout est relu depuis la base : l'écran ne dépend d'aucun état gardé en mémoire.
 */
export async function renderSummary(
  root: HTMLElement,
  workout: Workout,
  actions: { onNext: () => void; onReplay: (sessionId: string) => void; onFinish: () => void },
): Promise<() => void> {
  const { phone, dispose } = mountFullScreen(root, { status: false });
  const item = currentItem(workout);
  if (!item) {
    actions.onFinish();
    return dispose;
  }

  const def = effectiveDef(item);
  const target = targetOf(item);
  const blocks = groupBlocks(await listSessions());
  const block = blocks.find((b) => b.workoutId === workout.id && b.exerciseId === item.def.id);

  if (!block) {
    phone.append(el(`<div class="notice">Aucune série n'a été enregistrée pour cet exercice.</div>`));
    phone.append(footer(hasNext(workout), actions, null));
    return dispose;
  }

  const s = block.summary;
  const date = new Date(block.createdAt);
  const dateLabel = date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

  const screen = el(`<div class="screen"></div>`);
  screen.append(
    el(`
    <div class="sum-head">
      <div class="sum-kicker">${block.sets.length > 1 ? "Exercice terminé" : "Séance terminée"}</div>
      <div class="sum-title">${escapeHtml(item.def.name)} · ${s.repsTotal} répétition${s.repsTotal > 1 ? "s" : ""}</div>
      <div class="sum-sub">${s.repsComplete} complète${s.repsComplete > 1 ? "s" : ""} · ${duration(block.durationMs)} · ${dateLabel} ${timeOf(block.createdAt)}</div>
    </div>`),
  );

  const body = el(`<div class="scroll"><div class="sum-body"></div></div>`);
  const inner = body.querySelector<HTMLElement>(".sum-body")!;

  // Mêmes règles que le live : pas de carte quand la mesure n'a pas de sens ici.
  const asymThreshold = def.asymmetryWarnDeg;
  const leanThreshold = def.trunkLeanWarnDeg;
  const asymWarn = asymThreshold != null && s.meanAsymmetry != null && s.meanAsymmetry > asymThreshold;
  const leanWarn = leanThreshold != null && s.maxTrunkLean != null && s.maxTrunkLean > leanThreshold;
  const reached = s.bestMinAngle != null && amplitudePct(def, s.bestMinAngle) >= 1;

  inner.append(
    el(`
    <div class="sum-grid">
      ${metric(`Meilleure ${def.depthLabel.toLowerCase()}`, deg(s.bestMinAngle), reached ? "cible atteinte" : `cible ${target}°`)}
      ${metric("Reps complètes", `${s.repsComplete}/${s.repsTotal}`, s.repsTotal - s.repsComplete === 0 ? "toutes dans l'amplitude" : `${s.repsTotal - s.repsComplete} sous l'amplitude`)}
      ${asymThreshold == null ? "" : metric("Asymétrie moyenne", deg(s.meanAsymmetry), `seuil d'alerte ${asymThreshold}°`, asymWarn)}
      ${leanThreshold == null ? "" : metric("Tronc max", deg(s.maxTrunkLean), leanWarn ? `au-delà du seuil ${leanThreshold}°` : `seuil ${leanThreshold}°`, leanWarn)}
    </div>`),
    repsChart(block, def, target),
    el(`
    <div class="next-card">
      <b>Prochaine étape</b>
      <p>${escapeHtml(nextText(workout))}</p>
    </div>`),
  );

  screen.append(body);
  phone.append(screen, footer(hasNext(workout), actions, block.bestSetId));
  return dispose;
}

function metric(label: string, value: string, note: string, warn = false): string {
  return `
    <div class="sum-metric${warn ? " warn" : ""}">
      <span class="lbl">${escapeHtml(label)}</span>
      <span class="val">${escapeHtml(value)}</span>
      <span class="note">${escapeHtml(note)}</span>
    </div>`;
}

function repsChart(block: ExerciseBlock, def: ReturnType<typeof effectiveDef>, target: number): HTMLElement {
  const reps = block.sets.flatMap((s) => s.reps);
  if (reps.length === 0) return el(`<div class="reps-chart card"><div class="empty-note">Aucune répétition détectée.</div></div>`);
  return el(`
    <div class="reps-chart card">
      <div class="reps-chart-head">
        <b>${escapeHtml(def.depthLabel)} par répétition</b>
        <span>cible ${target}°</span>
      </div>
      <div class="reps-bars">
        ${reps
          .map(
            (r, i) => `<div class="col${r.complete ? "" : " miss"}">
              <i style="height:${Math.round(12 + amplitudePct(def, r.minAngle) * 88)}%"></i>
              <span>${i + 1}</span>
            </div>`,
          )
          .join("")}
      </div>
    </div>`);
}

function nextText(workout: Workout): string {
  const names = remainingNames(workout);
  if (names.length === 0) {
    return workout.standalone
      ? "Exercice terminé. Retrouvez-le dans l'historique, avec son replay."
      : "Tous les exercices de la séance du jour sont faits.";
  }
  const quoted = names.map((n) => `« ${n} »`);
  const list = quoted.length === 1 ? quoted[0] : `${quoted.slice(0, -1).join(", ")} et ${quoted[quoted.length - 1]}`;
  return `Il reste ${list} dans la séance du jour.`;
}

function footer(
  next: boolean,
  actions: { onNext: () => void; onReplay: (id: string) => void; onFinish: () => void },
  replayId: string | null,
): HTMLElement {
  const node = el(`
    <div class="sum-foot">
      <button class="btn btn-primary" data-a="next">${next ? "Exercice suivant" : "Retour à l'accueil"}</button>
      <div class="row">
        <button class="btn-ghost" data-a="replay"${replayId ? "" : " disabled"}>Revoir le replay</button>
        <button class="btn-ghost dim" data-a="finish">Terminer</button>
      </div>
    </div>`);
  node.querySelector<HTMLButtonElement>('[data-a="next"]')!.onclick = next ? actions.onNext : actions.onFinish;
  node.querySelector<HTMLButtonElement>('[data-a="finish"]')!.onclick = actions.onFinish;
  const replay = node.querySelector<HTMLButtonElement>('[data-a="replay"]')!;
  if (replayId) replay.onclick = () => actions.onReplay(replayId);
  return node;
}
