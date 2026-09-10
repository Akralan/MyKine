import { DEFAULT_POSE_MODEL, isPoseModel, type PoseModel } from "../pose/mediapipe";

const MODEL_KEY = "mycoach.poseModel";

/** Variante BlazePose choisie par l'utilisateur (écran Profil), mémorisée entre les séances. */
export function preferredModel(): PoseModel {
  try {
    const v = localStorage.getItem(MODEL_KEY);
    return isPoseModel(v) ? v : DEFAULT_POSE_MODEL;
  } catch {
    return DEFAULT_POSE_MODEL;
  }
}

export function setPreferredModel(m: PoseModel): void {
  try {
    localStorage.setItem(MODEL_KEY, m);
  } catch {
    /* stockage indisponible : le choix vaut pour cette session seulement */
  }
}
