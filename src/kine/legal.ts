import { LEGAL_VERSION } from "./store";

/**
 * Documents légaux de la démo. Ce sont des brouillons de travail, structurés comme les
 * vrais documents d'un service de santé numérique, mais NON relus par un juriste :
 * chaque document l'affiche en tête. Les mentions entre crochets restent à compléter.
 */

export type LegalDoc = "cgu" | "confidentialite" | "mentions";

const DRAFT = `<p class="legal-draft">Version de démonstration ${LEGAL_VERSION}. Ce texte est un brouillon :
il doit être relu par un juriste avant toute mise en production. Les mentions entre crochets
restent à compléter.</p>`;

export const LEGAL: Record<LegalDoc, { title: string; html: string }> = {
  cgu: {
    title: "Conditions générales d'utilisation",
    html: `${DRAFT}
<h3>1. Objet</h3>
<p>Les présentes conditions encadrent l'accès à l'espace professionnel MyCoach, un outil de suivi
des exercices de rééducation réalisés à domicile par les patients d'un professionnel de santé.</p>

<h3>2. Accès réservé aux professionnels de santé</h3>
<p>L'espace professionnel est réservé aux professionnels de santé inscrits au Répertoire partagé des
professionnels de santé (RPPS) et exerçant légalement en France. En créant un compte, l'utilisateur
certifie remplir ces conditions. MyCoach peut vérifier le numéro RPPS déclaré et suspendre un compte
dont les informations sont inexactes.</p>

<h3>3. Nature du service</h3>
<p>MyCoach affiche des mesures de mouvement calculées sur le téléphone du patient : nombre de
répétitions, amplitude articulaire, inclinaison du tronc, écart entre côté gauche et côté droit.
Ces mesures sont des indicateurs de suivi. Elles ne constituent ni un diagnostic ni une consigne
thérapeutique, et ne remplacent pas l'examen clinique. Le professionnel reste seul juge de la
prescription et de son adaptation.</p>
<p>Le statut réglementaire du service au regard du règlement (UE) 2017/745 relatif aux dispositifs
médicaux est en cours d'analyse. Tant qu'il n'est pas tranché, le service ne délivre aucun retour
correctif au patient.</p>

<h3>4. Obligations du professionnel</h3>
<ul>
  <li>Recueillir le consentement libre et éclairé de chaque patient avant de lui prescrire un suivi
  par MyCoach, et l'informer de la nature des données collectées.</li>
  <li>Respecter le secret professionnel et ne pas partager ses identifiants.</li>
  <li>Utiliser les mesures dans le cadre de sa pratique, sans en faire un usage étranger au soin.</li>
</ul>

<h3>5. Compte</h3>
<p>L'utilisateur est responsable de la confidentialité de ses identifiants. Il peut à tout moment
exporter ses données ou supprimer son compte depuis la page « Mon compte ».</p>

<h3>6. Responsabilité</h3>
<p>MyCoach met en œuvre les moyens raisonnables pour assurer la disponibilité et l'exactitude du
service, sans garantie de résultat sur l'évolution clinique des patients. La précision des mesures
dépend des conditions de prise de vue : cadrage, lumière, position du téléphone.</p>

<h3>7. Évolution des conditions</h3>
<p>Toute modification substantielle est notifiée à l'utilisateur, dont l'accord est redemandé à sa
connexion suivante.</p>

<h3>8. Droit applicable</h3>
<p>Les présentes conditions sont soumises au droit français. [Juridiction compétente à préciser.]</p>`,
  },

  confidentialite: {
    title: "Politique de confidentialité",
    html: `${DRAFT}
<h3>Dans cette démo</h3>
<p>Aucune donnée ne quitte votre navigateur. Le compte, les consentements et les patients que vous
ajoutez sont enregistrés dans le stockage local de ce navigateur, et effacés par « Supprimer mon
compte ». Le mot de passe saisi à l'inscription n'est jamais conservé. Les cinq patients présents
au départ sont fictifs.</p>

<h3>Qui est responsable de quoi</h3>
<p>Pour les données de ses patients, le professionnel de santé est responsable de traitement.
MyCoach agit comme sous-traitant au sens de l'article 28 du RGPD, sur ses instructions et dans le
cadre d'un contrat de sous-traitance. Pour les données du compte professionnel, MyCoach est
responsable de traitement.</p>

<h3>Données traitées</h3>
<ul>
  <li><b>Compte professionnel</b> : nom, prénom, adresse e-mail, profession, numéro RPPS, cabinet,
  historique des consentements.</li>
  <li><b>Patients</b> : identité, motif de prise en charge, programme prescrit, et pour chaque
  séance la série temporelle de 33 points articulaires et les mesures qui en sont tirées.</li>
  <li><b>Aucune image ni vidéo</b> : l'analyse du mouvement se fait sur le téléphone du patient, et
  seules les coordonnées des points articulaires sont conservées.</li>
</ul>

<h3>Base légale</h3>
<p>Les données de mouvement des patients sont des données concernant la santé (article 9 du RGPD).
Leur traitement repose sur la prise en charge sanitaire par un professionnel soumis au secret
(article 9.2.h) et sur l'information préalable du patient.</p>

<h3>Hébergement</h3>
<p>En production, les données de santé seront hébergées chez un hébergeur certifié HDS, comme
l'exige l'article L.1111-8 du Code de la santé publique. [Hébergeur à désigner.]</p>

<h3>Durées de conservation</h3>
<ul>
  <li>Compte professionnel : durée de la relation, puis suppression sous [durée à fixer].</li>
  <li>Données de suivi des patients : durée fixée par le professionnel responsable de traitement,
  dans le respect des règles applicables au dossier de soins.</li>
</ul>

<h3>Vos droits</h3>
<p>Vous disposez des droits d'accès, de rectification, d'effacement, de limitation, d'opposition
et de portabilité. Dans cette démo, l'export et l'effacement sont disponibles directement depuis
« Mon compte ». Pour toute autre demande : [contact du délégué à la protection des données]. Vous
pouvez introduire une réclamation auprès de la CNIL.</p>`,
  },

  mentions: {
    title: "Mentions légales",
    html: `${DRAFT}
<h3>Éditeur</h3>
<p>MyCoach est un service de MyTwin. [Raison sociale, forme juridique, capital, siège social,
numéro RCS.]</p>
<p>Directeur de la publication : [nom à compléter].</p>
<p>Contact : [adresse e-mail de contact].</p>

<h3>Hébergement de la démo</h3>
<p>La démo est un site statique hébergé par Scalingo. Elle ne stocke aucune donnée côté serveur :
tout reste dans votre navigateur.</p>

<h3>Crédits</h3>
<p>Estimation de pose : MediaPipe Pose Landmarker (Google), exécuté sur l'appareil. Photographies
de la page d'accueil : Unsplash.</p>`,
  },
};
