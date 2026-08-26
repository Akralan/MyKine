# 0006 — Le squat comme premier exercice

**Statut** : Acceptée
**Date** : 2026-08-26

## Contexte

Le cadrage propose « un squat ou une abduction d'épaule » pour la démo mono-exercice.

## Options considérées

| Option | Pour | Contre |
|---|---|---|
| Squat | Angle pilote (genou) très lisible ; compensations évidentes et bien connues (valgus, tronc penché, asymétrie) ; corps entier dans le cadre | Exige un recul caméra suffisant |
| Abduction d'épaule | Fréquent en rééducation d'épaule | De face avec une seule caméra, la rotation du tronc fausse l'angle ; la 3D monde de BlazePose est moins fiable sur les bras levés |

## Décision

Squat. Métriques : répétitions (complètes / incomplètes), profondeur (angle genou min),
asymétrie genou G/D au point bas, inclinaison max du tronc.

Seuils initiaux (à ajuster en conditions réelles, voir `docs/journal.md`) :
repos 160°, cible 100°, rep ≥ 600 ms, alerte asymétrie > 12°, alerte tronc > 45°.

## Conséquences

- Le format de définition d'exercice est conçu pour un angle pilote unique ; une abduction d'épaule
  demandera d'ajouter les angles d'épaule et probablement une consigne de cadrage spécifique.
- Si les kinés partenaires travaillent surtout l'épaule, le deuxième exercice sera choisi avec eux.
