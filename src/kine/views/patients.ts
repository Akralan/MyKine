import type { DemoPatient } from "../data";
import { adherence, alerts, currentWeek, lastSession, planRows, sessionsThisWeek, type Alert } from "../stats";
import { avatar, degS, el, escapeHtml, icon, pct, relativeDay } from "../ui";

/** Un badge par type d'alerte : le détail par exercice est sur la fiche, regroupé dans l'infobulle. */
function badges(al: Alert[]): string {
  const byLabel = new Map<string, string[]>();
  for (const a of al) byLabel.set(a.label, [...(byLabel.get(a.label) ?? []), a.detail]);
  return [...byLabel.entries()]
    .map(([label, details]) => `<span class="badge badge-warn" title="${escapeHtml(details.join(" "))}">${escapeHtml(label)}</span>`)
    .join("");
}

/** Liste des patients : quatre chiffres clés, une recherche, un tableau. */
export function renderPatients(
  content: HTMLElement,
  patients: DemoPatient[],
  today: Date,
  opts: { onOpen: (id: string) => void; onAdd: () => void; welcome?: string },
): void {
  const withAlerts = patients.filter((p) => alerts(p, today).length > 0);
  const adh = patients.map((p) => adherence(p, today)).filter((x): x is number => x != null && x > 0);
  const meanAdh = adh.length ? adh.reduce((a, b) => a + b, 0) / adh.length : null;
  const weekSessions = patients.reduce((n, p) => n + sessionsThisWeek(p, today), 0);

  content.append(
    el(`
    <div class="page-head">
      <div>
        <h1>Patients</h1>
        <p class="muted">${patients.length} patients suivis · ${today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>
      <button class="btn btn-primary" data-add>${icon("plus")}Ajouter un patient</button>
    </div>`),
  );

  if (opts.welcome) {
    content.append(
      el(`<div class="welcome">
        <b>${escapeHtml(opts.welcome)}</b>
        <span>Cinq patients fictifs vous attendent, avec plusieurs semaines de séances. Ouvrez une fiche pour voir l'observance, les amplitudes et les compensations.</span>
      </div>`),
    );
  }

  content.append(
    el(`
    <div class="stats">
      <div class="stat"><span>Patients suivis</span><b>${patients.length}</b></div>
      <div class="stat"><span>Observance moyenne</span><b>${pct(meanAdh)}</b></div>
      <div class="stat"><span>Séances cette semaine</span><b>${weekSessions}</b></div>
      <div class="stat${withAlerts.length ? " stat-warn" : ""}"><span>À surveiller</span><b>${withAlerts.length}</b></div>
    </div>`),
  );

  const toolbar = el(`
    <div class="toolbar">
      <label class="search">${icon("search")}<input type="search" placeholder="Rechercher un patient" aria-label="Rechercher un patient" /></label>
      <div class="chips" role="group" aria-label="Filtrer">
        <button class="chip on" data-filter="all">Tous</button>
        <button class="chip" data-filter="alerts">À surveiller <em>${withAlerts.length}</em></button>
      </div>
    </div>`);
  content.append(toolbar);

  const table = el(`
    <div class="table-card">
      <table class="ptable">
        <thead><tr>
          <th>Patient</th><th>Programme</th><th>Observance</th><th>Dernière séance</th><th>Progression</th><th></th>
        </tr></thead>
        <tbody></tbody>
      </table>
      <p class="empty" hidden>Aucun patient ne correspond.</p>
    </div>`);
  content.append(table);
  const tbody = table.querySelector("tbody")!;

  const rows = patients.map((p) => {
    const a = adherence(p, today);
    const al = alerts(p, today);
    const main = planRows(p)[0];
    const gain = main?.gain;
    const progression =
      gain == null
        ? `<span class="muted">—</span>`
        : `<span class="trend ${gain >= 0 ? "up" : "down"}">${icon(gain >= 0 ? "up" : "down", "ico-sm")}${degS(Math.abs(gain))}</span>
           <small>${escapeHtml(main!.def.name)}</small>`;
    const tr = el<HTMLTableRowElement>(`
      <tr tabindex="0" data-id="${escapeHtml(p.id)}">
        <td>
          <div class="who">${avatar(p.firstName, p.lastName)}
            <div><b>${escapeHtml(p.firstName)} ${escapeHtml(p.lastName)}</b><small>${p.age} ans · ${escapeHtml(p.condition)}</small></div>
          </div>
        </td>
        <td data-label="Programme"><b class="nowrap">${escapeHtml(p.program.label)}</b><small>Semaine ${currentWeek(p, today)} / ${p.program.weeks}</small></td>
        <td data-label="Observance">
          ${p.sessions.length === 0 && p.createdInDemo ? `<span class="muted">En attente</span>` : `<div class="meter"><i style="width:${Math.round((a ?? 0) * 100)}%"></i></div><small>${pct(a)}</small>`}
        </td>
        <td data-label="Dernière séance">${relativeDay(lastSession(p)?.at, today)}</td>
        <td data-label="Progression">${progression}</td>
        <td class="flags">${badges(al)}</td>
      </tr>`);
    const open = () => opts.onOpen(p.id);
    tr.onclick = open;
    tr.onkeydown = (e) => {
      if (e.key === "Enter") open();
    };
    tbody.append(tr);
    return { p, tr, hasAlert: al.length > 0 };
  });

  // Recherche et filtre combinés.
  let filter = "all";
  const input = toolbar.querySelector<HTMLInputElement>("input")!;
  const apply = () => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    for (const r of rows) {
      const text = `${r.p.firstName} ${r.p.lastName} ${r.p.condition}`.toLowerCase();
      const ok = (!q || text.includes(q)) && (filter === "all" || r.hasAlert);
      r.tr.hidden = !ok;
      if (ok) shown++;
    }
    table.querySelector<HTMLElement>(".empty")!.hidden = shown > 0;
  };
  input.oninput = apply;
  toolbar.querySelectorAll<HTMLButtonElement>(".chip").forEach((b) => {
    b.onclick = () => {
      filter = b.dataset.filter!;
      toolbar.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === b));
      apply();
    };
  });

  content.querySelector<HTMLButtonElement>("[data-add]")!.onclick = opts.onAdd;
}
