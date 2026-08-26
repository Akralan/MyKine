# Squat

**Statut** : implémenté dans la démo — seuils initiaux non validés cliniquement.

## Placement

- Téléphone posé à hauteur de hanches, corps entier visible, à 2–3 m.
- Patient de profil ou de trois-quarts face à la caméra. (À valider : la vue de face donne-t-elle
  des angles de genou fiables avec la 3D monde ?)

## Paramètres

| Paramètre | Valeur initiale | Justification | À valider par |
|---|---|---|---|
| Angle pilote | genou (moyenne G/D) | Signal le plus ample et le plus lisible du mouvement | — |
| `rest` | 160° | Debout, le genou est rarement à 180° en pose estimation ; marge pour démarrer la rep sans faux départ | Test réel |
| `target` | 100° | Correspond à un squat « genoux à ~90° » avec la marge du modèle | Kiné |
| `minRepDurationMs` | 600 ms | Un squat plus court est un rebond de signal | Test réel |
| `asymmetryWarnDeg` | 12° | Ordre de grandeur, aucune base clinique encore | Kiné |
| `trunkLeanWarnDeg` | 45° | Ordre de grandeur, aucune base clinique encore | Kiné |

## Compensations couvertes / non couvertes

| Compensation | Couverte ? | Comment |
|---|---|---|
| Amplitude insuffisante | Oui | rep incomplète (angle min > `target`) |
| Appui asymétrique | Partiellement | écart angle genou G/D au point bas — ne distingue pas un transfert de poids sans différence d'angle |
| Tronc penché en avant | Oui | `trunkLean` |
| Valgus du genou | **Non** | demande une projection frontale genou/hanche/cheville ; nécessite une vue de face |
| Talons décollés | **Non** | angle de cheville non calculé ; visibilité des talons incertaine |
| Tempo trop rapide | Non (mesuré, pas jugé) | durée de la rep disponible, pas de cible |

## Notes de test

Voir `docs/journal.md`.
