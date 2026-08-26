# Journal du projet

Retours de tests réels, ajustements de seuils, problèmes rencontrés, décisions du quotidien.
Entrées datées, plus récentes en haut. Les décisions structurantes vont dans `docs/decisions/`.

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
