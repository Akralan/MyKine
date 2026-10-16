import { LEGAL } from "../legal";
import {
  LEGAL_VERSION,
  deleteEverything,
  getAccount,
  isValidEmail,
  isValidRpps,
  saveAccount,
  signIn,
  type Account,
} from "../store";
import { el, escapeHtml, icon, openModal } from "../ui";
import heroPhoto from "../../../landing/img/kine-genou.jpg";

/** Compte prérempli pour qui veut voir l'espace sans saisir de formulaire. */
const DEMO_ACCOUNT = {
  firstName: "Camille",
  lastName: "Durand",
  email: "camille.durand@cabinet-demo.fr",
  profession: "Masseur-kinésithérapeute",
  rpps: "10003456789",
  practice: "Cabinet de kinésithérapie, Lyon 7e",
};

const PROFESSIONS = ["Masseur-kinésithérapeute", "Médecin de médecine physique et de réadaptation", "Autre professionnel de santé"];

function aside(): string {
  return `
    <aside class="auth-aside">
      <a class="brand brand-light" href="/landing/"><span class="brand-mark" aria-hidden="true"></span><span class="brand-name">MyCoach</span></a>
      <div class="auth-aside-copy">
        <p class="kicker light">Espace kiné</p>
        <h1>Voyez ce que vos patients font entre deux séances.</h1>
        <ul class="auth-points">
          <li>${icon("check")}Cinq patients fictifs pour explorer, avec leurs séances</li>
          <li>${icon("check")}Observance, amplitudes et compensations, patient par patient</li>
          <li>${icon("check")}Aucune image : seulement 33 points articulaires</li>
        </ul>
      </div>
      <img class="auth-photo" src="${heroPhoto}" alt="Un kinésithérapeute examine le genou d'un patient" />
    </aside>`;
}

function legalLink(doc: "cgu" | "confidentialite" | "mentions", label: string): string {
  return `<button type="button" class="link" data-legal="${doc}">${label}</button>`;
}

export function bindLegalLinks(root: HTMLElement): void {
  root.querySelectorAll<HTMLButtonElement>("[data-legal]").forEach((b) => {
    b.onclick = () => {
      const doc = LEGAL[b.dataset.legal as keyof typeof LEGAL];
      const { body } = openModal(doc.title, { wide: true });
      body.innerHTML = `<div class="legal">${doc.html}</div>`;
    };
  });
}

