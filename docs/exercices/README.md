# Bibliothèque d'exercices

Ce dossier est le document de travail avec les kinés partenaires. Pour chaque exercice, il fixe
**ce qui compte cliniquement** — c'est l'entrée du produit, et c'est là que se situe la vraie
difficulté (cf. cadrage). Le code (`src/scoring/exercise.ts`) ne fait que traduire ces pages en
seuils.

## Format d'une définition

Une définition d'exercice ne contient **aucun enregistrement de référence** : uniquement des
paramètres lisibles. Correspond à `ExerciseDefinition` dans le code.

| Champ | Sens | Qui le fixe |
|---|---|---|
| `primaryAngle` | Angle articulaire qui pilote le comptage des répétitions (gauche + droite, moyennés) | Dev, avec le kiné |
| `thresholds.rest` | Au-dessus de cet angle, le patient est en position de départ. Une rep commence quand on passe dessous | Kiné |
| `thresholds.target` | Amplitude cible : une rep est **complète** si l'angle minimal atteint est ≤ cette valeur | Kiné (prescription, ajustable par patient) |
| `minRepDurationMs` | Durée minimale d'une rep valide ; filtre les rebonds du signal | Dev |
| `asymmetryWarnDeg` | Écart gauche/droite au point bas au-delà duquel on signale une asymétrie | Kiné |
| `trunkLeanWarnDeg` | Inclinaison du tronc au-delà de laquelle on signale une compensation | Kiné |
| `instructions` | Consignes de placement affichées au patient (cadrage, position) — pas de consigne thérapeutique (ADR 0004) | Kiné + dev |

## Angles disponibles

Calculés en 3D à partir des coordonnées monde (mètres), donc indépendants de la taille du patient
et largement de la distance à la caméra.

| Clé | Définition | Points |
|---|---|---|
| `kneeL` / `kneeR` | angle hanche–genou–cheville | 23-25-27 / 24-26-28 |
| `hipL` / `hipR` | angle épaule–hanche–genou | 11-23-25 / 12-24-26 |
| `trunkLean` | angle du segment milieu des hanches → milieu des épaules par rapport à la verticale (0° = droit) | 23,24 → 11,12 |

À ajouter quand un exercice le demandera : épaule (abduction, flexion), coude, cheville (dorsiflexion), valgus du genou (projection frontale).

## Métriques produites par répétition

| Métrique | Calcul | Usage |
|---|---|---|
| Complète / incomplète | angle min ≤ `target` | Observance qualitative |
| Profondeur | angle pilote minimal | Amplitude, progression dans le temps |
| Asymétrie au point bas | \|gauche − droite\| au moment du minimum | Compensation latérale |
| Tronc max | inclinaison maximale sur la rep | Compensation du tronc |
| Durée | `tEnd − tStart` | Tempo (pas encore de cible de tempo) |

## Exercices

- [Squat](squat.md) — implémenté (démo)

## Questions pour les kinés partenaires

1. Pour chaque exercice : quelle amplitude cible est « la bonne » par défaut, et dans quelle plage le
   kiné veut-il pouvoir l'ajuster par patient ?
2. Quelles compensations sont cliniquement significatives, et à partir de quel seuil ? Lesquelles
   sont visibles avec une seule caméra ?
3. Le tempo (durée de descente / montée) est-il un critère qui compte ? Pour quels exercices ?
4. Quelle vue caméra est réaliste à domicile pour chaque exercice (profil, face, trois-quarts) ?
5. Que veut voir le kiné en premier dans le tableau de suivi : observance, amplitude, compensations ?
