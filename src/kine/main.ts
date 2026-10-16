import { EXERCISES } from "../scoring/exercise";
import { addPatient, allPatients, getAccount, isSignedIn, newPatientId, realSessions, savePlan, todayIso, type Account } from "./store";
import { el, escapeHtml, openModal, toast } from "./ui";
import { renderAccount } from "./views/account";
import { renderSignin, renderSignup } from "./views/auth";
import { mountLayout } from "./views/layout";
import { renderLibrary } from "./views/library";
import { renderPatient } from "./views/patient";
import { renderPatients } from "./views/patients";
import { prescriptionEditor } from "./views/prescription";

/**
 * Espace kiné de la démo. Routes par ancre, pour rester un site statique :
 * #/patients, #/patients/<id>, #/bibliotheque, #/compte.
 */

const root = document.getElementById("kine")!;
/** Message d'accueil affiché une seule fois, juste après l'inscription. */
let welcome: string | undefined;

function go(hash: string): void {
  if (location.hash === hash) render();
  else location.hash = hash;
}

/** Rendu protégé : une erreur s'affiche à l'écran plutôt que de laisser une page blanche. */
function render(): void {
  renderView().catch((e: unknown) => {
    console.error(e);
    root.innerHTML = `<div class="crash"><h1>La démo a rencontré un problème</h1><p class="muted">${escapeHtml(String(e instanceof Error ? e.message : e))}</p><a class="btn btn-ghost" href="#/patients">Revenir aux patients</a></div>`;
  });
}

async function renderView(): Promise<void> {
  const account = getAccount();
  if (!account || !isSignedIn()) {
    const done = () => {
      welcome = `Bienvenue, ${getAccount()?.firstName ?? ""}.`;
      go("#/patients");
    };
    if (account) renderSignin(root, done, () => renderSignup(root, done));
    else renderSignup(root, done);
    return;
  }

  const today = new Date();
  const patients = allPatients(today, await realSessions());
  const [, section = "patients", id] = location.hash.replace(/^#/, "").split("/");

  if (section === "bibliotheque") {
    renderLibrary(mountLayout(root, account, "bibliotheque", patients.length));
    document.title = "Bibliothèque · MyCoach";
    return;
  }

  if (section === "compte") {
    renderAccount(mountLayout(root, account, "compte", patients.length), account, render, render);
    document.title = "Mon compte · MyCoach";
    return;
  }

  const content = mountLayout(root, account, "patients", patients.length);
  const patient = id ? patients.find((p) => p.id === decodeURIComponent(id)) : undefined;
  if (patient) {
    document.title = `${patient.firstName} ${patient.lastName} · MyCoach`;
    renderPatient(content, patient, today, {
      onBack: () => go("#/patients"),
      onEditPlan: () => editPlan(patient.id, patient.firstName, patient.program.plan),
    });
    return;
  }

  document.title = "Patients · MyCoach";
  renderPatients(content, patients, today, {
    onOpen: (pid) => go(`#/patients/${encodeURIComponent(pid)}`),
    onAdd: () => addPatientModal(account),
    welcome,
  });
  welcome = undefined;
}

function editPlan(patientId: string, firstName: string, plan: Parameters<typeof prescriptionEditor>[0]): void {
  const { body, close } = openModal(`Programme de ${firstName}`, { wide: true });
  const editor = prescriptionEditor(plan);
  body.append(
    el(`<p class="muted">Cochez les exercices à prescrire. Une cible laissée vide reprend celle de l'exercice.</p>`),
    editor.node,
    el(`<p class="form-error" role="alert" hidden></p>`),
    el(`<div class="actions end"><button class="btn btn-ghost" data-cancel>Annuler</button><button class="btn btn-primary" data-save>Enregistrer le programme</button></div>`),
  );
  body.querySelector<HTMLButtonElement>("[data-cancel]")!.onclick = close;
  body.querySelector<HTMLButtonElement>("[data-save]")!.onclick = () => {
    const next = editor.read();
    if (next.length === 0) {
      const err = body.querySelector<HTMLElement>(".form-error")!;
      err.textContent = "Un programme compte au moins un exercice.";
      err.hidden = false;
      return;
    }
    savePlan(patientId, next);
    close();
    toast("Programme enregistré");
    render();
  };
}

function addPatientModal(account: Account): void {
  const { body, close } = openModal("Ajouter un patient", { wide: true });
  const editor = prescriptionEditor([{ exerciseId: "squat", sets: 3, reps: 12 }]);
  const form = el<HTMLFormElement>(`
    <form novalidate>
      <div class="row3">
        <label class="field"><span>Prénom</span><input name="firstName" required /></label>
        <label class="field"><span>Nom</span><input name="lastName" required /></label>
        <label class="field"><span>Âge</span><input name="age" type="number" min="1" max="120" required /></label>
      </div>
      <label class="field"><span>Motif de prise en charge</span><input name="condition" placeholder="Ex. entorse de cheville, cheville gauche" required /></label>
      <div class="row2">
        <label class="field"><span>Séances par semaine</span><input name="perWeek" type="number" min="1" max="7" value="4" /></label>
        <label class="field"><span>Durée du programme (semaines)</span><input name="weeks" type="number" min="1" max="24" value="6" /></label>
      </div>
      <h3 class="sub">Programme</h3>
      <div data-editor></div>
      <label class="check"><input type="checkbox" name="consent" required />
        <span>${escapeHtml(account.firstName)}, vous confirmez avoir informé ce patient et recueilli son consentement au suivi de ses exercices par MyCoach.</span>
      </label>
      <p class="form-error" role="alert" hidden></p>
      <div class="actions end">
        <button type="button" class="btn btn-ghost" data-cancel>Annuler</button>
        <button class="btn btn-primary" type="submit">Ajouter le patient</button>
      </div>
    </form>`);
  form.querySelector("[data-editor]")!.replaceWith(editor.node);
  body.append(form);

  form.querySelector<HTMLButtonElement>("[data-cancel]")!.onclick = close;
  form.onsubmit = (e) => {
    e.preventDefault();
    const f = (n: string) => form.elements.namedItem(n) as HTMLInputElement;
    const err = form.querySelector<HTMLElement>(".form-error")!;
    const plan = editor.read();
    const age = Number(f("age").value);
    const missing: string[] = [];
    if (!f("firstName").value.trim()) missing.push("le prénom");
    if (!f("lastName").value.trim()) missing.push("le nom");
    if (!(age > 0 && age < 120)) missing.push("l'âge");
    if (!f("condition").value.trim()) missing.push("le motif");
    if (plan.length === 0) missing.push("au moins un exercice");
    if (!f("consent").checked) missing.push("la confirmation du consentement");
    if (missing.length) {
      err.textContent = `Il manque ${missing.join(", ")}.`;
      err.hidden = false;
      return;
    }
    const firstName = f("firstName").value.trim();
    const lastName = f("lastName").value.trim();
    const id = newPatientId(firstName, lastName);
    addPatient({
      id,
      firstName,
      lastName,
      age,
      condition: f("condition").value.trim(),
      plan: plan.filter((p) => EXERCISES[p.exerciseId]),
      sessionsPerWeek: Math.max(1, Math.min(7, Number(f("perWeek").value) || 4)),
      weeks: Math.max(1, Math.min(24, Number(f("weeks").value) || 6)),
      createdAt: new Date().toISOString(),
      consentOn: todayIso(),
    });
    close();
    toast(`${firstName} ${lastName} ajouté`);
    go(`#/patients/${encodeURIComponent(id)}`);
  };
}

window.addEventListener("hashchange", () => render());
render();
