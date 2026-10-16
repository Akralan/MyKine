import { EXERCISES, type ExerciseDefinition } from "../../scoring/exercise";
import { plannedDays, targetOf, type DemoPatient } from "../data";
import {
  adherence,
  alerts,
  currentWeek,
  exerciseSeries,
  expectedSessions,
  lastSession,
  planRows,
  sessionsThisWeek,
  type ExercisePoint,
} from "../stats";
import { avatar, dayTime, degS, el, escapeHtml, icon, pct, relativeDay, shortDate } from "../ui";

/** Fiche patient. */
export function renderPatient(
  content: HTMLElement,
  p: DemoPatient,
  today: Date,
  opts: { onBack: () => void; onEditPlan: () => void },
): void {
  const al = alerts(p, today);
  const adh = adherence(p, today);
  const week = currentWeek(p, today);
  const rows = planRows(p);
  const waiting = p.sessions.length === 0;

  content.append(
    el(`<button class="back" data-back>${icon("back")}Patients</button>`),
    el(`
    <section class="phead card">
      ${avatar(p.firstName, p.lastName, "lg")}
      <div class="phead-id">
        <h1>${escapeHtml(p.firstName)} ${escapeHtml(p.lastName)}</h1>
        <p><b>${escapeHtml(p.condition)}</b> · ${p.age} ans</p>
        <p class="muted">${escapeHtml(p.note)}</p>
        <p class="consent">${icon("check", "ico-sm")}Consentement au suivi recueilli le ${shortDate(p.consentOn)}</p>
      </div>
      <div class="phead-actions">
        <button class="btn btn-dark" data-edit>Modifier le programme</button>
        ${p.linkedToPatientDemo ? `<a class="btn btn-ghost" href="/" target="_blank" rel="noopener">${icon("external")}Voir son espace patient</a>` : ""}
      </div>
    </section>`),
  );

  if (al.length) {
    content.append(
      el(`<section class="alerts">
        ${al.map((a) => `<div class="alert">${icon("alert")}<div><b>${escapeHtml(a.label)}</b><span>${escapeHtml(a.detail)}</span></div></div>`).join("")}
      </section>`),
    );
  }

  content.append(
    el(`
    <div class="stats">
      <div class="stat"><span>Observance</span><b>${waiting ? "—" : pct(adh)}</b><small>${p.sessions.length} / ${expectedSessions(p, today)} séances prévues</small></div>
      <div class="stat"><span>Cette semaine</span><b>${sessionsThisWeek(p, today)} / ${p.program.sessionsPerWeek}</b><small>séances</small></div>
      <div class="stat"><span>Programme</span><b>Semaine ${week}</b><small>sur ${p.program.weeks} · depuis le ${shortDate(p.program.startedOn)}</small></div>
      <div class="stat"><span>Dernière séance</span><b class="stat-text">${relativeDay(lastSession(p)?.at, today)}</b><small>${lastSession(p) ? dayTime(lastSession(p)!.at) : "En attente"}</small></div>
    </div>`),
  );

  // Programme prescrit.
  content.append(
    el(`
    <section class="card">
      <div class="card-head"><h2>Programme · ${escapeHtml(p.program.label)}</h2><span class="muted">${p.program.sessionsPerWeek} séances / semaine · ≈ ${p.program.estimatedMinutes} min</span></div>
      <table class="rxtable">
        <thead><tr><th>Exercice</th><th>Dose</th><th>Cible</th><th>Dernière amplitude</th><th>Reps complètes</th><th>Évolution</th></tr></thead>
        <tbody>
          ${rows
            .map((r) => {
              const pr = r.prescription;
              const dose = `${pr.sets} × ${pr.reps}${r.def.unilateral ? " par jambe" : ""}${pr.holdMs ? ` · tenue ${pr.holdMs / 1000} s` : ""}`;
              const gain =
                r.gain == null
                  ? "—"
                  : `<span class="trend ${r.gain >= 0 ? "up" : "down"}">${icon(r.gain >= 0 ? "up" : "down", "ico-sm")}${degS(Math.abs(r.gain))}</span>`;
              return `<tr>
                <td data-label="Exercice"><b>${escapeHtml(r.def.name)}</b>${r.def.status === "draft" ? ` <span class="badge badge-soft" title="Seuils issus de la littérature, non relus par un kiné">à valider</span>` : ""}</td>
                <td data-label="Dose">${dose}</td>
                <td data-label="Cible">${r.target}°${pr.targetDeg != null ? ` <small class="muted">individualisée</small>` : ""}</td>
                <td data-label="Dernière amplitude">${r.last ? `${degS(r.last.best)} <small class="muted">${escapeHtml(r.def.depthLabel.toLowerCase())}</small>` : "—"}</td>
                <td data-label="Reps complètes">${r.last ? `${r.last.completeReps} / ${r.last.totalReps}` : "—"}</td>
                <td data-label="Évolution">${gain}</td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </section>`),
  );

  if (!waiting) {
    content.append(amplitudeCard(p), el(`<div class="two-col"></div>`));
    const two = content.querySelector<HTMLElement>(".two-col")!;
    two.append(calendarCard(p, today), sessionsCard(p));
  } else {
    content.append(
      el(`<section class="card empty-state">
        <h2>En attente de la première séance</h2>
        <p class="muted">Dans la version finale, ${escapeHtml(p.firstName)} reçoit un lien d'invitation et installe l'app.
        Ses séances apparaîtront ici. Pour voir le parcours côté patient, ouvrez l'espace patient de démo.</p>
        <a class="btn btn-ghost" href="/" target="_blank" rel="noopener">${icon("external")}Ouvrir l'espace patient de démo</a>
      </section>`),
    );
  }

  content.querySelector<HTMLButtonElement>("[data-back]")!.onclick = opts.onBack;
  content.querySelector<HTMLButtonElement>("[data-edit]")!.onclick = opts.onEditPlan;
}

/* --- Courbe d'amplitude --------------------------------------------------------- */

function amplitudeCard(p: DemoPatient): HTMLElement {
  const ids = p.program.plan.map((x) => x.exerciseId).filter((id) => EXERCISES[id] && exerciseSeries(p, id).length > 0);
  const card = el(`
    <section class="card">
      <div class="card-head">
        <h2>Amplitude, séance par séance</h2>
        <div class="tabs" role="tablist">${ids
          .map((id, i) => `<button role="tab" class="tab${i === 0 ? " on" : ""}" aria-selected="${i === 0}" data-id="${id}">${escapeHtml(EXERCISES[id]!.name)}</button>`)
          .join("")}</div>
      </div>
      <div class="chart"></div>
    </section>`);
  const chart = card.querySelector<HTMLElement>(".chart")!;
  let current = ids[0];
  // Le SVG est dessiné à la largeur réelle du conteneur : le texte des axes garde
  // sa taille en pixels sur téléphone comme sur grand écran.
  const show = (id: string | undefined = current) => {
    if (!id || chart.clientWidth === 0) return;
    current = id;
    const def = EXERCISES[id]!;
    const pr = p.program.plan.find((x) => x.exerciseId === id)!;
    chart.innerHTML = chartSvg(def, targetOf(pr, def), exerciseSeries(p, id), chart.clientWidth);
  };
  new ResizeObserver(() => show()).observe(chart);
  card.querySelectorAll<HTMLButtonElement>(".tab").forEach((b) => {
    b.onclick = () => {
      card.querySelectorAll(".tab").forEach((t) => {
        t.classList.toggle("on", t === b);
        t.setAttribute("aria-selected", String(t === b));
      });
      show(b.dataset.id!);
    };
  });
  return card;
}

/**
 * Courbe orientée « vers le haut = vers la cible », quel que soit le sens du mouvement :
 * en flexion, un angle plus petit est un progrès, l'axe est donc inversé. Les graduations
 * affichent les vrais angles.
 */
function chartSvg(def: ExerciseDefinition, target: number, series: ExercisePoint[], width: number): string {
  const W = Math.max(280, Math.round(width));
  const H = 240;
  const pad = { l: 44, r: 16, t: 18, b: 30 };
  const rest = def.thresholds.rest;
  const span = target - rest;
  // 0 = repos, 1 = cible ; on laisse 15 % de marge au-dessus de la cible.
  const t = (v: number) => (v - rest) / span;
  const top = 1.15;
  const bottom = Math.min(0, ...series.map((s) => t(s.best))) - 0.05;
  const y = (v: number) => pad.t + ((top - t(v)) / (top - bottom)) * (H - pad.t - pad.b);
  const n = series.length;
  const x = (i: number) => pad.l + (n <= 1 ? 0.5 : i / (n - 1)) * (W - pad.l - pad.r);

  const ticks = [rest, rest + span * 0.5, target].map((v) => Math.round(v));
  const grid = ticks
    .map(
      (v) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" class="${v === target ? "target" : "grid"}" />
      <text x="${pad.l - 8}" y="${y(v) + 4}" class="axis" text-anchor="end">${v}°</text>`,
    )
    .join("");
  const line = series.map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(s.best).toFixed(1)}`).join("");
  const area = `${line}L${x(n - 1).toFixed(1)},${H - pad.b}L${x(0).toFixed(1)},${H - pad.b}Z`;
  const dots = series
    .map(
      (s, i) =>
        `<circle cx="${x(i).toFixed(1)}" cy="${y(s.best).toFixed(1)}" r="${i === n - 1 ? 5 : 3.5}" class="${i === n - 1 ? "dot last" : "dot"}"><title>${dayTime(s.at)} : ${s.best}°, ${s.completeReps}/${s.totalReps} reps complètes</title></circle>`,
    )
    .join("");
  const last = series[n - 1];
  const first = series[0];
  const dateLabel = (s: ExercisePoint) => new Date(s.at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

  return `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(def.name)} : ${escapeHtml(def.depthLabel.toLowerCase())} de ${first?.best}° à ${last?.best}° sur ${n} séances, cible ${target}°">
      ${grid}
      <text x="${pad.l + 6}" y="${y(target) - 7}" class="axis target-label">cible ${target}°</text>
      <path d="${area}" class="area" />
      <path d="${line}" class="line" />
      ${dots}
      ${first ? `<text x="${x(0)}" y="${H - 8}" class="axis">${dateLabel(first)}</text>` : ""}
      ${last && n > 1 ? `<text x="${x(n - 1)}" y="${H - 8}" class="axis" text-anchor="end">${dateLabel(last)}</text>` : ""}
    </svg>
    <p class="chart-note">${escapeHtml(def.depthLabel)} au meilleur de chaque séance. ${
      def.direction === "flexion" ? "Plus l'angle est petit, plus le mouvement est profond : l'axe est inversé pour que monter soit progresser." : "Plus l'angle est grand, plus l'amplitude est grande."
    }</p>`;
}

/* --- Calendrier d'observance --------------------------------------------------------- */

function calendarCard(p: DemoPatient, today: Date): HTMLElement {
  const [y, m, d] = p.program.startedOn.split("-").map(Number);
  const start = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const done = new Set(p.sessions.map((s) => new Date(s.at).toDateString()));
  const planned = new Set(plannedDays(p.program.sessionsPerWeek));
  const weeks = Math.min(p.program.weeks, currentWeek(p, today) + 1);

  let grid = "";
  for (let w = 0; w < weeks; w++) {
    grid += `<span class="cal-week">S${w + 1}</span>`;
    for (let k = 0; k < 7; k++) {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + k);
      const future = day.getTime() > todayStart.getTime();
      const isToday = day.getTime() === todayStart.getTime();
      let cls = "rest";
      let label = "Repos";
      if (done.has(day.toDateString())) {
        cls = "done";
        label = "Séance faite";
      } else if (planned.has(k)) {
        cls = future || isToday ? "planned" : "missed";
        label = future || isToday ? "Séance prévue" : "Séance prévue, non faite";
      }
      const title = `${day.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} : ${label}`;
      grid += `<span class="cal-day ${cls}${isToday ? " today" : ""}" title="${escapeHtml(title)}"></span>`;
    }
  }

  return el(`
    <section class="card">
      <div class="card-head"><h2>Observance</h2></div>
      <div class="cal">
        <span></span>${["L", "M", "M", "J", "V", "S", "D"].map((x) => `<span class="cal-dow">${x}</span>`).join("")}
        ${grid}
      </div>
      <div class="legend">
        <span><i class="cal-day done"></i>Faite</span>
        <span><i class="cal-day missed"></i>Manquée</span>
        <span><i class="cal-day planned"></i>Prévue</span>
      </div>
    </section>`);
}

/* --- Dernières séances ------------------------------------------------------------- */

function sessionsCard(p: DemoPatient): HTMLElement {
  const recent = [...p.sessions].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
  const items = recent
    .map((s) => {
      const byEx = new Map<string, { complete: number; total: number; flag: boolean }>();
      for (const set of s.sets) {
        const def = EXERCISES[set.exerciseId];
        if (!def) continue;
        const cur = byEx.get(set.exerciseId) ?? { complete: 0, total: 0, flag: false };
        for (const r of set.reps) {
          cur.total++;
          if (r.complete) cur.complete++;
          if ((def.trunkLeanWarnDeg != null && (r.trunk ?? 0) > def.trunkLeanWarnDeg) || (def.asymmetryWarnDeg != null && (r.asym ?? 0) > def.asymmetryWarnDeg)) cur.flag = true;
        }
        byEx.set(set.exerciseId, cur);
      }
      const lines = [...byEx.entries()]
        .map(([id, v]) => `<li><span>${escapeHtml(EXERCISES[id]!.name)}</span><b>${v.complete}/${v.total}</b>${v.flag ? `<i class="flag" title="Compensation mesurée sur au moins une répétition"></i>` : ""}</li>`)
        .join("");
      const real = s.real ? `<span class="badge badge-ok" title="Séance faite dans l'espace patient de démo, sur ce navigateur">En vrai</span>` : "";
      return `<div class="sess${s.real ? " real" : ""}"><div class="sess-head"><b>${dayTime(s.at)} ${real}</b><span class="muted">${s.durationMin} min</span></div><ul>${lines}</ul></div>`;
    })
    .join("");
  return el(`
    <section class="card">
      <div class="card-head"><h2>Dernières séances</h2><span class="muted">reps complètes</span></div>
      <div class="sess-list">${items}</div>
    </section>`);
}
