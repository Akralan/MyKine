# 0005 — Stockage local IndexedDB, série de points uniquement

**Statut** : Acceptée
**Date** : 2026-08-26

## Contexte

La démo doit conserver les séances pour le replay et une mini galerie, en local, sans backend.
Le cadrage pose un principe fort : aucune image du patient ne quitte son téléphone.

## Options considérées

| Option | Pour | Contre |
|---|---|---|
| `localStorage` | Trivial | Limité à ~5 Mo, chaînes uniquement : une séance d'une minute pèse 0,5 à 1 Mo en JSON → une dizaine de séances max |
| IndexedDB (via `idb`) | Pas de limite pratique, stocke des `Float32Array` nativement, index par date | Un peu plus d'API, asynchrone |
| Fichiers téléchargés | Portable | Pas de galerie intégrée |

## Décision

IndexedDB, base `mycoach`, store `sessions` indexé par `createdAt`.
Une séance = métadonnées (exercice, date, durée, reps, synthèse) + frames.
Une frame = `t` + 33 × (x, y, z, visibilité) image + 33 × (x, y, z) monde, en `Float32Array`
(≈ 0,9 Ko/frame, ≈ 1,6 Mo par minute à 30 fps).

**Aucune image, aucune vidéo, ni en mémoire au-delà de la frame courante, ni sur disque.**

## Conséquences

- Le replay et la vue kiné n'ont besoin que de ce format ; c'est aussi le format à transmettre au
  backend MyTwin le jour où le suivi remonte au kiné.
- La galerie liste sans charger les frames (projection sur les métadonnées).
- Pas de migration de schéma prévue ; la version de base est `1`. À bumper avec une fonction
  `upgrade` si le format de `Frame` change.
