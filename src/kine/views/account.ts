import { LEGAL } from "../legal";
import { deleteEverything, exportData, isValidEmail, saveAccount, signOut, type Account } from "../store";
import { el, escapeHtml, icon, openModal, shortDate, toast } from "../ui";
import { bindLegalLinks } from "./auth";

/** Mon compte : profil, consentements, droits RGPD, documents, déconnexion. */
export function renderAccount(content: HTMLElement, account: Account, onSignedOut: () => void, onChanged: () => void): void {
  const consent = (doc: "cgu" | "confidentialite") => account.consents.find((c) => c.document === doc);

  content.append(
    el(`<div class="page-head"><div><h1>Mon compte</h1><p class="muted">Créé le ${shortDate(account.createdAt)}</p></div></div>`),
  );

  // Profil.
  const profile = el(`
    <section class="card">
      <div class="card-head"><h2>Profil professionnel</h2></div>
      <form class="profile" novalidate>
        <div class="row2">
          <label class="field"><span>Prénom</span><input name="firstName" value="${escapeHtml(account.firstName)}" /></label>
          <label class="field"><span>Nom</span><input name="lastName" value="${escapeHtml(account.lastName)}" /></label>
        </div>
        <div class="row2">
          <label class="field"><span>E-mail professionnel</span><input name="email" type="email" value="${escapeHtml(account.email)}" /></label>
          <label class="field"><span>Cabinet</span><input name="practice" value="${escapeHtml(account.practice)}" /></label>
        </div>
        <div class="row2">
          <label class="field"><span>Profession</span><input value="${escapeHtml(account.profession)}" readonly /></label>
          <label class="field"><span>N° RPPS</span><input value="${escapeHtml(account.rpps)}" readonly /><small>Modifiable sur demande uniquement : il identifie le professionnel.</small></label>
        </div>
        <p class="form-error" role="alert" hidden></p>
        <button class="btn btn-primary" type="submit">Enregistrer</button>
      </form>
    </section>`);
  content.append(profile);
  const form = profile.querySelector<HTMLFormElement>("form")!;
  form.onsubmit = (e) => {
    e.preventDefault();
    const v = (n: string) => (form.elements.namedItem(n) as HTMLInputElement).value.trim();
    const err = form.querySelector<HTMLElement>(".form-error")!;
    if (!v("firstName") || !v("lastName") || !isValidEmail(v("email"))) {
      err.textContent = "Le prénom, le nom et un e-mail valide sont nécessaires.";
      err.hidden = false;
      return;
    }
    err.hidden = true;
    Object.assign(account, { firstName: v("firstName"), lastName: v("lastName"), email: v("email"), practice: v("practice") });
    saveAccount(account);
    toast("Profil enregistré");
    onChanged();
  };

  // Consentements.
  const consents = el(`
    <section class="card">
      <div class="card-head"><h2>Consentements</h2></div>
      <ul class="kv">
        ${(["cgu", "confidentialite"] as const)
          .map((d) => {
            const c = consent(d);
            return `<li><span>${escapeHtml(LEGAL[d].title)}</span><b>${c ? `Version ${c.version}, acceptée le ${shortDate(c.acceptedAt)}` : "Non acceptée"}</b>
              <button class="link" data-legal="${d}">Relire</button></li>`;
          })
          .join("")}
        <li><span>Nouveautés MyCoach par e-mail</span>
          <label class="switch"><input type="checkbox" ${account.newsletter ? "checked" : ""} data-newsletter /><i></i><span class="sr">Recevoir les nouveautés</span></label>
        </li>
      </ul>
    </section>`);
  content.append(consents);
  bindLegalLinks(consents);
  consents.querySelector<HTMLInputElement>("[data-newsletter]")!.onchange = (e) => {
    account.newsletter = (e.target as HTMLInputElement).checked;
    saveAccount(account);
    toast(account.newsletter ? "Inscription aux nouveautés enregistrée" : "Désinscription enregistrée");
  };

  // Données personnelles.
  const data = el(`
    <section class="card">
      <div class="card-head"><h2>Vos données</h2></div>
      <p class="muted">Dans cette démo, tout est enregistré dans ce navigateur. Rien n'a été envoyé.</p>
      <div class="actions">
        <button class="btn btn-ghost" data-export>${icon("download")}Exporter mes données</button>
        <button class="btn btn-danger" data-delete>${icon("trash")}Supprimer mon compte</button>
      </div>
    </section>`);
  content.append(data);
  data.querySelector<HTMLButtonElement>("[data-export]")!.onclick = () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mycoach-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  data.querySelector<HTMLButtonElement>("[data-delete]")!.onclick = () => {
    const { body, close } = openModal("Supprimer votre compte ?");
    body.innerHTML = `
      <p>Le compte, vos consentements, les patients ajoutés et les programmes modifiés seront effacés de ce navigateur.
      Cette action est définitive.</p>
      <div class="actions end">
        <button class="btn btn-ghost" data-cancel>Annuler</button>
        <button class="btn btn-danger" data-confirm>Supprimer définitivement</button>
      </div>`;
    body.querySelector<HTMLButtonElement>("[data-cancel]")!.onclick = close;
    body.querySelector<HTMLButtonElement>("[data-confirm]")!.onclick = () => {
      close();
      deleteEverything();
      onSignedOut();
    };
  };

  // Documents et session.
  const docs = el(`
    <section class="card">
      <div class="card-head"><h2>Documents</h2></div>
      <div class="docs">
        ${(["cgu", "confidentialite", "mentions"] as const)
          .map((d) => `<button class="doc" data-legal="${d}">${icon("doc")}<span>${escapeHtml(LEGAL[d].title)}</span></button>`)
          .join("")}
      </div>
    </section>`);
  content.append(docs);
  bindLegalLinks(docs);

  const out = el(`<div class="actions"><button class="btn btn-ghost" data-logout>${icon("logout")}Se déconnecter</button><a class="btn btn-ghost" href="/landing/">Retour au site</a></div>`);
  content.append(out);
  out.querySelector<HTMLButtonElement>("[data-logout]")!.onclick = () => {
    signOut();
    onSignedOut();
  };
}
