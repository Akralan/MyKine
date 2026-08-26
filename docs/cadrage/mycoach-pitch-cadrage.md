# MyCoach — Pitch & cadrage

> Nouveau usecase MyTwin : suivi intelligent des exercices de rééducation à domicile, pour les patients de kinésithérapie et leurs kinés.

## En une phrase

Le patient se filme pendant ses exercices prescrits ; un modèle de pose estimation tournant sur son téléphone en extrait le squelette, score l'exécution (répétitions, amplitude, compensations), et le kiné retrouve un suivi objectif de ce qui a été fait — et comment — entre deux rendez-vous.

## Le problème

La rééducation se joue à domicile, et c'est précisément là que le système est aveugle. Une grande partie des patients ne fait pas — ou fait mal — les exercices prescrits, et le kiné n'a aucun moyen de le savoir : au rendez-vous suivant, il ne dispose que du déclaratif du patient. Il ajuste donc son protocole à l'aveugle, sur une information invérifiable. C'est le problème que des kinés du réseau nous ont eux-mêmes remonté : l'envie est là, c'est le *comment technique* qui manquait.

## La solution

**Côté patient**, MyCoach est un usecase MyTwin comme les autres : un programme d'exercices prescrit, des séances guidées où la caméra du téléphone suit le mouvement en temps réel, un retour immédiat (compteur de répétitions, amplitude atteinte, alerte sur une compensation), et un score de séance qui rend la progression visible et l'observance gratifiante.

**Côté kiné**, un tableau de suivi : quelles séances ont été faites, comment les amplitudes évoluent, quelles compensations persistent — et pour chaque exercice, un **replay du mouvement en squelette animé**. Pas la vidéo du patient : uniquement la série temporelle de points articulaires. C'est exactement le visuel dont le kiné a besoin pour juger un geste, et c'est un choix fort de protection des données — aucune image du patient ne quitte son téléphone.

## Comment ça marche techniquement

Le verrou qui bloquait n'en est plus un. Les modèles de pose estimation (BlazePose, MoveNet) tournent aujourd'hui en temps réel sur un smartphone milieu de gamme, entièrement on-device — c'est la technologie qu'utilisent déjà des apps grand public d'analyse de mouvement en escalade ou en golf.

Le cœur du produit n'est pas le squelette lui-même mais ce qu'on en tire. Le scoring travaille en **angles articulaires** plutôt qu'en positions de points, ce qui le rend robuste au cadrage, à la morphologie et à la vitesse d'exécution du patient. Chaque exercice est défini dans une **bibliothèque paramétrée** — angles cibles, tempo, nombre de répétitions — que le kiné prescrit et ajuste, plutôt que par un enregistrement de référence fragile. Et le score n'est pas une similarité globale opaque : c'est un ensemble de critères lisibles (amplitude atteinte, symétrie, compensation détectée sur telle articulation), explicables au patient comme au kiné.

## Pourquoi maintenant

Trois lignes convergent. La technologie est devenue une commodité : ce qui exigeait un laboratoire il y a cinq ans tourne sur un téléphone. Le marché est validé : Sword Health et Hinge Health ont bâti des valorisations en milliards de dollars sur la kinésithérapie digitale — sur un modèle B2B assurantiel américain qui laisse le kiné de ville français entièrement non adressé. Et la demande locale est déjà là : des kinés du réseau se sont dits partants avant même qu'une solution existe.

## Pourquoi nous

MyTwin est déjà une plateforme multi-usecases pensée pour accueillir ce type de brique : l'infrastructure (auth, consentements, questionnaires, backend GraphQL) existe, et MyCoach s'y insère comme athletes, women ou longevity avant lui. La compétence ML nécessaire est en interne. Et le réseau donne un accès direct aux premiers utilisateurs professionnels — ce qui fait de MyCoach le premier usecase où le professionnel de santé n'est pas un destinataire du produit mais son **prescripteur**, donc notre canal d'acquisition.

## Prochaines étapes proposées

La première étape est une **démo mono-exercice** : un squat ou une abduction d'épaule, squelette en live, comptage de répétitions, amplitude maximale et asymétrie affichées, replay en bâtons. Objectif : passer du concept à un objet qu'on met entre les mains d'un kiné. En parallèle, transformer l'enthousiasme des kinés contactés en engagement concret : **deux ou trois kinés partenaires de design**, dont le rôle est de définir la bibliothèque d'exercices initiale et les critères de compensation qui comptent cliniquement — car c'est là, et plus dans la technique, que se situe désormais la vraie difficulté. La démo et leurs retours nourrissent ensuite le cadrage d'une V1.

## Questions ouvertes à trancher ensemble

**Positionnement réglementaire de la V1.** Dès que l'app donne un retour correctif sur un protocole de rééducation prescrit, on entre vraisemblablement en territoire dispositif médical (MDR). Ce n'est pas bloquant — les acteurs établis sont certifiés, et MyTwin évolue déjà dans ces eaux — mais cela conditionne les promesses que la V1 peut faire et celles qu'elle doit différer.

**Où vit le côté kiné.** MyCoach serait le premier usecase biface : tout ce qui existe aujourd'hui est orienté patient, or la moitié de la valeur (prescription, tableau de suivi) s'adresse au kiné — vraisemblablement une interface web adossée au backend, à cadrer.

**Statut du projet.** Usecase de l'app MyTwin, ou produit ayant vocation à exister en propre ? La question mérite d'être posée explicitement dès le départ, parce qu'elle oriente les choix d'architecture et d'investissement.
