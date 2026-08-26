# 0004 — La démo affiche des mesures, pas de consigne corrective

**Statut** : Acceptée
**Date** : 2026-08-26

## Contexte

Le cadrage identifie qu'un retour correctif sur un protocole de rééducation prescrit fait
vraisemblablement entrer l'application en territoire dispositif médical (MDR). La question
réglementaire de la V1 n'est pas tranchée.

## Options considérées

- Feedback correctif temps réel (« descendez plus bas », « redressez le dos ») : plus démonstratif,
  mais s'apparente à une consigne thérapeutique.
- Mesures objectives affichées, alertes factuelles (« asymétrie 15° », « tronc 50° ») sans
  prescription d'action : moins spectaculaire, mais reste de l'instrumentation.

## Décision

La démo affiche des mesures et des alertes factuelles. Aucun texte ne dit au patient quoi changer.
Le jugement du geste reste au kiné, via le replay et les métriques par rep.

## Conséquences

- Les libellés d'alerte sont des constats (« Tronc trop penché », « Asymétrie gauche/droite »),
  pas des instructions. À conserver tel quel jusqu'à la décision réglementaire.
- Les consignes affichées (`instructions` dans la définition d'exercice) concernent le placement et
  la caméra, pas l'exécution thérapeutique.
- La décision MDR de la V1 conditionnera les promesses produit ; elle fera l'objet d'un ADR dédié.
