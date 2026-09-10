# 0007 — Le programme prescrit est codé en dur pour la démo

**Statut** : Acceptée
**Date** : 2026-09-10

## Contexte

La refonte UI/UX introduit trois notions que la démo n'avait pas : un **programme prescrit**
(« Genou · Semaine 3 », 5 séances par semaine, une dose par exercice), une **séance composée de
plusieurs exercices**, et chaque exercice fait **en plusieurs séries**. L'accueil affiche la séance
du jour et l'avancement, l'écran de séance affiche « série 1/3 » et « 8 / 12 reps ».

Quelqu'un doit créer ce programme. Or la décision ouverte « où vit le côté kiné » n'est pas
tranchée : il n'existe ni interface kiné, ni backend, ni compte patient (ADR 0001).

## Options considérées

1. **Écrire les valeurs directement dans les écrans.** Le plus rapide. Mais « 3 séries »,
   « semaine 3 », « 3/5 séances » se retrouvent dispersés dans l'UI ; le jour où le programme
   vient d'ailleurs, il faut réécrire les écrans, pas seulement la source de données.
2. **Une constante de données isolée, du même type que ce que renverra l'interface kiné.**
   Le programme est un objet sérialisable dans un seul module ; le reste du code ne connaît que
   le type, jamais les valeurs.
3. **Construire l'interface kiné maintenant.** Cohérent à terme, mais c'est un chantier entier
   (backend, comptes, authentification, périmètre réglementaire) alors que la démo doit d'abord
   être montrable à des kinés pour valider les seuils.

## Décision

Option 2. `src/program/demo.ts` contient `DEMO_PROGRAM` et c'est **le seul endroit du code qui
décide d'une dose, d'une durée de programme ou d'un rythme hebdomadaire**. Les écrans lisent le
type `Program` (`src/program/types.ts`), jamais des valeurs en dur.

Corollaire tout aussi important : **seul le programme est codé en dur, jamais l'avancement.**
« Semaine 3 », « 3 / 5 séances », les cases cochées de la semaine, les exercices déjà faits du
jour et la courbe de progression sont tous dérivés des séances réellement enregistrées dans
IndexedDB (`src/program/progress.ts`). Une démo qui affiche un avancement figé se contredit dès
la deuxième répétition faite devant un kiné.

La date de début du programme est ancrée au premier lancement, reculée de deux semaines pleines
pour que la démo s'ouvre en « Semaine 3 » comme la maquette, puis avance réellement avec le temps.

## Conséquences

- Remplacer le programme par une source distante = remplacer `DEMO_PROGRAM` par une lecture qui
  renvoie un `Program`. Aucun écran à modifier.
- Une séance en base = **une série**. Les entrées d'une même séance partagent un `workoutId`, et
  `setIndex` / `setCount` situent la série dans l'exercice. Les séances enregistrées avant cette
  décision n'ont pas ces champs : elles sont traitées comme des séries isolées, sans migration.
- La prescription peut fixer une amplitude cible par patient (`targetDeg`), qui prend le pas sur
  le seuil de la définition d'exercice. C'est le mécanisme qui permettra au kiné d'individualiser
  sans toucher à la bibliothèque.
- Ce qui reste à décider ne bouge pas : positionnement réglementaire, et où vit le côté kiné.
  Cette ADR est une dette assumée, pas une réponse à cette question.
- Tant qu'il n'y a pas de kiné en face, tout ce que l'app présente comme « prescrit par votre
  kiné » ne l'est pas. L'écran Profil le dit explicitement.
