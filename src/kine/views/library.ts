import { EXERCISE_LIST } from "../../scoring/exercise";
import { picto } from "../../ui/pictos";
import { el, escapeHtml } from "../ui";

/** Bibliothèque : les fiches telles que le code les applique, avec leur statut de validation. */
export function renderLibrary(content: HTMLElement): void {
  content.append(
    el(`
    <div class="page-head">
      <div>
        <h1>Bibliothèque</h1>
        <p class="muted">${EXERCISE_LIST.length} exercices. Chaque fiche est un angle pilote, deux seuils et leurs sources.</p>
      </div>
    </div>`),
    el(`<div class="lib">
      ${EXERCISE_LIST.map((d) => {
        const measure = (v: number | undefined, label: string) =>
          `<li><span>${label}</span><b>${v == null ? `<em class="muted">non mesurée</em>` : `alerte au-delà de ${v}°`}</b></li>`;
        return `<article class="card lib-card">
          <div class="lib-picto">${picto(d.id)}</div>
          <div class="lib-top">
            <span class="zone">${escapeHtml(d.zone)}</span>
            <span class="badge ${d.status === "validated" ? "badge-ok" : "badge-soft"}">${d.status === "validated" ? "Validé" : "À valider"}</span>
          </div>
          <h2>${escapeHtml(d.name)}</h2>
          <p class="muted">${d.direction === "flexion" ? "Flexion" : "Extension"}${d.unilateral ? ", unilatéral" : ""} · dose par défaut ${d.defaultDose.sets} × ${d.defaultDose.reps}${d.defaultDose.holdMs ? `, tenue ${d.defaultDose.holdMs / 1000} s` : ""}</p>
          <div class="thresholds">
            <div><span>Repos</span><b>${d.thresholds.rest}°</b></div>
            <div><span>Cible</span><b>${d.thresholds.target}°</b></div>
          </div>
          <ul class="measures">
            ${measure(d.asymmetryWarnDeg, "Asymétrie")}
            ${measure(d.trunkLeanWarnDeg, "Tronc")}
          </ul>
          <p class="sources">${d.sources.length} source${d.sources.length > 1 ? "s" : ""} · seuils en angle intérieur</p>
        </article>`;
      }).join("")}
    </div>`),
    el(`<p class="note">Les fiches « à valider » ont des seuils issus de la littérature, jamais relus par un kiné ni confrontés
    à de vraies séances. C'est le travail que nous menons avec nos kinés partenaires.</p>`),
  );
}
