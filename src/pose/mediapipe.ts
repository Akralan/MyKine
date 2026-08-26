import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { LANDMARK_COUNT, type Frame, type PoseSource } from "./types";

// Runtime WASM et modèle chargés depuis les CDN officiels. Pour une version
// hors-ligne, copier `node_modules/@mediapipe/tasks-vision/wasm` et le .task dans /public.
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

/** Chargement unique du modèle (≈ 5 Mo, mis en cache par le navigateur). */
export function loadLandmarker(): Promise<PoseLandmarker> {
  landmarkerPromise ??= FilesetResolver.forVisionTasks(WASM_URL).then((fileset) =>
    PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
    }),
  );
  return landmarkerPromise;
}

/**
 * Source de pose branchée sur la webcam. Émet une `Frame` par image traitée.
 * Le `<video>` est fourni par l'UI (il sert aussi à l'affichage).
 */
export class CameraPoseSource implements PoseSource {
  private stream: MediaStream | null = null;
  private running = false;
  private rafId = 0;

  constructor(private readonly video: HTMLVideoElement) {}

  async start(onFrame: (frame: Frame) => void): Promise<void> {
    const landmarker = await loadLandmarker();
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    this.video.srcObject = this.stream;
    await this.video.play();

    this.running = true;
    const t0 = performance.now();
    let lastVideoTime = -1;

    const loop = () => {
      if (!this.running) return;
      if (this.video.currentTime !== lastVideoTime) {
        lastVideoTime = this.video.currentTime;
        const now = performance.now();
        const result = landmarker.detectForVideo(this.video, now);
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

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
  }
}
