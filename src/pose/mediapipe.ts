import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { LANDMARK_COUNT, type Frame, type PoseSource } from "./types";

// Runtime WASM et modèle chargés depuis les CDN officiels. Pour une version
// hors-ligne, copier `node_modules/@mediapipe/tasks-vision/wasm` et le .task dans /public.
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";

/** Les trois variantes de BlazePose : même architecture, mêmes 33 points, précision et coût croissants. */
export type PoseModel = "lite" | "full" | "heavy";

export const POSE_MODELS: Record<PoseModel, { label: string; hint: string }> = {
  lite: { label: "Lite", hint: "≈ 5 Mo, le plus rapide" },
  full: { label: "Full", hint: "≈ 9 Mo, meilleur compromis" },
  heavy: { label: "Heavy", hint: "≈ 30 Mo, le plus précis, lent sur mobile" },
};

export const DEFAULT_POSE_MODEL: PoseModel = "lite";

export function isPoseModel(v: unknown): v is PoseModel {
  return typeof v === "string" && v in POSE_MODELS;
}

function modelUrl(model: PoseModel): string {
  return `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${model}/float16/latest/pose_landmarker_${model}.task`;
}

let filesetPromise: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null;
const landmarkers = new Map<PoseModel, Promise<PoseLandmarker>>();

/** Chargement unique par variante (le .task est mis en cache par le navigateur). */
export function loadLandmarker(model: PoseModel = DEFAULT_POSE_MODEL): Promise<PoseLandmarker> {
  filesetPromise ??= FilesetResolver.forVisionTasks(WASM_URL);
  let p = landmarkers.get(model);
  if (!p) {
    p = filesetPromise.then((fileset) =>
      PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: modelUrl(model), delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      }),
    );
    p.catch(() => landmarkers.delete(model)); // permettre une nouvelle tentative après un échec réseau
    landmarkers.set(model, p);
  }
  return p;
}

/**
 * Source de pose branchée sur la webcam. Émet une `Frame` par image traitée.
 * Le `<video>` est fourni par l'UI (il sert aussi à l'affichage).
 */
export class CameraPoseSource implements PoseSource {
  private stream: MediaStream | null = null;
  private landmarker: PoseLandmarker | null = null;
  private running = false;
  private rafId = 0;

  constructor(
    private readonly video: HTMLVideoElement,
    private model: PoseModel = DEFAULT_POSE_MODEL,
  ) {}

  /** Charge une autre variante et bascule dessus ; la caméra continue de tourner pendant le chargement. */
  async setModel(model: PoseModel): Promise<void> {
    this.model = model;
    const lm = await loadLandmarker(model);
    // Si l'utilisateur a changé d'avis pendant le chargement, ne pas écraser le dernier choix.
    if (this.model === model) this.landmarker = lm;
  }

  async start(onFrame: (frame: Frame) => void): Promise<void> {
    this.landmarker = await loadLandmarker(this.model);
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    await this.applyMinZoom();
    this.video.srcObject = this.stream;
    await this.video.play();

    this.running = true;
    const t0 = performance.now();
    let lastVideoTime = -1;

    const loop = () => {
      if (!this.running) return;
      if (this.video.currentTime !== lastVideoTime && this.landmarker) {
        lastVideoTime = this.video.currentTime;
        const now = performance.now();
        const result = this.landmarker.detectForVideo(this.video, now);
        const norm = result.landmarks[0];
        const world = result.worldLandmarks[0];
        if (norm && world && norm.length === LANDMARK_COUNT) {
          const frame: Frame = {
            t: now - t0,
            norm: new Float32Array(LANDMARK_COUNT * 4),
            world: new Float32Array(LANDMARK_COUNT * 3),
          };
          for (let i = 0; i < LANDMARK_COUNT; i++) {
            const n = norm[i]!, w = world[i]!;
            frame.norm[i * 4] = n.x;
            frame.norm[i * 4 + 1] = n.y;
            frame.norm[i * 4 + 2] = n.z;
            frame.norm[i * 4 + 3] = n.visibility ?? 1;
            frame.world[i * 3] = w.x;
            frame.world[i * 3 + 1] = w.y;
            frame.world[i * 3 + 2] = w.z;
          }
          onFrame(frame);
        }
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  /**
   * Dézoom maximal si la caméra expose une contrainte `zoom` (pas standardisée
   * dans les types DOM, d'où le cast). Ignoré silencieusement sinon.
   */
  private async applyMinZoom(): Promise<void> {
    const track = this.stream?.getVideoTracks()[0];
    if (!track) return;
    const caps = track.getCapabilities() as MediaTrackCapabilities & { zoom?: { min: number } };
    if (caps.zoom === undefined) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: caps.zoom.min } as MediaTrackConstraintSet] });
    } catch {
      /* caméra sans zoom réglable */
    }
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
  }
}
