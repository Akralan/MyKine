# Journal du projet

Retours de tests réels, ajustements de seuils, problèmes rencontrés, décisions du quotidien.
Entrées datées, plus récentes en haut. Les décisions structurantes vont dans `docs/decisions/`.

---

## 2026-09-10 (suite) — Seuils des nouveaux exercices : inventés, puis repris sur littérature

**Contexte** : les quatre exercices ajoutés par la refonte (fente, pont fessier, élévation
d'épaule, montée sur pointes) avaient des seuils que j'avais posés au jugé, sans source. Question
posée en revue : « d'où viennent ces données ? ». Réponse : de nulle part. Corrigé.

**Ce qui était faux, et pourquoi**

- **Élévation d'épaule** : `target` à 150° alors que la consigne affichée disait « jusqu'à
  l'horizontale ». Toute rep correcte aurait été comptée incomplète. → 90°, l'élévation limite des
  protocoles d'épaule.
- **Pont fessier** : `rest` à 120° alors que la position de départ (allongé, genoux ~90°) se lit
  déjà autour de 120–135° — la machine se serait crue en mouvement dès le départ. → repos 145°,
  cible 170° (10° de tolérance sous la ligne droite épaule–hanche–genou, le critère admis).
- **Fente avant** : `target` à 105° (= 75° de flexion clinique), trop peu profond face au repère
  usuel « genou avant à 90° ». → 90°. Le pic mesuré chez l'adulte sain est de 117,3° ± 6,4° de
  flexion, donc une fente ordinaire valide largement.

**Deux mesures qui n'avaient pas de sens, retirées plutôt que muselées**

- L'asymétrie sur la **fente** : j'avais monté le seuil à 25° pour qu'elle ne se déclenche jamais.
  C'était un bâillon. `asymmetryWarnDeg` est maintenant optionnel : absent = mesure ni calculée ni
  affichée.
- L'inclinaison du tronc sur le **pont fessier** : allongé, `trunkLean` vaut ~90° en permanence par
  construction. La tuile aurait affiché un chiffre décoratif au patient pendant tout l'exercice.
  Retirée de la même façon.

**Une erreur de fond corrigée au passage**

L'angle pilote d'un exercice **unilatéral** était la moyenne gauche/droite. Sur une fente, moyenner
la jambe avant (~90°) et la jambe arrière (~170°) donne 130° : toutes les reps auraient été
comptées incomplètes. Le compteur suit maintenant le côté le plus engagé dans le sens du mouvement
pour les exercices `unilateral`, la moyenne restant la règle pour les bilatéraux (plus robuste au
bruit d'un côté mal vu).

**Ajusté** : aucun seuil du squat. Sa cible de 100° est cohérente avec le pic de 86,7° ± 9,9° de
flexion mesuré sur squat unipodal (soit 93° intérieur), mais la valeur reste celle d'origine.

**Convention posée** : `angle intérieur = 180° − flexion clinique` pour le genou et la hanche, avec
deux exceptions documentées (l'épaule est directement l'élévation huméro-thoracique ; la cheville
n'a pas de zéro anatomique correspondant). C'est la confusion la plus probable pour la suite — elle
est maintenant écrite en tête de `docs/exercices/README.md` et dans `ExerciseDefinition`.

**Ce qui reste sans source, et qu'il faut dire aux kinés**

- Tous les seuils d'asymétrie et d'inclinaison du tronc, squat compris, sont des ordres de
  grandeur. Aucune base clinique.
- L'origine de l'échelle de la **montée sur pointes** n'est pas ancrée : l'angle
  genou–cheville–pointe n'a pas de zéro anatomique, et sa valeur pied à plat dépend du placement
  du point de pointe de pied par le modèle. Seul l'écart cible − repos (+25°) est sourcé. Candidate
  au retrait tant qu'elle n'est pas calibrée.
- **Aucun seuil n'a été confronté à de vraies frames.** La littérature donne des amplitudes de
  laboratoire ; elle ne dit rien de ce que BlazePose lit sur un téléphone posé au sol dans un
  salon. Les tests unitaires jouent des trajectoires synthétiques bâties sur ces mêmes hypothèses :
  ils valident la machine à états, pas les seuils.

**À suivre** : filmer une passe de chaque exercice, lire les traces d'angle réelles, recaler.
C'est la seule chose qui transformera ces définitions en mesures.

---

## 2026-09-10 — Refonte UI/UX : parcours patient en six écrans

**Contexte** : maquette « Refonte UI/UX santé » (Claude Design), design system blanc / teal
`#0d9488`. Implémentation à l'identique demandée : couleurs, placements, typographies, rayons.

**Fait**
- Design system CSS repris de la maquette valeur par valeur ; polices Plus Jakarta Sans + IBM Plex
  Mono. Cadre 390 × 844 avec rayon et ombre sur desktop, plein écran sur téléphone.
- Six écrans : accueil, sélection d'exercice, séance live, fin de séance, replay, historique.
  Plus un écran Profil, quatrième onglet de la maquette qui n'y est pas dessiné.
- Notion de programme prescrit, de séance multi-exercices et de séries (ADR 0007). Le programme
  est codé en dur dans `src/program/demo.ts` ; **l'avancement affiché est dérivé d'IndexedDB**,
  pas figé.
- Bibliothèque portée à cinq exercices. Le compteur de reps gère maintenant les mouvements en
  **extension** (l'angle monte pendant l'effort) en plus des flexions, par changement de signe de
  l'angle pilote et des seuils : une seule machine à états pour les deux cas.
- Angles ajoutés : épaule (coude–épaule–hanche) et cheville (genou–cheville–pointe).
- La sélection d'exercice lance l'exercice directement, avec la dose prescrite si elle existe,
  sinon la dose par défaut de l'exercice.
- Le sélecteur Lite / Full / Heavy a quitté l'écran de séance pour le Profil, avec l'effacement
  des données locales (ADR 0005 rendu actionnable).
- 43 tests (angles, compteur de reps en flexion et en extension, dérivation de l'avancement).

**Ajusté** : aucun seuil du squat. Les seuils des quatre nouveaux exercices sont des valeurs de
départ, marquées « à valider » dans l'UI comme dans `docs/exercices/`.

**Réserves à porter à la discussion**
- Écran de séance : le téléphone est posé à 2–3 m, les tuiles de mesures (10 / 19 px) et le bandeau
  d'alerte (13 px) sont sous la limite de lisibilité à cette distance. Seul le compteur en 76 px
  passe. À trancher : comptage audio et allègement du live, ou on assume que le détail se lit à la
  fin de la série.
- ADR 0004 : le bandeau orange « Tronc penché à 48° — mesure, pas une consigne » dit « mesure »
  mais code visuellement une alerte. Trancher entre « la cible vient du kiné, donc c'est un
  objectif d'exercice » et un amendement de l'ADR.
- Montée sur pointes : repose sur les points de pied, les moins fiables du modèle, pour quelques
  degrés d'amplitude. Candidat à retirer de la bibliothèque.

**À suivre**
- Faire une vraie séance complète sur téléphone : décompte, trois séries, enchaînement d'exercices.
- Vérifier que le pont fessier (allongé au sol, téléphone posé de profil) donne un `hipL`/`hipR`
  exploitable — c'est la vue caméra la moins testée.
- Toujours à faire : valider `rest` / `target` / `alpha` du squat sur de vrais squats.

---

## 2026-08-26 (soir) — Premiers tests caméra, PC et téléphone

**Contexte** : webcam PC dans une petite pièce, puis téléphone (caméra frontale) via le réseau local.

**Observé**
- Webcam PC trop zoomée pour avoir le corps entier : ajout d'un dézoom logiciel (contrainte `zoom`
  au minimum si la caméra l'expose) — pas suffisant, le téléphone en grand-angle est la vraie cible.
- Test téléphone : il a fallu passer le serveur en HTTPS (`@vitejs/plugin-basic-ssl`) et ouvrir le
  port 5173 dans le pare-feu Windows. `ERR_EMPTY_RESPONSE` = URL en `http` au lieu de `https`.
- Mise en page initiale (vidéo dans un petit rectangle + panneau latéral) inutilisable sur
  téléphone : refonte en caméra plein cadre, mesures en surimpression en haut, consignes repliables
  et boutons en bas.
- Replay déformé pour une séance filmée en portrait : le format de la vidéo est maintenant stocké
  avec la séance (`aspectRatio`) et respecté au replay.
- Première vue 3D (coordonnées monde) : le patient « flottait et se mettait en boule », parce que
  MediaPipe recentre les coordonnées monde sur les hanches à chaque frame. Corrigé en ancrant le
  squelette au milieu des chevilles, posé sur une grille de sol.

**Ajusté** : aucun seuil pour l'instant — pas encore de série de squats analysée.

**À suivre**
- Stabilité des pieds en vue 3D (si une cheville saute, l'ancrage saute avec) → lisser l'ancrage si besoin.
- Qualité de la profondeur du modèle `lite` vue de profil ; passer à `full` si les jambes se tordent.
- Toujours à faire : valider `rest` / `target` / `alpha` sur de vrais squats.

---

## 2026-08-26 — Squelette de la démo posé

**Fait**
- Projet Vite + TypeScript initialisé ; MediaPipe Tasks Vision 1.0.1, `idb` 8.
- Pipeline complet : caméra → `Frame` → angles 3D → `RepCounter` → UI live ; enregistrement des
  frames ; sauvegarde IndexedDB ; galerie ; replay avec timeline (scrub, vitesse, marqueurs de
  reps, courbe d'angle genou).
- 19 tests unitaires (angles, lissage, compteur de reps sur trajectoires synthétiques).
- ADR 0001 à 0006 rédigés.

**Pas encore fait**
- Aucun test en conditions réelles (caméra, vrais squats). Les seuils du squat sont des valeurs
  de départ.

**À vérifier au premier test réel**
- Le genou « debout » plafonne-t-il sous 160° selon la vue ? → ajuster `rest`.
- Le compteur double-t-il des reps (lissage trop faible) ou en rate-t-il (trop fort) ? → `alpha`
  du `AngleSmoother`, actuellement 0,5.
- `trunkLean` est-il crédible de face comme de profil ?
- Fréquence d'inférence obtenue sur un téléphone milieu de gamme avec le modèle `lite` + GPU.

---

## Modèle d'entrée

```markdown
## AAAA-MM-JJ — Titre

**Contexte** : appareil, navigateur, vue caméra, qui teste.
**Observé** :
**Ajusté** : paramètre, ancienne → nouvelle valeur, pourquoi.
**À suivre** :
```
