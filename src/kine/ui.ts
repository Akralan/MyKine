import { el, escapeHtml } from "../ui/shell";

export { el, escapeHtml };

/** Icônes au trait, grille 24, même famille que celles de l'app patient. */
const ICONS = {
  patients: `<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c0-3.2 2.5-5.3 5.5-5.3s5.5 2.1 5.5 5.3"/><circle cx="17" cy="9" r="2.4"/><path d="M15.8 13.9c2.7.2 4.7 2.1 4.7 5.1"/>`,
  library: `<path d="M5 7.5v9M8.2 5.5v13M15.8 5.5v13M19 7.5v9M8.2 12h7.6"/>`,
  account: `<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c0-3.8 3.1-6.2 7-6.2s7 2.4 7 6.2"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
  back: `<path d="M15 5l-7 7 7 7"/>`,
  close: `<path d="M6 6l12 12M18 6L6 18"/>`,
  external: `<path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>`,
  alert: `<path d="M12 4.5 2.8 19.5h18.4z"/><path d="M12 10v4.2M12 17h.01"/>`,
  search: `<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>`,
  logout: `<path d="M10 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4M15 8l4 4-4 4M19 12H9"/>`,
  download: `<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14"/>`,
  trash: `<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>`,
  lock: `<rect x="5" y="10.5" width="14" height="9" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>`,
  check: `<path d="m5 12.5 4.5 4.5L19 7.5"/>`,
  up: `<path d="M12 19V5M6 11l6-6 6 6"/>`,
  down: `<path d="M12 5v14M6 13l6 6 6-6"/>`,
  doc: `<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z"/><path d="M14 3.5V8h4M9.5 12h5M9.5 15.5h5"/>`,
} as const;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName, cls = "ico"): string {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

/** Pastille d'initiales ; la teinte suit le nom pour rester stable d'un écran à l'autre. */
export function avatar(first: string, last: string, size: "sm" | "lg" = "sm"): string {
  const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  const hues = ["#d7f0ed", "#e8f6c8", "#f0e6da", "#e2e6f5", "#f5e1e6"];
  let h = 0;
  for (const c of first + last) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `<span class="avatar avatar-${size}" style="background:${hues[h % hues.length]}">${escapeHtml(initials)}</span>`;
}

export const pct = (v: number | null | undefined): string => (v == null ? "—" : `${Math.round(v * 100)} %`);

export const degS = (v: number | null | undefined): string => (v == null ? "—" : `${Math.round(v)}°`);

/** « aujourd'hui », « hier », « il y a 4 jours », puis la date. */
export function relativeDay(isoTs: string | undefined, today = new Date()): string {
  if (!isoTs) return "Aucune";
  const d = new Date(isoTs);
  const a = new Date(d);
  a.setHours(0, 0, 0, 0);
  const b = new Date(today);
  b.setHours(0, 0, 0, 0);
  const days = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function shortDate(isoTs: string): string {
  return new Date(isoTs).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function dayTime(isoTs: string): string {
  const d = new Date(isoTs);
  const day = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${time}`;
}

/**
 * Fenêtre modale accessible : focus piégé sur le premier champ, Échap et clic sur le fond
 * ferment. Renvoie le corps à remplir et la fonction de fermeture.
 */
export function openModal(title: string, opts: { wide?: boolean } = {}): { body: HTMLElement; close: () => void } {
  const previous = document.activeElement as HTMLElement | null;
  const overlay = el(`
    <div class="modal-overlay">
      <div class="modal${opts.wide ? " modal-wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-head">
          <h2 id="modal-title">${escapeHtml(title)}</h2>
          <button class="icon-btn" data-close aria-label="Fermer">${icon("close")}</button>
        </div>
        <div class="modal-body"></div>
      </div>
    </div>`);
  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
    document.body.classList.remove("no-scroll");
    previous?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector<HTMLButtonElement>("[data-close]")!.onclick = close;
  document.addEventListener("keydown", onKey);
  document.body.classList.add("no-scroll");
  document.body.append(overlay);
  const body = overlay.querySelector<HTMLElement>(".modal-body")!;
  requestAnimationFrame(() => {
    (body.querySelector<HTMLElement>("input, select, button, a") ?? overlay.querySelector<HTMLElement>("[data-close]"))?.focus();
  });
  return { body, close };
}

/** Message bref en bas d'écran, qui disparaît seul. */
export function toast(message: string): void {
  document.querySelector(".toast")?.remove();
  const t = el(`<div class="toast" role="status">${icon("check")}<span>${escapeHtml(message)}</span></div>`);
  document.body.append(t);
  setTimeout(() => t.classList.add("out"), 2600);
  setTimeout(() => t.remove(), 3000);
}
