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
| `primaryAngle` | Angle articulaire qui pilote le comptage des répétitions. Moyenne gauche/droite sur un exercice bilatéral ; **côté le plus engagé** sur un exercice `unilateral` | Dev, avec le kiné |
| `direction` | `flexion` (l'angle diminue pendant l'effort : squat, fente) ou `extension` (il augmente : pont fessier, élévation) | Dev, avec le kiné |
| `thresholds.rest` | Côté repos de l'angle pilote : au-delà, le patient est en position de départ. Une rep commence quand on le franchit dans le sens du mouvement | Kiné |
| `thresholds.target` | Amplitude cible : une rep est **complète** si l'angle extrême atteint franchit cette valeur dans le sens du mouvement | Kiné (prescription, ajustable par patient) |
| `minRepDurationMs` | Durée minimale d'une rep valide ; filtre les rebonds du signal | Dev |
| `asymmetryWarnDeg` | Écart gauche/droite au point extrême au-delà duquel on signale une asymétrie. **Absent = la mesure n'a pas de sens ici** : elle n'est ni calculée ni affichée | Kiné |
| `trunkLeanWarnDeg` | Inclinaison du tronc au-delà de laquelle on signale une compensation. **Absent = même règle** | Kiné |
| `instructions` | Consignes de placement affichées au patient (cadrage, position) — pas de consigne thérapeutique (ADR 0004) | Kiné + dev |
| `zone` | Zone corporelle, utilisée par les filtres de la bibliothèque | Kiné |
| `status` | `validated` (relu par un kiné) ou `draft` (seuils proposés). L'UI affiche « à valider » pour les `draft` plutôt que de faire croire à une valeur validée | Kiné |
| `defaultDose` | Dose appliquée quand l'exercice est lancé depuis la bibliothèque, hors programme | Kiné |
| `unilateral` | La dose s'entend « par jambe » (fente) | Kiné |
| `depthLabel` / `depthShort` | Nom de la mesure d'amplitude affichée (« Profondeur », « Extension »…) | Kiné + dev |
| `sources` | D'où viennent les seuils. Une définition sans source n'a rien à faire dans la bibliothèque | Dev, puis kiné |

Le programme prescrit (`Prescription` dans `src/program/types.ts`) porte séparément `sets`, `reps`,
`holdMs` et, si le kiné veut individualiser, un `targetDeg` qui prend le pas sur le
`thresholds.target` de la définition. Voir ADR 0007.

## Convention d'angle — à lire avant de toucher à un seuil

Le code mesure l'**angle intérieur** entre deux segments, pas l'amplitude clinique lue au
goniomètre depuis le zéro anatomique. Pour le genou et la hanche :

```
angle intérieur = 180° − flexion clinique
```

Un genou tendu vaut **180°** dans le code et **0° de flexion** en goniométrie. Une flexion clinique
de 90° vaut 90° dans le code aussi — c'est le point fixe de la conversion, et la source de
confusion la plus probable. Une flexion de 117° vaut 63° dans le code.

Deux exceptions :

- **Épaule** (coude–épaule–hanche) : l'angle intérieur **est** l'élévation huméro-thoracique.
  0° bras le long du corps, 90° à l'horizontale, 180° bras à la verticale. Pas de conversion.
- **Cheville** (genou–cheville–pointe) : il n'existe pas de zéro anatomique correspondant. La
  valeur pied à plat dépend du placement du point « pointe de pied » par le modèle. Seuls les
  **écarts** sont interprétables, pas la valeur absolue. Voir la réserve sur la montée sur pointes.

## Angles disponibles

Calculés en 3D à partir des coordonnées monde (mètres), donc indépendants de la taille du patient
et largement de la distance à la caméra.

| Clé | Définition | Points |
|---|---|---|
| `kneeL` / `kneeR` | angle hanche–genou–cheville | 23-25-27 / 24-26-28 |
| `hipL` / `hipR` | angle épaule–hanche–genou | 11-23-25 / 12-24-26 |
| `shoulderL` / `shoulderR` | angle coude–épaule–hanche (0° bras le long du corps, 180° bras levé) | 13-11-23 / 14-12-24 |
| `ankleL` / `ankleR` | angle genou–cheville–pointe de pied | 25-27-31 / 26-28-32 |
| `trunkLean` | angle du segment milieu des hanches → milieu des épaules par rapport à la verticale (0° = droit) | 23,24 → 11,12 |

