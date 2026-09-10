import { DEMO_PROGRAM } from "./program/demo";
import { workoutForExercise, workoutFromProgram, type Workout } from "./program/runner";
import type { ExerciseDefinition } from "./scoring/exercise";
import { renderExercises } from "./ui/exercises";
import { renderHistory } from "./ui/history";
import { renderHome } from "./ui/home";
import { renderLive } from "./ui/live";
import { renderProfile } from "./ui/profile";
import { renderReplay } from "./ui/replay";
import type { TabName } from "./ui/shell";
import { renderSummary } from "./ui/summary";

type View =
  | { name: TabName }
  | { name: "live"; workout: Workout }
  | { name: "summary"; workout: Workout }
  | { name: "replay"; id: string; back: View };

const app = document.getElementById("app")!;
const program = DEMO_PROGRAM;
let cleanup: () => void = () => {};

async function navigate(view: View): Promise<void> {
  cleanup();
  cleanup = () => {};
  const tab = (t: TabName) => void navigate({ name: t });

  switch (view.name) {
    case "home":
      cleanup = await renderHome(app, program, tab, (startIndex) => {
        const workout = workoutFromProgram(program);
        workout.index = Math.min(startIndex, Math.max(0, workout.items.length - 1));
        void navigate({ name: "live", workout });
      });
      break;

    case "exercises":
      cleanup = await renderExercises(app, program, tab, (def: ExerciseDefinition) => {
        void navigate({ name: "live", workout: workoutForExercise(def, program) });
      });
      break;

    case "history":
      cleanup = await renderHistory(app, program, tab, (id) => {
        void navigate({ name: "replay", id, back: { name: "history" } });
      });
      break;

    case "profile":
      cleanup = await renderProfile(app, program, tab, () => void navigate({ name: "profile" }));
      break;

    case "live":
      cleanup = renderLive(
        app,
        view.workout,
        () => void navigate({ name: "summary", workout: view.workout }),
        () => void navigate({ name: "home" }),
      );
      break;

    case "summary":
      cleanup = await renderSummary(app, view.workout, {
        onNext: () => {
          view.workout.index += 1;
          void navigate({ name: "live", workout: view.workout });
        },
        onReplay: (id) => void navigate({ name: "replay", id, back: view }),
        onFinish: () => void navigate({ name: "home" }),
      });
      break;

    case "replay":
      cleanup = await renderReplay(app, view.id, () => void navigate(view.back));
      break;
  }
}

void navigate({ name: "home" });
