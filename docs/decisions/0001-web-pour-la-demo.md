# 0001 — Démo en web, sans PWA ni intégration MyTwin

**Statut** : Acceptée
**Date** : 2026-08-26

## Contexte

Le cadrage propose une démo mono-exercice à mettre entre les mains d'un kiné le plus vite possible.
Il faut choisir sur quoi la construire, sachant que la cible finale est l'app MyTwin (multi-usecases).

## Options considérées

| Option | Pour | Contre |
|---|---|---|
| Web (Vite + TypeScript, MediaPipe Tasks JS) | Zéro install, démo partageable par un lien, itération très rapide, replay kiné dans le même code | Perfs moindres que le natif sur téléphone bas de gamme ; pas encore « dans MyTwin » |
| Intégration directe dans la stack mobile MyTwin | Directement dans l'app cible | On paie l'intégration (auth, GraphQL, consentements) avant d'avoir validé le produit ; cycle d'itération lent |
| Prototype Python desktop (OpenCV + MediaPipe) | Le plus rapide pour le scoring | Pas montrable à un kiné sur téléphone ; à réécrire entièrement |

## Décision

Web, en TypeScript vanilla, sans framework, sans PWA (pas de besoin hors-ligne pour la démo), sans backend.
La logique métier (angles, scoring, replay, stockage) est isolée de MediaPipe derrière le modèle
`Frame` / `PoseSource` (`src/pose/types.ts`) : le portage vers MyTwin réécrit l'adaptateur caméra/pose,
pas le reste.

## Conséquences

- Le code métier est testable unitairement en Node, sans navigateur ni caméra.
- Pour tester sur téléphone en réseau local, il faut servir en HTTPS (contrainte `getUserMedia`).
- La PWA (installation, hors-ligne, cache du modèle) reste possible plus tard sans refonte.
- La stack mobile MyTwin devra être identifiée avant le portage (décision à prendre).
