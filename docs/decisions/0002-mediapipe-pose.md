# 0002 — MediaPipe Pose (BlazePose) comme moteur de pose estimation

**Statut** : Acceptée
**Date** : 2026-08-26

## Contexte

Le squelette doit être extrait en temps réel, entièrement on-device, à partir de la caméra d'un
téléphone milieu de gamme. Deux familles de modèles ouverts dominent : BlazePose (MediaPipe) et MoveNet.

## Options considérées

| Option | Points | Sortie | Pour | Contre |
|---|---|---|---|---|
| MediaPipe Pose / BlazePose (`pose_landmarker_lite`) | 33 | image normalisée **+ monde 3D (mètres)** | Coordonnées monde → angles articulaires 3D robustes au cadrage ; pieds et mains ; dispo web, Android, iOS avec la même API | Un peu plus lourd que MoveNet Lightning |
| MoveNet (Lightning / Thunder) | 17 | image 2D | Très rapide | Pas de 3D ; pas de pieds ni de mains, ce qui limite les compensations détectables |
| Modèle maison | — | — | Contrôle total | Aucune raison de le faire tant que MediaPipe suffit ; la compétence ML interne est mieux employée ailleurs |

## Décision

MediaPipe Tasks Vision, `PoseLandmarker`, modèle `lite`, délégué GPU, mode vidéo.
Les angles sont calculés sur les **coordonnées monde** ; les coordonnées image servent au dessin.

## Conséquences

- Runtime WASM et modèle chargés depuis les CDN officiels (≈ 5 Mo) ; à internaliser dans `/public`
  pour une version hors-ligne ou pour maîtriser les versions.
- `lite` reste le défaut, mais les trois variantes (`lite` / `full` / `heavy`, mêmes 33 points) sont
  sélectionnables depuis l'écran séance, avec le débit en fps, pour trancher sur un vrai téléphone
  (2026-08-27). La variante utilisée est enregistrée dans chaque séance (`poseModel`) pour que les
  comparaisons de précision restent interprétables. Ordres de grandeur annoncés par Google : `full`
  ≈ 1,5–2× plus lent que `lite`, `heavy` ≈ 3–5×.
- L'abstraction `PoseSource` permet de brancher un autre moteur si besoin, mais rien n'est prévu pour.
