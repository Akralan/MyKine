/** Briques communes à tous les écrans : cadre, barre d'état, barre d'onglets, formats. */

export type TabName = "home" | "exercises" | "history" | "profile";

/** Traits à 1,7 px sur une grille de 22, la taille des pastilles de la maquette. */
const ICONS: Record<TabName, string> = {
  home: `<path d="M3.6 9.9 11 4l7.4 5.9V17.9a1.2 1.2 0 0 1-1.2 1.2h-3.5v-5.2H8.3v5.2H4.8a1.2 1.2 0 0 1-1.2-1.2z"/>`,
  exercises: `<path d="M4.3 8.5v5M6.9 6.7v10.6M15.1 6.7v10.6M17.7 8.5v5M6.9 11h8.2"/>`,
  history: `<circle cx="11" cy="11" r="7.2"/><path d="M11 6.7V11l3 1.8"/>`,
  profile: `<circle cx="11" cy="7.9" r="3.3"/><path d="M4.9 18.5c0-3.4 2.7-5.6 6.1-5.6s6.1 2.2 6.1 5.6"/>`,
};

const TABS: { name: TabName; label: string }[] = [
  { name: "home", label: "Accueil" },
  { name: "exercises", label: "Exercices" },
  { name: "history", label: "Historique" },
  { name: "profile", label: "Profil" },
];

function icon(name: TabName): string {
  return `<svg class="icon" viewBox="0 0 22 22" fill="none" stroke="currentColor"
    stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

/** Construit un élément à partir d'un fragment HTML. */
export function el<T extends HTMLElement = HTMLElement>(html: string): T {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild as T;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Bande haute de la maquette. L'heure et la batterie y sont du décor de mockup :
 * dans l'app réelle elles doublent celles du téléphone. Il ne reste que l'espace,
 * qui porte aussi l'encoche via `safe-area-inset-top`.
 */
export function statusbar(): { node: HTMLElement; dispose: () => void } {
  return { node: el(`<div class="statusbar"></div>`), dispose: () => {} };
}

export function tabbar(active: TabName, onNav: (t: TabName) => void): HTMLElement {
  const node = el(`<nav class="tabbar">${TABS.map(
    (t) => `<button data-tab="${t.name}" class="${t.name === active ? "active" : ""}">
      ${icon(t.name)}<span class="label">${t.label}</span>
    </button>`,
  ).join("")}</nav>`);
  node.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
    b.onclick = () => onNav(b.dataset.tab as TabName);
  });
  return node;
}

/**
 * Monte un écran d'onglet : cadre téléphone, barre d'état, corps scrollable, onglets.
 * Renvoie le conteneur à remplir et la fonction de nettoyage.
 */
export function mountTabScreen(
  root: HTMLElement,
  active: TabName,
  onNav: (t: TabName) => void,
): { body: HTMLElement; dispose: () => void } {
  root.innerHTML = "";
  const phone = el(`<div class="phone"></div>`);
  const status = statusbar();
  const body = el(`<div class="screen"><div class="scroll"></div></div>`);
  phone.append(status.node, body, tabbar(active, onNav));
  root.append(phone);
  return { body: body.querySelector<HTMLElement>(".scroll")!, dispose: status.dispose };
}

/** Cadre téléphone sans barre d'onglets (replay, fin de séance, séance live). */
export function mountFullScreen(root: HTMLElement, opts: { dark?: boolean; status?: boolean } = {}): {
  phone: HTMLElement;
  dispose: () => void;
} {
  root.innerHTML = "";
  const phone = el(`<div class="phone${opts.dark ? " dark" : ""}"></div>`);
  root.append(phone);
  if (opts.status === false) return { phone, dispose: () => {} };
  const status = statusbar();
  phone.append(status.node);
  return { phone, dispose: status.dispose };
}

/* --- Formats ---------------------------------------------------------------- */

export const deg = (v: number | null | undefined): string =>
  v == null || Number.isNaN(v) ? "—" : `${Math.round(v)}°`;

/** « 3 min 12 s » au-delà d'une minute, « 48 s » en dessous. */
export function duration(ms: number): string {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
}

/** « 3:12 », format compact des cartes d'historique. */
export function clock(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function timeOf(ts: number): string {
  return new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** « Aujourd'hui », « Hier », sinon « 7 septembre ». */
export function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Aujourd'hui";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (same(d, yesterday)) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

/** « Jeudi 10 septembre », en-tête de l'accueil. */
export function longDate(d: Date): string {
  const s = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** « 3 × 12 · amplitude cible 100° » — la dose telle que l'affiche la maquette. */
export function doseLabel(sets: number, reps: number, extra?: string): string {
  return `${sets} × ${reps}${extra ? ` · ${extra}` : ""}`;
}
