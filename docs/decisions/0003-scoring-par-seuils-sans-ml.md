# 0003 — Scoring déterministe par angles et seuils, sans ML

**Statut** : Acceptée
**Date** : 2026-08-26

## Contexte

Le cadrage insiste : le cœur du produit n'est pas le squelette mais ce qu'on en tire, et le score doit
être un ensemble de critères lisibles, explicables au patient comme au kiné. Il fallait décider si
l'évaluation du geste passe par un modèle appris ou par des règles.

## Options considérées

| Option | Pour | Contre |
|---|---|---|
| Règles : angles articulaires + machine à états + seuils par exercice | Déterministe, testable, explicable (« 87°, cible 90° »), paramétrable par le kiné sans réentraînement, aucun dataset requis | Ne capte pas les compensations subtiles ou temporelles |
| Similarité à un enregistrement de référence (DTW, distance de poses) | Simple à mettre en place | Fragile (morphologie, cadrage, vitesse), score opaque, une référence par exercice à maintenir |
| Classifieur appris (bon / mauvais geste) | Peut capter des compensations fines | Demande un dataset annoté par des kinés qu'on n'a pas ; boîte noire ; incompatible avec la promesse d'explicabilité |

## Décision

Pas de ML dans le scoring. Le ML est confiné à la pose estimation (ADR 0002).

- Les angles sont calculés en 3D monde (`src/geometry/angles.ts`), ce qui les rend indépendants de
  la morphologie et largement du cadrage.
- Chaque exercice est une définition paramétrée (`src/scoring/exercise.ts`) : angle pilote, seuil de
  repos, seuil cible, durée minimale d'une rep, tolérances d'alerte.
- Le compteur (`src/scoring/repCounter.ts`) est une machine à états `rest → down → up` qui produit,
  par rep, des métriques nommées : profondeur, asymétrie au point bas, inclinaison max du tronc.

## Conséquences

- Les seuils cliniques sont la vraie difficulté et doivent être fixés avec les kinés partenaires
  (voir `docs/exercices/`).
- La détection de compensations fines (valgus léger, rythme) pourra justifier une brique apprise
  plus tard, mais **en complément** des critères lisibles, jamais à leur place.
- Le même moteur tourne en live et sur les frames stockées : un replay recalcule exactement ce que
  le patient a vu.
