# 0008 — Espace kiné de démo, local au navigateur et relié à l'app patient

**Statut** : Acceptée
**Date** : 2026-10-16
**Complète** : 0007 (le programme de Claire peut désormais venir de l'espace kiné)

## Contexte

La landing invite à « essayer la démo ». Jusqu'ici, seule l'app patient existait : un kiné qui
cliquait voyait l'expérience de son patient, jamais la sienne. Or le kiné est le prescripteur,
donc le canal d'acquisition (cadrage). Il lui faut un espace à lui : créer un compte, voir des
patients, leur observance, leurs amplitudes, modifier une prescription.

Contraintes inchangées : pas de backend (ADR 0001), aucune donnée de santé hébergée, démo
statique sur Scalingo.

## Options considérées

1. **Maquettes statiques** des écrans kiné. Rapide, mais rien ne réagit : on ne peut ni créer
   de compte, ni modifier un programme, ni voir l'effet d'une séance.
2. **Backend minimal** avec vrais comptes. Il faudrait héberger des données de santé, donc un
   hébergeur HDS, des contrats, une analyse réglementaire : hors de portée d'une démo.
3. **Application kiné entièrement locale**, avec des patients fictifs générés et un stockage dans
   le navigateur, partagé avec l'app patient puisque les deux pages ont la même origine.

## Décision

Option 3. L'espace kiné est une troisième page (`/kine/`, `src/kine/`).

- **Compte** : créé dans le `localStorage`, avec les consentements horodatés et versionnés (CGU,
  politique de confidentialité), le n° RPPS, et les droits d'export et d'effacement. Le mot de
  passe n'est jamais conservé. Les documents légaux sont des brouillons marqués comme tels.
- **Patients fictifs** : cinq profils générés de façon déterministe (`src/kine/data.ts`), datés par
  rapport au jour d'ouverture, pour que la démo ait toujours l'air vivante. Les mesures suivent
  les seuils réels de la bibliothèque. Chaque patient illustre un cas : Claire progresse, Marc
  compense par le tronc, Sofia est exemplaire, Jean décroche, Léa présente une asymétrie.
- **Indicateurs** : tous dérivés des séances (`src/kine/stats.ts`, testés), comme l'avancement côté
  patient (ADR 0007). Les seuils d'alerte sont des ordres de grandeur de démo.
- **Lien avec l'app patient**, même navigateur uniquement :
  - le programme de Claire modifié par le kiné est écrit sous `mycoach.kine.plans`, et
    `DEMO_PROGRAM` le reprend au chargement (sinon `DEMO_PLAN`) ;
  - les séances réellement faites dans l'app patient sont lues dans IndexedDB et ajoutées à la
    fiche de Claire, marquées « En vrai ».

## Conséquences

- Un kiné peut tout essayer seul, sans compte réel ni donnée envoyée.
- Le lien entre les deux démos ne fonctionne que sur un même navigateur : un kiné sur ordinateur
  ne verra pas les séances faites sur son téléphone. Il faudra un backend pour ça, avec les
  contraintes HDS de l'option 2.
- Les patients fictifs n'ont pas de frames : leurs séances n'ont pas de replay squelette. Seules
  les séances « En vrai » en ont un, dans l'app patient.
- `src/program/demo.ts` reste le seul endroit qui décide du programme de départ ; il expose
  désormais `DEMO_PLAN`, que la génération des données kiné réutilise pour rester cohérente.
