# Journal du projet

Retours de tests réels, ajustements de seuils, problèmes rencontrés, décisions du quotidien.
Entrées datées, plus récentes en haut. Les décisions structurantes vont dans `docs/decisions/`.

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
