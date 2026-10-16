import type { Account } from "../store";
import { avatar, el, escapeHtml, icon, type IconName } from "../ui";

export type Section = "patients" | "bibliotheque" | "compte";

const NAV: { id: Section; label: string; icon: IconName }[] = [
  { id: "patients", label: "Patients", icon: "patients" },
  { id: "bibliotheque", label: "Bibliothèque", icon: "library" },
  { id: "compte", label: "Mon compte", icon: "account" },
];

/**
 * Cadre de l'espace kiné : barre latérale sur ordinateur, barre du haut et onglets
 * en bas sur téléphone. Renvoie la zone de contenu.
 */
export function mountLayout(root: HTMLElement, account: Account, active: Section, patientCount: number): HTMLElement {
  root.innerHTML = "";
  const navLinks = NAV.map(
    (n) => `<a href="#/${n.id}" class="nav-item${n.id === active ? " active" : ""}"${n.id === active ? ' aria-current="page"' : ""}>
      ${icon(n.icon)}<span>${n.label}</span>${n.id === "patients" ? `<em class="count">${patientCount}</em>` : ""}
    </a>`,
  ).join("");

  const shell = el(`
    <div class="app">
      <aside class="sidebar">
        <a class="brand brand-light" href="#/patients"><span class="brand-mark" aria-hidden="true"></span><span class="brand-name">MyCoach</span></a>
        <nav class="side-nav" aria-label="Espace kiné">${navLinks}</nav>
        <div class="side-foot">
          <div class="side-demo"><b>Démo</b> Données fictives, stockées dans ce navigateur.</div>
          <a class="side-me" href="#/compte">
            ${avatar(account.firstName, account.lastName)}
            <span><b>${escapeHtml(account.firstName)} ${escapeHtml(account.lastName)}</b><small>${escapeHtml(account.profession)}</small></span>
          </a>
        </div>
      </aside>
      <header class="topbar">
        <a class="brand" href="#/patients"><span class="brand-mark" aria-hidden="true"></span><span class="brand-name">MyCoach</span></a>
        <span class="pill-demo">Démo</span>
      </header>
      <main class="content"></main>
      <nav class="bottom-nav" aria-label="Espace kiné">${navLinks}</nav>
    </div>`);
  root.append(shell);
  window.scrollTo(0, 0);
  return shell.querySelector<HTMLElement>(".content")!;
}
