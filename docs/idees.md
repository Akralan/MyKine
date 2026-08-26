# Idées futures

Pistes non planifiées, à réévaluer quand les décisions ouvertes (`docs/decisions/README.md`) seront
prises. Chaque idée note ce qu'elle apporte, ce qu'elle coûte et à quoi elle se heurte.

---

## Avatar 3D du patient par SAM 3D Body, superposé au squelette côté kiné

**Proposé le** : 2026-08-26

**Idée** : reconstruire un maillage 3D du patient (SAM 3D Body, Meta) à partir d'**une seule
image** où il est à peu près droit, puis animer ce maillage avec la série temporelle de landmarks
déjà enregistrée. Côté kiné, le replay affiche le rendu volumique par-dessus (ou à la place) du
squelette en bâtons.

**Ce que ça apporte**
- Lisibilité du replay pour le kiné : gabarit, longueurs de segments, masse — ce qu'un squelette en
  bâtons ne montre pas.
- Un seul calcul par patient (ou par mise à jour de morphologie), réutilisé pour toutes les séances.
- Le rendu reste dérivé des landmarks : aucune vidéo n'est nécessaire pour l'animation.

**Ce que ça coûte**
- SAM 3D Body est un modèle PyTorch lourd (centaines de Mo), pensé pour GPU. Pas réaliste sur
  téléphone aujourd'hui ; sur le poste du kiné, cela impose un exécutable local ou un service
  d'inférence. Brique d'infra à part entière. À réévaluer dans 6–12 mois (distillation rapide de
  ces modèles).
- Pipeline de retargeting landmarks → squelette du maillage (rig MHR / SMPL-X) à écrire.

**À quoi ça se heurte**
- **ADR 0005** (aucune image ne quitte le téléphone) : le modèle prend une photo en entrée. Version
  compatible : capture d'**une photo unique, pose neutre, étape séparée et explicitement consentie**
  (« créer mon avatar »), traitée puis supprimée ; seul le maillage est conservé et transmis. Le
  kiné ne voit jamais la photo.
- Décision ouverte « où vit le côté kiné » : sans interface kiné, pas d'endroit où afficher le rendu.

**Alternative moins coûteuse** : ajuster un modèle paramétrique (SMPL-X) directement sur les
landmarks monde, sans image. Moins fidèle, mais zéro donnée image et calculable en JS.

**Verdict actuel** : à garder pour la V1 côté kiné, pas pour la démo.
