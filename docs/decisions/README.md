# Décisions d'architecture (ADR)

Une page par décision structurante : contexte, options considérées, choix, conséquences.
Une décision n'est jamais modifiée après coup — on en écrit une nouvelle qui remplace l'ancienne.

| # | Titre | Statut | Date |
|---|---|---|---|
| [0001](0001-web-pour-la-demo.md) | Démo en web, sans PWA ni intégration MyTwin | Acceptée | 2026-08-26 |
| [0002](0002-mediapipe-pose.md) | MediaPipe Pose (BlazePose) comme moteur de pose estimation | Acceptée | 2026-08-26 |
| [0003](0003-scoring-par-seuils-sans-ml.md) | Scoring déterministe par angles et seuils, sans ML | Acceptée | 2026-08-26 |
| [0004](0004-mesures-sans-consigne-corrective.md) | La démo affiche des mesures, pas de consigne corrective | Acceptée | 2026-08-26 |
| [0005](0005-stockage-indexeddb-sans-image.md) | Stockage local IndexedDB, série de points uniquement | Acceptée | 2026-08-26 |
| [0006](0006-squat-premier-exercice.md) | Le squat comme premier exercice | Acceptée | 2026-08-26 |
| [0007](0007-programme-prescrit-code-en-dur.md) | Le programme prescrit est codé en dur pour la démo | Acceptée | 2026-09-10 |

## Décisions à prendre (issues du cadrage)

- Positionnement réglementaire de la V1 (dispositif médical / MDR).
- Où vit le côté kiné (interface web adossée au backend MyTwin ?).
- Statut du projet : usecase MyTwin ou produit en propre.
- Cible du portage : stack mobile MyTwin.

## Modèle

```markdown
# NNNN — Titre

**Statut** : Proposée | Acceptée | Remplacée par NNNN
**Date** : AAAA-MM-JJ

## Contexte
## Options considérées
## Décision
## Conséquences
```