À ajouter quand un exercice le demandera : coude, dorsiflexion isolée, valgus du genou (projection frontale).

## Métriques produites par répétition

| Métrique | Calcul | Usage |
|---|---|---|
| Complète / incomplète | l'angle extrême franchit `target` dans le sens du mouvement | Observance qualitative |
| Amplitude | angle pilote extrême de la rep (minimal en flexion, maximal en extension) | Progression dans le temps |
| Asymétrie au point extrême | \|gauche − droite\| au moment de l'extremum | Compensation latérale |
| Tronc max | inclinaison maximale sur la rep | Compensation du tronc |
| Durée | `tEnd − tStart` | Tempo (pas encore de cible de tempo) |

## Exercices et origine des seuils

Les valeurs ci-dessous sont en **angle intérieur** (convention plus haut). La colonne « Origine »
dit d'où vient le nombre : c'est la seule qui compte pour la relecture par un kiné.

### Squat — genou, flexion · [fiche détaillée](squat.md)

| Seuil | Valeur | Origine |
|---|---|---|
| `rest` | 160° | Valeur d'origine du projet, marge pour éviter les faux départs. **À confirmer sur de vrais squats.** |
| `target` | 100° (= 80° de flexion clinique) | Valeur d'origine du projet. Repère : le pic mesuré sur squat unipodal chez l'adulte sain est de 86,7° ± 9,9° de flexion, soit 93° intérieur [1]. |
| `asymmetryWarnDeg` | 12° | Ordre de grandeur, **sans base clinique**. |
| `trunkLeanWarnDeg` | 45° | Ordre de grandeur, **sans base clinique**. |

### Fente avant — genou, flexion, unilatéral

| Seuil | Valeur | Origine |
|---|---|---|
| `rest` | 160° | Aligné sur le squat : debout, le genou est rarement lu à 180°. |
| `target` | 90° (= 90° de flexion clinique) | Repère de rééducation usuel « genou avant à 90° ». Le pic mesuré en fente avant chez l'adulte sain est de 117,3° ± 6,4° de flexion, soit 63° intérieur [1] : une fente ordinaire valide donc largement. |
| `asymmetryWarnDeg` | **absent** | L'écart gauche/droite est la nature de l'exercice, pas un défaut. La mesure est retirée, pas muselée par un seuil élevé. |
| `trunkLeanWarnDeg` | 30° | Ordre de grandeur, **sans base clinique**. |

L'angle pilote suit le **côté le plus fléchi**, pas la moyenne : sur une fente, moyenner la jambe
avant (~90°) et la jambe arrière (~170°) donnerait 130° et compterait toutes les reps incomplètes.

### Pont fessier — hanche, extension

| Seuil | Valeur | Origine |
|---|---|---|
| `rest` | 145° | Position de départ (allongé, genoux ~90°, bassin au sol) : 45 à 60° de flexion de hanche, soit 120 à 135° intérieur. 145° laisse le départ clairement du côté repos. Angle de genou de départ à 90° d'après [3]. |
| `target` | 170° | Critère de fin admis : le corps forme **une ligne droite épaule–hanche–genou** [2], soit 180° intérieur (extension de hanche à 0°, la position neutre du zéro neutre). 170° laisse 10° de tolérance de mesure plutôt que d'exiger la ligne parfaite. |
| `asymmetryWarnDeg` | 12° | Repris du squat, **sans base clinique propre**. |
| `trunkLeanWarnDeg` | **absent** | Allongé, `trunkLean` vaut ~90° en permanence par construction (le segment hanches→épaules est horizontal). Afficher ce chiffre au patient n'aurait aucun sens. |

### Élévation d'épaule — épaule, extension

| Seuil | Valeur | Origine |
|---|---|---|
| `rest` | 30° | Bras le long du corps, on lit 10 à 15° ; 30° est franchement au-dessus du bruit de mesure. |
| `target` | 90° | Les protocoles de rééducation d'épaule limitent explicitement l'élévation à 90°, l'horizontale [4]. Amplitude d'abduction normale : 0–180° au zéro neutre. |
| `asymmetryWarnDeg` | 15° | Ordre de grandeur, **sans base clinique**. |
| `trunkLeanWarnDeg` | 20° | Ordre de grandeur, **sans base clinique**. |

