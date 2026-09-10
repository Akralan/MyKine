# MyCoach — démo patient (parcours mobile)

Démo web du usecase MyTwin « MyCoach » (voir `docs/cadrage/`) : pose estimation on-device,
scoring déterministe par angles articulaires, replay du mouvement en squelette.

L'interface suit la maquette « Refonte UI/UX santé » : parcours patient mobile en six écrans,
design system blanc / teal `#0d9488`, séance du jour issue d'un programme prescrit.

## Lancer

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests unitaires (angles, compteur de reps)
npm run build
```

Le serveur de dev est en HTTPS (certificat auto-signé via `@vitejs/plugin-basic-ssl`) parce que
la caméra exige un contexte sécurisé. Accepter l'avertissement du navigateur une fois.

### Tester sur téléphone (réseau local)

1. Téléphone et PC sur le même Wi-Fi.
2. Ouvrir l'URL « Network » affichée par Vite, **avec `https://`** (Chrome mobile enlève souvent
   le `s` ; un `http` donne « ERR_EMPTY_RESPONSE »). Accepter le certificat (« Paramètres avancés »,
   ou taper `thisisunsafe` sur la page d'erreur Chrome).
3. Si la page ne charge pas du tout, ouvrir le port dans le pare-feu Windows (PowerShell admin) :
   `New-NetFirewallRule -DisplayName "Vite dev 5173" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -Profile Any`

Le téléphone est la cible réelle : grand-angle, et on le pose à hauteur de hanches, écran vers soi.

Le runtime WASM et le modèle `pose_landmarker_lite` sont chargés depuis les CDN officiels au
premier lancement (≈ 5 Mo, ensuite en cache navigateur). L'écran Profil propose un sélecteur
Lite / Full / Heavy (mêmes 33 points, précision et coût croissants) ; le choix est mémorisé et
enregistré avec chaque série.

## Parcours

| # | Écran | Ce qu'il fait |
|---|---|---|
| 01 | Accueil | Séance du jour issue du programme, avancement de la semaine, progression d'amplitude |
| 02 | Exercices | Exercices prescrits et bibliothèque ; **toucher une ligne lance l'exercice directement** |
| 03 | Séance live | Caméra plein cadre, squelette, décompte, séries et répétitions, mesures en surimpression |
| 04 | Fin de séance | Bilan de l'exercice (toutes séries agrégées), amplitude par répétition, exercice suivant |
| 05 | Replay | Squelette 2D / 3D orbitable, timeline scrubbable, marqueurs de reps, courbe d'angle |
| 06 | Historique | Séances locales groupées par jour, totaux, accès au replay |
| — | Profil | Programme, modèle de pose, données locales. Quatrième onglet de la maquette, non dessiné : construit avec ses composants |

Une séance = plusieurs exercices, chacun en plusieurs séries. **Une série = une entrée en base** ;
les séries d'une même séance partagent un `workoutId`.

## Décisions de cadrage prises pour la démo

- **Web, sans PWA, sans backend, sans intégration MyTwin.** Le portage dans l'app se fera en
  réécrivant uniquement l'adaptateur caméra/pose (`src/pose/mediapipe.ts`) ; tout le reste ne
  dépend que du modèle `Frame` (`src/pose/types.ts`).
- **Pas de ML pour le scoring.** Le ML est dans la pose estimation (MediaPipe / BlazePose).
  Le scoring est une machine à états sur des seuils d'angles, paramétrée par exercice
  (`src/scoring/exercise.ts`) — lisible, explicable, ajustable par un kiné sans réentraînement.
- **Mesures affichées, pas de consigne corrective**, pour rester hors périmètre dispositif
  médical tant que la question réglementaire n'est pas tranchée.
- **Aucune image stockée.** Seule la série temporelle de 33 points (coordonnées image + monde)
  est enregistrée, dans IndexedDB, en local.
- **Programme prescrit codé en dur** (ADR 0007), dans `src/program/demo.ts` et nulle part ailleurs.
  Seul le programme est figé : l'avancement affiché (semaine, séances de la semaine, exercices
  faits du jour, courbe de progression) est dérivé des séances réellement enregistrées.

## Documentation

- `docs/cadrage/` — pitch et cadrage initial du usecase.
- `docs/decisions/` — ADR : une page par décision structurante, avec les alternatives écartées.
- `docs/exercices/` — spécification de la bibliothèque d'exercices, à co-écrire avec les kinés partenaires.
- `docs/journal.md` — retours de tests réels et ajustements de seuils.
- `docs/idees.md` — pistes futures non planifiées, avec leurs coûts et contraintes.

## Architecture

```
src/
  pose/       types.ts (Frame, PoseSource — indépendant du moteur)
              mediapipe.ts (adaptateur webcam → PoseLandmarker → Frame)
  geometry/   angles.ts (angles articulaires 3D, inclinaison tronc, lissage)
  scoring/    exercise.ts (bibliothèque : angle pilote, sens du mouvement, seuils, dose par défaut)
              repCounter.ts (machine à états rest → down → up, métriques par rep)
  program/    types.ts (Program, Prescription — la forme que renverra l'interface kiné)
              demo.ts (DEMO_PROGRAM : le seul endroit codé en dur, ADR 0007)
              progress.ts (avancement dérivé des séances : semaine, séries faites, tendance)
              runner.ts (séance en cours : exercices, séries, dose effective)
  storage/    db.ts (IndexedDB via idb : une entrée = une série, groupée par workoutId)
  ui/         shell.ts (cadre téléphone, barre d'état, onglets, formats)
              home.ts / exercises.ts / live.ts / summary.ts / replay.ts / history.ts / profile.ts
              skeleton.ts (dessin 2D en bâtons, dessin 3D depuis les coordonnées monde ancré aux chevilles, interpolation)
              style.css (design system de la maquette : couleurs, rayons, typographies)
```

## Métriques du squat

| Métrique | Calcul |
|---|---|
| Répétitions | angle genou (moyenne G/D) passe sous `rest` (160°) puis redépasse `rest` ; complète si le minimum ≤ `target` (100°, ou la cible fixée par la prescription) |
| Profondeur | angle genou minimal sur la rep |
| Asymétrie | \|genou G − genou D\| au point bas ; alerte > 12° |
| Tronc | angle hanches→épaules vs verticale ; alerte > 45° |

Les seuils sont dans `SQUAT` (`src/scoring/exercise.ts`) et sont à ajuster avec les kinés partenaires.

Les seuils sont exprimés en **angle intérieur** : pour le genou et la hanche,
`angle intérieur = 180° − flexion clinique`. La convention et ses deux exceptions (épaule, cheville)
sont dans [`docs/exercices/README.md`](docs/exercices/README.md).

Les exercices en **extension** (pont fessier, élévation d'épaule, montée sur pointes) suivent la
même machine à états : l'angle pilote et les seuils changent de signe, et « le plus profond »
devient « le plus étendu ». Les exercices `unilateral` (fente) suivent le côté le plus engagé
plutôt que la moyenne gauche/droite.

Les seuils d'amplitude des quatre exercices hors squat viennent de la littérature (sources dans
`docs/exercices/README.md`), mais **aucun n'a été relu par un kiné ni confronté à de vraies
frames** — l'app l'affiche telle quelle sur chaque exercice concerné. Les seuils d'asymétrie et
d'inclinaison du tronc, eux, restent des ordres de grandeur sans base clinique, y compris pour le
squat.
