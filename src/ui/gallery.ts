import { POSE_MODELS } from "../pose/mediapipe";
import { EXERCISES } from "../scoring/exercise";
import { deleteSession, listSessions } from "../storage/db";

/** Mini galerie des séances stockées localement (IndexedDB). */
export async function renderGallery(root: HTMLElement, onOpen: (id: string) => void): Promise<void> {
  const sessions = await listSessions();
  root.innerHTML = `
    <section class="gallery">
      <h2>Séances enregistrées</h2>
      ${
        sessions.length === 0
          ? `<p class="empty">Aucune séance pour l'instant. Lancez une séance pour commencer.</p>`
          : `<ul class="cards">${sessions
              .map(
                (s) => `<li class="card" data-id="${s.id}">
                  <div class="card-head">
                    <b>${EXERCISES[s.exerciseId]?.name ?? s.exerciseId}</b>
                    <span class="date">${new Date(s.createdAt).toLocaleString("fr-FR")}</span>
                  </div>
                  <div class="card-metrics">
                    <span><b>${s.summary.repsTotal}</b> reps</span>
                    <span>prof. <b>${s.summary.bestMinAngle == null ? "–" : Math.round(s.summary.bestMinAngle) + "°"}</b></span>
                    <span>asym. <b>${s.summary.meanAsymmetry == null ? "–" : Math.round(s.summary.meanAsymmetry) + "°"}</b></span>
                    <span>${(s.durationMs / 1000).toFixed(0)} s</span>
                    <span>modèle <b>${POSE_MODELS[s.poseModel ?? "lite"].label}</b></span>
                  </div>
                  <div class="card-actions">
                    <button class="primary" data-a="open">Replay</button>
                    <button data-a="delete">Supprimer</button>
                  </div>
                </li>`,
              )
              .join("")}</ul>`
      }
    </section>`;

  root.querySelectorAll<HTMLElement>(".card").forEach((card) => {
    const id = card.dataset.id!;
    card.querySelector('[data-a="open"]')!.addEventListener("click", () => onOpen(id));
    card.querySelector('[data-a="delete"]')!.addEventListener("click", async () => {
      if (!confirm("Supprimer cette séance ?")) return;
      await deleteSession(id);
      await renderGallery(root, onOpen);
    });
  });
}
