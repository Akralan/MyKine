# MyCoach — démo mono-exercice (squat)

Démo web du usecase MyTwin « MyCoach » (voir `docs/cadrage/`) : pose estimation on-device,
scoring déterministe par angles articulaires, replay du mouvement en squelette.

## Lancer

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests unitaires (angles, compteur de reps)
npm run build
```

La caméra exige un contexte sécurisé : `localhost` fonctionne tel quel. Pour tester sur un
téléphone via le réseau local, il faut servir en HTTPS (ex. `@vitejs/plugin-basic-ssl`).

Le runtime WASM et le modèle `pose_landmarker_lite` sont chargés depuis les CDN officiels au
premier lancement (≈ 5 Mo, ensuite en cache navigateur).

## Décisions de cadrage prises pour la démo

- **Web, sans PWA, sans backend, sans intégration MyTwin.** Le portage dans l'app se fera en
  réécrivant uniquement l'adaptateur caméra/pose (`src/pose/mediapipe.ts`) ; tout le reste ne
  dépend que du modèle `Frame` (`src/pose/types.ts`).
- **Pas de ML pour le scoring.** Le ML est dans la pose estimation (MediaPipe / BlazePose).
  Le scoring est une machine à états sur des seuils d'angles, paramétrée par exercice
  (`src/scoring/exercise.ts`) — lisible, explicable, ajustable par un kiné sans réentraînement.
- **Mesures affichées, pas de consigne corrective**, pour rester hors périmètre dispositif
  médical tant que la question réglementaire n'est pas tranchée.
- **Aucune image stockée.** Seule la série temporelle de 33 points (coordonnées image + monde)
  est enregistrée, dans IndexedDB, en local.

## Documentation

- `docs/cadrage/` — pitch et cadrage initial du usecase.
- `docs/decisions/` — ADR : une page par décision structurante, avec les alternatives écartées.
- `docs/exercices/` — spécification de la bibliothèque d'exercices, à co-écrire avec les kinés partenaires.
- `docs/journal.md` — retours de tests réels et ajustements de seuils.

## Architecture

```
src/
  pose/       types.ts (Frame, PoseSource — indépendant du moteur)
              mediapipe.ts (adaptateur webcam → PoseLandmarker → Frame)
  geometry/   angles.ts (angles articulaires 3D, inclinaison tronc, lissage)
  scoring/    exercise.ts (définition paramétrée : seuils, tolérances)
              repCounter.ts (machine à états rest → down → up, métriques par rep)
  storage/    db.ts (IndexedDB via idb : séances = métadonnées + frames)
  ui/         live.ts (caméra + squelette + mesures temps réel)
              replay.ts (timeline scrub / lecture / vitesse / marqueurs de reps / courbe d'angle)
              gallery.ts (liste des séances locales)
              skeleton.ts (dessin en bâtons, interpolation entre frames)
```

## Métriques du squat

| Métrique | Calcul |
|---|---|
| Répétitions | angle genou (moyenne G/D) passe sous `rest` (160°) puis redépasse `rest` ; complète si le minimum ≤ `target` (100°) |
| Profondeur | angle genou minimal sur la rep |
| Asymétrie | \|genou G − genou D\| au point bas ; alerte > 12° |
| Tronc | angle hanches→épaules vs verticale ; alerte > 45° |

Les seuils sont dans `SQUAT` (`src/scoring/exercise.ts`) et sont à ajuster avec les kinés partenaires.