/** Inscription. `onDone` est appelé une fois le compte créé et la session ouverte. */
export function renderSignup(root: HTMLElement, onDone: () => void): void {
  root.innerHTML = "";
  const page = el(`
    <div class="auth">
      ${aside()}
      <main class="auth-main">
        <div class="auth-card">
          <div class="demo-note">${icon("lock")}<span><b>Démo.</b> Votre compte est créé dans ce navigateur uniquement. Rien n'est envoyé.</span></div>
          <h2>Créer votre espace kiné</h2>
          <p class="muted">Réservé aux professionnels de santé.</p>

          <button type="button" class="btn btn-soft btn-block" data-demo>Remplir avec un compte de démo</button>
          <div class="sep"><span>ou</span></div>

          <form novalidate>
            <div class="row2">
              <label class="field"><span>Prénom</span><input name="firstName" autocomplete="given-name" required /></label>
              <label class="field"><span>Nom</span><input name="lastName" autocomplete="family-name" required /></label>
            </div>
            <label class="field"><span>E-mail professionnel</span><input name="email" type="email" autocomplete="email" required /></label>
            <label class="field">
              <span>Mot de passe</span>
              <input name="password" type="password" autocomplete="new-password" minlength="8" required />
              <small>8 caractères minimum. En démo, il n'est pas conservé.</small>
            </label>
            <div class="row2">
              <label class="field"><span>Profession</span>
                <select name="profession">${PROFESSIONS.map((p) => `<option>${escapeHtml(p)}</option>`).join("")}</select>
              </label>
              <label class="field"><span>N° RPPS</span>
                <input name="rpps" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="11 chiffres" required />
              </label>
            </div>
            <label class="field"><span>Cabinet <em>facultatif</em></span><input name="practice" autocomplete="organization" /></label>

            <label class="check"><input type="checkbox" name="cgu" required />
              <span>J'accepte les ${legalLink("cgu", "conditions générales d'utilisation")} et la ${legalLink("confidentialite", "politique de confidentialité")}.</span>
            </label>
            <label class="check"><input type="checkbox" name="pro" required />
              <span>Je certifie être un professionnel de santé inscrit au RPPS, et recueillir le consentement de mes patients avant de leur prescrire un suivi.</span>
            </label>
            <label class="check"><input type="checkbox" name="newsletter" />
              <span>Recevoir les nouveautés de MyCoach, un e-mail par mois au plus. <em>Facultatif</em></span>
            </label>

            <p class="form-error" role="alert" hidden></p>
            <button class="btn btn-primary btn-block btn-lg" type="submit">Créer mon compte</button>
          </form>
          <p class="auth-foot">${legalLink("mentions", "Mentions légales")} · <a href="/landing/">Retour au site</a></p>
        </div>
      </main>
    </div>`);
  root.append(page);
  bindLegalLinks(page);

  const form = page.querySelector<HTMLFormElement>("form")!;
  const err = page.querySelector<HTMLElement>(".form-error")!;
  const f = (n: string) => form.elements.namedItem(n) as HTMLInputElement;

  page.querySelector<HTMLButtonElement>("[data-demo]")!.onclick = () => {
    for (const [k, v] of Object.entries(DEMO_ACCOUNT)) f(k).value = v;
    f("password").value = "demo-mycoach";
    f("cgu").focus();
    err.hidden = true;
  };

  form.onsubmit = (e) => {
    e.preventDefault();
    const problems: string[] = [];
    const mark = (name: string, bad: boolean) => f(name).toggleAttribute("aria-invalid", bad);
    const need = (name: string, ok: boolean, msg: string) => {
      mark(name, !ok);
      if (!ok) problems.push(msg);
    };
    need("firstName", f("firstName").value.trim() !== "", "le prénom");
    need("lastName", f("lastName").value.trim() !== "", "le nom");
    need("email", isValidEmail(f("email").value), "un e-mail valide");
    need("password", f("password").value.length >= 8, "un mot de passe de 8 caractères");
    need("rpps", isValidRpps(f("rpps").value), "un n° RPPS à 11 chiffres");
    need("cgu", f("cgu").checked, "l'acceptation des CGU");
    need("pro", f("pro").checked, "la certification professionnelle");
    if (problems.length) {
      err.textContent = `Il manque ${problems.join(", ")}.`;
      err.hidden = false;
      form.querySelector<HTMLElement>("[aria-invalid]")?.focus();
      return;
    }
    const now = new Date().toISOString();
    const account: Account = {
      firstName: f("firstName").value.trim(),
      lastName: f("lastName").value.trim(),
      email: f("email").value.trim(),
      profession: (form.elements.namedItem("profession") as HTMLSelectElement).value,
      rpps: f("rpps").value.replace(/\s/g, ""),
      practice: f("practice").value.trim(),
      newsletter: f("newsletter").checked,
      createdAt: now,
      consents: [
        { document: "cgu", version: LEGAL_VERSION, acceptedAt: now },
        { document: "confidentialite", version: LEGAL_VERSION, acceptedAt: now },
      ],
    };
    saveAccount(account);
    signIn();
    onDone();
  };
}

/** Reconnexion après « Se déconnecter » : le compte existe déjà dans ce navigateur. */
export function renderSignin(root: HTMLElement, onDone: () => void, onNewAccount: () => void): void {
  const account = getAccount();
  if (!account) return renderSignup(root, onDone);
  root.innerHTML = "";
  const page = el(`
    <div class="auth">
      ${aside()}
      <main class="auth-main">
        <div class="auth-card">
          <h2>Bon retour, ${escapeHtml(account.firstName)}</h2>
          <p class="muted">Compte de démo enregistré dans ce navigateur.</p>
          <form novalidate>
            <label class="field"><span>E-mail professionnel</span><input name="email" type="email" value="${escapeHtml(account.email)}" readonly /></label>
            <label class="field"><span>Mot de passe</span><input name="password" type="password" autocomplete="current-password" placeholder="N'importe lequel, en démo" /></label>
            <button class="btn btn-primary btn-block btn-lg" type="submit">Se connecter</button>
          </form>
          <div class="sep"><span>ou</span></div>
          <button type="button" class="btn btn-ghost btn-block" data-new>Créer un autre compte</button>
          <p class="auth-foot">${legalLink("mentions", "Mentions légales")} · <a href="/landing/">Retour au site</a></p>
        </div>
      </main>
    </div>`);
  root.append(page);
  bindLegalLinks(page);
  page.querySelector<HTMLFormElement>("form")!.onsubmit = (e) => {
    e.preventDefault();
    signIn();
    onDone();
  };
  page.querySelector<HTMLButtonElement>("[data-new]")!.onclick = () => {
    if (!confirm("Le compte de démo actuel et les patients ajoutés seront effacés de ce navigateur. Continuer ?")) return;
    deleteEverything();
    onNewAccount();
  };
}