### Montée sur pointes — cheville, extension

**Réserve majeure.** C'est le seul exercice dont l'origine de l'échelle n'est pas ancrée.

| Seuil | Valeur | Origine |
|---|---|---|
| `rest` | 100° | **Non sourcé.** L'angle genou–cheville–pointe n'a pas de zéro anatomique correspondant : sa valeur pied à plat dépend du placement du point « pointe de pied » par le modèle, le moins fiable de BlazePose. À recalibrer sur de vraies frames. |
| `target` | 125° | Seul l'**écart** cible − repos est sourcé : +25°, borne basse de l'amplitude de flexion plantaire (25–30° [5], 40–50° au zéro neutre). |
| `asymmetryWarnDeg` | 10° | Ordre de grandeur, **sans base clinique**. |
| `trunkLeanWarnDeg` | 20° | Ordre de grandeur, **sans base clinique**. |

Deux raisons de la retirer de la bibliothèque tant qu'elle n'est pas calibrée : l'amplitude utile
ne fait que quelques degrés, et elle repose sur les points les moins fiables du modèle — le journal
note déjà que l'ancrage cheville saute en vue 3D.

## Ce qui reste sans source

À dire tel quel aux kinés partenaires plutôt que de le laisser passer pour acquis :

- **Tous les seuils d'asymétrie et d'inclinaison du tronc** sont des ordres de grandeur. Aucun n'a
  de base clinique. Ce sont les premiers à faire trancher.
- **Aucun seuil n'a été confronté à de vraies frames.** La littérature donne des amplitudes
  articulaires mesurées en laboratoire de marche ; elle ne dit pas ce que BlazePose lit sur un
  téléphone posé au sol dans un salon. L'écart entre les deux est inconnu à ce jour.
- Les tests unitaires du compteur jouent des trajectoires synthétiques construites à partir de ces
  mêmes hypothèses. Ils valident la machine à états, **pas les seuils** : ils sont circulaires par
  rapport à eux.

## Sources

1. *Joint Kinetics and Kinematics During Common Lower Limb Rehabilitation Exercises* — pics de
   flexion du genou et de la hanche sur squat unipodal, fente avant et fente arrière (n = 9 adultes
   sains). Zéro défini comme la station debout anatomique.
   <https://pmc.ncbi.nlm.nih.gov/articles/PMC4641539/>
2. *Bridging* — Physiopedia. Position de départ et critère de fin du pont fessier.
   <https://www.physio-pedia.com/Bridging>
3. *Effects of knee flexion angles in supine bridge exercise on trunk and pelvic muscle activity* —
   angle de genou de référence du pont (60° / 90° / 120°).
   <https://pubmed.ncbi.nlm.nih.gov/32567954/>
4. *Rotator Cuff & Scapular Strengthening for the Shoulder* — Massachusetts General Hospital.
   Élévation limitée à 90° dans les exercices de flexion / abduction / scaption.
   <https://www.massgeneral.org/assets/MGH/pdf/orthopaedics/sports-medicine/dr-price/HEP-for-shoulder.pdf>
5. *Consideration of the Relationship Between Ankle Plantarflexor Strength and Single-leg Heel
   Raises* — World Physiotherapy. Amplitude de flexion plantaire.
   <https://world.physio/congress-proceeding/consideration-relationship-between-ankle-plantarflexor-strength-and-single-leg>

## Questions pour les kinés partenaires

1. Pour chaque exercice : quelle amplitude cible est « la bonne » par défaut, et dans quelle plage le
   kiné veut-il pouvoir l'ajuster par patient ?
2. Quelles compensations sont cliniquement significatives, et à partir de quel seuil ? Lesquelles
   sont visibles avec une seule caméra ?
3. Le tempo (durée de descente / montée) est-il un critère qui compte ? Pour quels exercices ?
4. Quelle vue caméra est réaliste à domicile pour chaque exercice (profil, face, trois-quarts) ?
5. Que veut voir le kiné en premier dans le tableau de suivi : observance, amplitude, compensations ?
