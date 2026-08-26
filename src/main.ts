import { SQUAT } from "./scoring/exercise";
import { renderGallery } from "./ui/gallery";
import { renderLive } from "./ui/live";
import { renderReplay } from "./ui/replay";

type View = { name: "live" } | { name: "gallery" } | { name: "replay"; id: string };

const app = document.getElementById("app")!;
let cleanup: () => void = () => {};

async function navigate(view: View) {
  cleanup();
  cleanup = () => {};
  document.querySelectorAll<HTMLButtonElement>("nav button").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === view.name || (view.name === "replay" && b.dataset.view === "gallery"));
  });
  switch (view.name) {
    case "live":
      cleanup = renderLive(app, SQUAT, (id) => navigate({ name: "replay", id }));
      break;
    case "gallery":
      await renderGallery(app, (id) => navigate({ name: "replay", id }));
      break;
    case "replay":
      cleanup = await renderReplay(app, view.id, () => navigate({ name: "gallery" }));
      break;
  }
}

document.querySelectorAll<HTMLButtonElement>("nav button").forEach((b) => {
  b.addEventListener("click", () => navigate({ name: b.dataset.view as "live" | "gallery" }));
});

void navigate({ name: "gallery" });
