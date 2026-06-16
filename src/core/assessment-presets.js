import { createAssessment } from "./assessments.js";

const palette = ["#74d8d1", "#f2764b", "#c7ec6f", "#b69ad8", "#f4c56f", "#80a7ff", "#ff8b7b", "#98d98e", "#f7a8d8", "#a1e6ff", "#e6d67a", "#d8b07a"];

export const assessmentPresets = [
  {
    id: "bandura-self-efficacy-fr",
    label: "Bandura adapté",
    type: "self-efficacy",
    sourceSheet: "BANDURAS GUIDELINES",
    itemCount: 8,
    note: "Sélection représentative d’un recueil d’échelles d’auto-efficacité, adaptée en français.",
    create: () => createAssessment({
      id: "bandura-self-efficacy-fr",
      title: "Auto-efficacité située",
      source: { label: "Bandura, adaptation MODULOP", fidelity: "sélection représentative", itemCount: 8 },
      scale: confidenceScale(),
      dimensions: dims(["Ressources", "Persévérance", "Régulation", "Transfert"]),
      questions: [
        q100("bse1", "Ressources", "Demander une aide ciblée lorsque je suis bloqué dans une tâche complexe."),
        q100("bse2", "Ressources", "Identifier rapidement la personne ou l’outil capable de m’aider."),
        q100("bse3", "Persévérance", "Poursuivre l’effort même lorsque les premiers essais échouent."),
        q100("bse4", "Persévérance", "Reprendre une tâche difficile après une interruption ou une fatigue."),
        q100("bse5", "Régulation", "Transformer un retour critique en prochaine action concrète."),
        q100("bse6", "Régulation", "Réviser ma stratégie quand je constate qu’elle ne fonctionne pas."),
        q100("bse7", "Transfert", "Réutiliser une méthode réussie dans un contexte nouveau."),
        q100("bse8", "Transfert", "Adapter une compétence acquise à un problème inattendu.")
      ],
      feedback: confidenceFeedback("Votre sentiment d’efficacité demande surtout des réussites proches et observables.", "Vous disposez d’un socle robuste pour agir dans l’incertitude.")
    })
  },
  {
    id: "learner-self-efficacy",
    label: "Auto-efficacité apprenante",
    type: "learner-efficacy",
    sourceSheet: "Auto-efficacité dans les appren",
    itemCount: 54,
    create: () => createAssessment({
      id: "learner-self-efficacy",
      title: "Auto-efficacité pour apprendre",
      source: { label: "Classeur SCALES/SIC, feuille Auto-efficacité", fidelity: "version longue issue du classeur", itemCount: learnerSelfEfficacyItems.length },
      scale: confidenceScale(),
      dimensions: dims(uniqueDims(learnerSelfEfficacyItems)),
      questions: learnerSelfEfficacyItems.map(([dimension, text], index) => q100(`lae${index + 1}`, dimension, text)),
      feedback: confidenceFeedback("Commencez par sécuriser les appuis sociaux et les petites étapes.", "Le profil montre une bonne confiance d’apprentissage transférable.")
    })
  },
  {
    id: "collective-efficacy-team",
    label: "Efficacité collective",
    type: "collective-efficacy",
    sourceSheet: "Sentiment dEfficacité Collectiv",
    itemCount: 31,
    create: () => createAssessment({
      id: "collective-efficacy-team",
      title: "Sentiment d’efficacité collective",
      source: { label: "Classeur SCALES/SIC, SEC post-expérimentation", fidelity: "31 items complets, dont 2 questions ouvertes", itemCount: secItems.length },
      scale: likert5("Jamais / Pas du tout", "Souvent / Tout à fait"),
      dimensions: dims(uniqueDims(secItems)),
      questions: secItems.map((item, index) => item.kind === "text"
        ? qText(`sec${index + 1}`, item.dimension, item.text, item.code)
        : qLikert(`sec${index + 1}`, item.dimension, item.text, item.reverse, item.code)),
      feedback: confidenceFeedback("Le collectif gagnerait à clarifier ses buts et ses règles de discussion.", "Le collectif semble disposer d’une base d’action coordonnée.")
    })
  },
  {
    id: "sic22-full",
    label: "SIC source — 23 items",
    type: "collective-intelligence",
    sourceSheet: "Questionnaire SIC",
    itemCount: 23,
    create: () => createAssessment({
      id: "sic22-full",
      title: "Sentiment d’intelligences collectives — SIC source",
      source: { label: "Questionnaire SIC source", fidelity: "23 items complets", itemCount: sicSourceItems.length },
      scale: confidenceScale(),
      dimensions: dims(uniqueDims(sicSourceItems)),
      questions: sicSourceItems.map(([dimension, text], index) => q100(`sic${index + 1}`, dimension, text)),
      feedback: confidenceFeedback("Le profil collectif reste à consolider par des tâches courtes et observables.", "Le profil montre un potentiel collectif exploitable et transférable.")
    })
  },
  {
    id: "sicsia-short",
    label: "SICsIA court — 17 items",
    type: "sic-compact",
    sourceSheet: "SICsIA.md",
    itemCount: 17,
    create: () => createAssessment({
      id: "sicsia-short",
      title: "SICsIA — version courte",
      source: { label: "Adaptation SIC/IA, version pratique", fidelity: "17 items complets", itemCount: sicsiaShortItems.length },
      scale: confidenceScale(),
      dimensions: dims(uniqueDims(sicsiaShortItems)),
      questions: sicsiaShortItems.map(([dimension, text], index) => q100(`sicsia-s${index + 1}`, dimension, text)),
      feedback: confidenceFeedback("La coopération humain-IA demande encore des repères opératoires explicites.", "La coopération humain-IA semble déjà structurée et productive.")
    })
  },
  {
    id: "sicsia-long",
    label: "SICsIA recherche — 35 items",
    type: "sic-long",
    sourceSheet: "SICsIA.md",
    itemCount: 35,
    create: () => createAssessment({
      id: "sicsia-long",
      title: "SICsIA — version recherche",
      source: { label: "Adaptation SIC/IA, version longue", fidelity: "35 items complets", itemCount: sicsiaLongItems.length },
      scale: confidenceScale(),
      dimensions: dims(uniqueDims(sicsiaLongItems)),
      questions: sicsiaLongItems.map(([dimension, text], index) => q100(`sicsia-l${index + 1}`, dimension, text)),
      feedback: confidenceFeedback("Les dynamiques humain-IA sont encore partielles ou dépendantes du contexte.", "Les dynamiques humain-IA montrent une intégration riche entre action, médiation et motivation.")
    })
  },
  {
    id: "tpack-xs-fr",
    label: "TPACK.xs FR",
    type: "tpack",
    sourceSheet: "TPACK",
    itemCount: 28,
    create: () => createAssessment({
      id: "tpack-xs-fr",
      title: "TPACK.xs — compétences techno-pédagogiques",
      source: { label: "TPACK.xs questionnaire", fidelity: "28 items complets traduits", itemCount: tpackItems.length },
      scale: likert5("Pas du tout d’accord", "Tout à fait d’accord"),
      dimensions: dims(uniqueDims(tpackItems)),
      questions: tpackItems.map(([dimension, id, text]) => qLikert(id, dimension, text)),
      feedback: confidenceFeedback("Le profil TPACK indique des zones de consolidation ciblées.", "Le profil TPACK montre une intégration déjà structurée.")
    })
  },
  {
    id: "ipip-big-five-50",
    label: "Big Five IPIP-50",
    type: "personality",
    sourceSheet: "IPIP public domain",
    itemCount: 50,
    create: () => createAssessment({
      id: "ipip-big-five-50",
      title: "Big Five — IPIP-50",
      source: { label: "International Personality Item Pool, Big-Five Factor Markers", fidelity: "50 items publics, version anglaise officielle", itemCount: ipipBigFiveItems.length, license: "public domain" },
      scale: likert5("Très inexact", "Très exact"),
      dimensions: dims(["Extraversion", "Agréabilité", "Conscience", "Stabilité émotionnelle", "Ouverture"]),
      questions: ipipBigFiveItems.map(([dimension, text, reverse], index) => qLikert(`ipip50-${index + 1}`, dimension, text, reverse)),
      feedback: confidenceFeedback("Le profil exprime faiblement cette dimension dans les réponses actuelles.", "Cette dimension ressort nettement dans les réponses actuelles.")
    })
  }
];

export function assessmentPreset(id) {
  return assessmentPresets.find((preset) => preset.id === id);
}

export function createAssessmentFromPreset(id) {
  return assessmentPreset(id)?.create();
}

const learnerSelfEfficacyItems = [
  ["Ressources sociales", "Demander à ceux qui m’instruisent de m’aider lorsque je rencontre des problèmes ou que je suis bloqué dans mon travail."],
  ["Ressources sociales", "Demander à une personne que je considère comme un pair de m’aider quand je suis bloqué dans mon travail."],
  ["Ressources sociales", "Demander de l’aide externe lorsque j’ai des problèmes sociaux."],
  ["Ressources sociales", "Obtenir l’aide d’un proche lorsque j’ai des problèmes sociaux."],
  ["Réussite académique", "Apprendre dans les mathématiques générales."],
  ["Réussite académique", "Apprendre dans l’algèbre."],
  ["Réussite académique", "Apprendre dans les lois universelles des sciences dites exactes."],
  ["Réussite académique", "Apprendre dans la biologie et la nature."],
  ["Réussite académique", "Apprendre à mieux lire, écrire et parler."],
  ["Réussite académique", "Apprendre à utiliser les ordinateurs."],
  ["Réussite académique", "Apprendre une langue étrangère ou un langage nouveau."],
  ["Réussite académique", "Apprendre dans les sciences sociales."],
  ["Réussite académique", "Perfectionner mon vocabulaire, ma grammaire et mon orthographe."],
  ["Apprentissage autorégulé", "Tenir les délais impartis au travers d’apprentissages structurés."],
  ["Apprentissage autorégulé", "Me mettre au travail et me sentir productif quand il y a d’autres choses intéressantes à faire."],
  ["Apprentissage autorégulé", "Toujours me concentrer sur mes objets d’apprentissage lorsque j’y dédie du temps."],
  ["Apprentissage autorégulé", "Prendre des notes et développer des stratégies pour intégrer le contenu de mes apprentissages."],
  ["Apprentissage autorégulé", "Utiliser toutes les ressources afin d’obtenir de l’information complémentaire relative à mes apprentissages."],
  ["Apprentissage autorégulé", "Planifier mon travail d’apprentissage sur une temporalité régulière."],
  ["Apprentissage autorégulé", "Organiser mon travail dans les dimensions spatiales et temporelles relativement aux productions et objectifs."],
  ["Apprentissage autorégulé", "Me souvenir de l’information présentée au travers des différents supports d’apprentissage."],
  ["Apprentissage autorégulé", "M’organiser un endroit et un environnement pour étudier sans distractions."],
  ["Apprentissage autorégulé", "Me mettre au travail en me concentrant sur les objectifs que je vise à atteindre."],
  ["Temps libre et activités parallèles", "Pratiquer ou apprécier les activités sportives."],
  ["Temps libre et activités parallèles", "Pratiquer ou apprécier les activités de danse."],
  ["Temps libre et activités parallèles", "Pratiquer ou apprécier les activités de musique."],
  ["Temps libre et activités parallèles", "Faire un effort de travail sur des activités parallèles."],
  ["Temps libre et activités parallèles", "Avoir des responsabilités dans la gouvernance ou le fonctionnement d’organisations collectives."],
  ["Temps libre et activités parallèles", "Avoir des fonctions de représentativité où il est question de communication et d’expression dans un jeu de rôle."],
  ["Temps libre et activités parallèles", "Pratiquer régulièrement une activité sportive de haute intensité."],
  ["Temps libre et activités parallèles", "Apprendre les compétences nécessaires pour m’améliorer dans les sports d’équipe ou autres activités sociales."],
  ["Résistance", "Résister à la pression des pairs pour ne pas faire des choses qui pourraient m’attirer des ennuis."],
  ["Résistance", "M’empêcher de fuir une activité de travail lorsque je m’ennuie ou que je suis contrarié(e)."],
  ["Résistance", "Résister à la pression sociale pour ne pas fumer de cigarettes."],
  ["Résistance", "Résister à la pression sociale pour ne pas boire d’alcool abusivement."],
  ["Résistance", "Résister à la pression sociale sur la consommation de substances psychoactives."],
  ["Résistance", "Résister à la pression sociale sur l’usage automatique de traitements médicamenteux."],
  ["Résistance", "Résister à la pression sociale sur les relations, pulsions et rapports sexuels."],
  ["Résistance", "Maîtriser mon tempérament."],
  ["Attentes des autres", "Être à la hauteur de ce que ma famille attend de moi."],
  ["Attentes des autres", "Être à la hauteur de ce qu’attendent de moi les personnes qui m’enseignent des choses."],
  ["Attentes des autres", "Être à la hauteur de ce que mes pairs attendent de moi."],
  ["Attentes des autres", "Être à la hauteur de ce que j’attends de moi-même."],
  ["Auto-efficacité sociale", "Se faire et garder des amis du sexe opposé."],
  ["Auto-efficacité sociale", "Se faire et garder des amis du même sexe."],
  ["Auto-efficacité sociale", "Entretenir des conversations avec les autres."],
  ["Auto-efficacité sociale", "Bien travailler en groupe."],
  ["Auto-affirmation", "Exprimer mes opinions lorsque des pairs ne sont pas d’accord avec moi."],
  ["Auto-affirmation", "Me défendre lorsque j’ai l’impression d’être traité injustement."],
  ["Auto-affirmation", "Demander aux autres d’arrêter de m’ennuyer ou de me blesser."],
  ["Auto-affirmation", "Tenir tête à une personne qui me demande de faire quelque chose de déraisonnable ou d’inconvenant."],
  ["Soutien des proches", "Demander à mes proches ou ma famille de m’aider à résoudre un problème."],
  ["Soutien des proches", "Demander à des amis de m’aider en cas de problème."],
  ["Soutien des proches", "Faire participer mes proches à mes activités d’apprentissage."]
];

const secItems = [
  sec("Calibrage des buts", "Dans notre équipe, nous ne sommes pas arrivés à nous fixer des objectifs de travail précis.", true, "PO-SEC-TC-1"),
  sec("Calibrage des buts", "Dans notre équipe, nous avons réussi à articuler correctement les tâches à faire.", false, "PO-SEC-TC-2"),
  sec("Calibrage des buts", "Pour chaque étape, nous définissions clairement le travail à effectuer.", false, "PO-SEC-TC-3"),
  sec("Calibrage des buts", "Dans notre équipe, nous avons eu du mal à définir sur quoi il fallait travailler en priorité.", true, "PO-SEC-TC-4"),
  sec("Efficacité collective", "Je pense que notre équipe de travail a été performante.", false, "PO-SEC-TC-5"),
  sec("Efficacité collective", "Je pense que nous avons réussi ce que nous demandait notre travail.", false, "PO-SEC-TC-6"),
  sec("Efficacité collective", "Par rapport à la réussite du travail, l’équipe semble confiante.", false, "PO-SEC-TC-7"),
  sec("Expression des désaccords", "Dans nos discussions d’équipe, il nous est arrivé de ne pas être du même avis.", true, "PO-SEC-TC-8"),
  sec("Expression des désaccords", "Les divergences qui apparaissaient pendant le travail d’équipe portaient sur des points mineurs.", true, "PO-SEC-TC-9"),
  sec("Expression des désaccords", "Quand nous n’étions pas du même avis, nous trouvions rapidement une solution.", false, "PO-SEC-TC-10"),
  sec("Qualité des interactions", "Il est arrivé que les discussions dégénèrent et se transforment en conflits personnels.", true, "PO-SEC-TC-11"),
  sec("Qualité des interactions", "Dans notre équipe, certain(e)s se croyaient plus compétent(e)s que d’autres.", true, "PO-SEC-TC-12"),
  sec("Qualité des interactions", "Certaines personnes dans l’équipe ont cherché à imposer leur point de vue.", true, "PO-SEC-TC-13"),
  sec("Qualité des interactions", "Je trouve que mon point de vue n’a pas été suffisamment pris en compte dans les discussions.", true, "PO-SEC-TC-14"),
  sec("Recours aux personnes ressources", "J’ai demandé de l’aide pour avancer dans mon travail.", false, "PO-SEC-TC-15"),
  sec("Recours à des ressources externes", "Je me suis parfois aidé de ressources externes pour avancer dans mon travail.", false, "PO-SEC-TC-16"),
  sec("Initiative contrôlée", "J’ai pris des initiatives réfléchies dans ce travail d’équipe.", false, "PO-PC-1"),
  sec("Initiative contrôlée", "Les autres ont pris des initiatives réfléchies dans ce travail d’équipe.", false, "PO-PC-2"),
  sec("Esprit d’équipe", "Lors des sessions de travail, je me suis intéressé aux dynamiques internes de mon équipe et me suis appliqué afin d’être plus performant collectivement.", false, "PO-PC-3"),
  sec("Esprit d’équipe", "Lors de cette activité, les autres m’ont semblé s’intéresser aux dynamiques internes de notre équipe et ont tâché de s’appliquer afin que nous soyons plus performants collectivement.", false, "PO-PC-4"),
  sec("Compétences et habiletés", "J’ai confiance en mes capacités, je sais appliquer précisément mes connaissances sur des objets de travail.", false, "PO-PC-5"),
  sec("Compétences et habiletés", "Les autres semblaient avoir confiance en leurs capacités et appliquer précisément leurs connaissances sur nos objets de travail.", false, "PO-PC-6"),
  sec("Quantité de travail", "J’ai tendance à travailler et produire le maximum dans les temps impartis.", false, "PO-PC-7"),
  sec("Quantité de travail", "Les autres ont semblé travailler et produire le maximum dans les temps impartis.", false, "PO-PC-8"),
  sec("Qualité du travail", "J’ai pour exigence personnelle de produire un travail de qualité.", false, "PO-PC-9"),
  sec("Qualité du travail", "Les autres semblaient vouloir produire un travail de qualité.", false, "PO-PC-10"),
  sec("Réussite individuelle", "Je crois avoir eu une meilleure efficacité sur mon travail en travaillant seul plutôt qu’avec mon équipe.", true, "PO-SIC-1"),
  sec("Amélioration collective", "Je crois que la réflexion avec mon équipe m’a permis d’améliorer ma propre manière de travailler.", false, "PO-SIC-2"),
  sec("Organisation et coordination collective", "Je crois que la bonne organisation et coordination des échanges au sein de mon équipe nous a permis de mieux travailler.", false, "PO-SIC-3"),
  { kind: "text", dimension: "Facteurs de collaboration", text: "Quels sont les facteurs qui vous ont aidé / et / ou / mis en difficulté dans cette collaboration ?", code: "PO-SIC-4" },
  { kind: "text", dimension: "Contribution des autres", text: "En quoi la contribution des autres membres de l’équipe vous a-t-elle aidé / et / ou / perturbé ?", code: "PO-SIC-5" }
];

const sicSourceItems = [
  ["Cognition", "Comprendre les éléments de mon environnement."],
  ["Cognition", "Apprendre à partir de nouvelles situations."],
  ["Cognition", "M’adapter à de nouveaux contextes."],
  ["Compétences", "Mettre à contribution mes qualités humaines."],
  ["Compétences", "Mettre à contribution mes compétences générales."],
  ["Compétences", "Mettre à contribution mes aptitudes spécifiques."],
  ["Créativité", "Copier, coller, s’inspirer, dupliquer."],
  ["Créativité", "Transformer, détruire, créer, produire."],
  ["Créativité", "Combiner, associer, relier, adapter."],
  ["Coopération", "Diviser le travail en plusieurs parties afin de les accomplir individuellement en fonction des forces et compétences distribuées."],
  ["Collaboration", "Se sentir responsable du travail accompli et y contribuer pour qu’il soit le meilleur possible au niveau collectif."],
  ["Coordination", "Organiser et mettre en œuvre les moyens pour distribuer le travail en fonction de la finalité à atteindre."],
  ["Coordination", "Distribuer dans le temps, l’espace et l’information les éléments à partager et à co-construire de manière synchrone ou asynchrone."],
  ["Synergie", "Ressentir que mes contributions et efforts associés à celles et ceux des autres produit un effet d’ensemble plus puissant."],
  ["Stigmergie", "Ressentir que l’association et la mise en commun des contributions collectives s’est effectuée de manière relativement fluide et productive."],
  ["Instrumentation", "Utiliser les outils existants pour répondre à mes besoins au travers divers instruments et méthodologies."],
  ["Instrumentalisation", "Détourner, m’approprier, transformer les usages et utilisations des instruments me permettant de parvenir à mes fins."],
  ["Valorisation", "Me satisfaire du travail accompli."],
  ["Valorisation", "Trouver du sens à ce que j’accomplis."],
  ["Valorisation", "Obtenir une reconnaissance des autres."],
  ["Valorisation", "Monétiser ou valoriser ma force de travail."],
  ["Volition", "Me mettre au travail et persister dans les efforts."],
  ["Volition", "Garder la motivation pour me surpasser dans mes accomplissements."]
];

const sicsiaShortItems = [
  ["Cognition", "Je comprends, j’apprends et m’adapte rapidement pour travailler efficacement avec l’IA."],
  ["Compétences", "Je mobilise mes compétences générales, spécifiques et humaines pour bien guider l’IA."],
  ["Créativité", "Je co-crée avec l’IA en proposant, combinant et transformant des idées."],
  ["Coopération", "Je confie à l’IA des sous-tâches qui s’intègrent à l’ensemble de mon travail."],
  ["Collaboration", "Je me sens coresponsable du résultat final produit avec l’IA."],
  ["Coordination", "J’organise les étapes et le contexte de nos interactions : prompts, critères, versions."],
  ["Synergie", "Le résultat humain-IA dépasse ce que je ferais seul(e)."],
  ["Stigmergie", "Les réponses de l’IA orientent utilement mes prochaines actions."],
  ["Instrumentation", "J’utilise l’IA en respectant ses contraintes et en exploitant ses potentialités."],
  ["Instrumentalisation", "J’adapte ou détourne l’IA selon mes besoins spécifiques."],
  ["Valorisation", "Je trouve du sens et de la satisfaction dans le travail accompli avec l’IA."],
  ["Volition", "Je persévère en itérant avec l’IA jusqu’à atteindre l’objectif."],
  ["Motivation", "Je suis engagé(e) à atteindre l’objectif avec l’aide de l’IA."],
  ["Partenariat", "Je perçois l’IA comme partenaire de travail."],
  ["Communication", "Le dialogue entre prompts et réponses est clair et utile."],
  ["Liberté d’expression", "Je peux explorer librement des idées avec l’IA."],
  ["Ouverture", "Je suis ouvert(e) aux suggestions de l’IA."]
];

const sicsiaLongItems = [
  ["Cognition", "Je comprends rapidement les éléments essentiels d’une tâche à réaliser avec l’IA."],
  ["Cognition", "J’apprends des retours de l’IA pour améliorer ma manière de travailler."],
  ["Cognition", "Je m’adapte aux changements de contexte ou aux contraintes de l’IA."],
  ["Compétences", "Je mobilise mes compétences générales pour piloter efficacement l’IA."],
  ["Compétences", "J’applique des aptitudes spécifiques avec l’IA, comme des prompts structurés ou des méthodes."],
  ["Compétences", "J’active des qualités humaines, comme l’éthique ou l’esprit critique, dans l’usage de l’IA."],
  ["Créativité", "Je m’inspire des propositions de l’IA pour générer ou remixer des idées."],
  ["Créativité", "Je transforme les sorties de l’IA pour les adapter au contexte."],
  ["Créativité", "Je combine mes apports et ceux de l’IA pour enrichir la production."],
  ["Volition", "Je persévère face aux limites ou erreurs de l’IA."],
  ["Volition", "Je reste motivé(e) jusqu’à atteindre un résultat satisfaisant."],
  ["Volition", "Je cherche à me dépasser grâce à l’appui de l’IA."],
  ["Coopération", "Je confie à l’IA une partie spécifique de la tâche."],
  ["Coopération", "Je répartis le travail entre l’IA et moi selon nos forces."],
  ["Collaboration", "Je me sens coresponsable du résultat final avec l’IA."],
  ["Collaboration", "Je mène des échanges itératifs pour améliorer ses réponses."],
  ["Coordination", "J’organise la séquence d’interactions : objectifs et étapes."],
  ["Coordination", "Je planifie dans le temps l’usage des sorties de l’IA."],
  ["Coordination", "Je gère le contexte partagé : historique, contraintes, versions."],
  ["Synergie", "Le résultat humain-IA dépasse mes capacités seules."],
  ["Synergie", "Les productions co-créées me surprennent positivement."],
  ["Stigmergie", "Les réponses de l’IA guident mes actions suivantes."],
  ["Stigmergie", "Mes exemples ou corrections orientent ses réponses futures."],
  ["Instrumentation", "J’utilise l’IA en tenant compte de ses limites et formats."],
  ["Instrumentation", "Je formalise des schèmes d’usage efficaces : gabarits, critères."],
  ["Instrumentalisation", "J’adapte l’IA à mes besoins : prompts, paramètres."],
  ["Instrumentalisation", "Je compose des flux ou outils autour de l’IA pour aller plus loin."],
  ["Valorisation", "Je trouve du sens dans le travail accompli avec l’IA."],
  ["Valorisation", "Je suis satisfait(e) du résultat IA-assisté."],
  ["Valorisation", "Mon travail avec l’IA est reconnu par les autres."],
  ["Motivation", "Je suis engagé(e) à atteindre l’objectif avec l’aide de l’IA."],
  ["Partenariat", "Je perçois l’IA comme partenaire de travail."],
  ["Communication", "Le dialogue entre prompts et réponses est clair et utile."],
  ["Liberté d’expression", "Je peux explorer librement des idées avec l’IA."],
  ["Ouverture", "Je suis ouvert(e) aux suggestions de l’IA."]
];

const tpackItems = [
  ["PK", "pk1", "Je peux adapter mon enseignement en fonction de ce que les apprenants sont en train de comprendre ou de ne pas comprendre."],
  ["PK", "pk2", "Je peux adapter mon style d’enseignement à différents apprenants."],
  ["PK", "pk3", "Je peux utiliser un large éventail d’approches pédagogiques dans une configuration de cours."],
  ["PK", "pk4", "Je peux évaluer l’apprentissage des apprenants de plusieurs façons."],
  ["CK", "ck1", "J’ai une connaissance suffisante de ma discipline d’enseignement."],
  ["CK", "ck2", "Je peux utiliser un mode de pensée spécifique à ma discipline d’enseignement."],
  ["CK", "ck3", "Je connais les théories et les concepts de base de ma discipline d’enseignement."],
  ["CK", "ck4", "Je connais l’histoire et le développement des théories importantes dans ma discipline d’enseignement."],
  ["TK", "tk1", "Je pratique une veille sur les majeures nouvelles technologies."],
  ["TK", "tk2", "Je joue fréquemment avec les technologies."],
  ["TK", "tk3", "Je connais un grand nombre de technologies différentes."],
  ["TK", "tk4", "Je possède les compétences techniques nécessaires pour utiliser les technologies."],
  ["PCK", "pck1", "Je sais comment sélectionner des approches pédagogiques efficaces pour guider la réflexion et l’apprentissage des apprenants dans ma discipline d’enseignement."],
  ["PCK", "pck2", "Je sais comment développer des tâches appropriées pour favoriser une réflexion complexe des apprenants sur ma discipline d’enseignement."],
  ["PCK", "pck3", "Je sais comment développer des exercices permettant aux apprenants de consolider leurs connaissances dans ma discipline d’enseignement."],
  ["PCK", "pck4", "Je sais comment évaluer les performances des apprenants dans ma discipline d’enseignement."],
  ["TPK", "tpk1", "Je peux choisir des technologies qui améliorent les approches pédagogiques dans un cours."],
  ["TPK", "tpk2", "Je peux choisir des technologies qui améliorent l’apprentissage des apprenants pour un cours."],
  ["TPK", "tpk3", "Je peux adapter l’utilisation des technologies que j’apprends à différentes activités d’enseignement."],
  ["TPK", "tpk4", "Je réfléchis de manière critique à la façon d’utiliser les technologies dans ma salle de cours."],
  ["TCK", "tck1", "Je sais comment les développements technologiques ont changé le domaine de ma discipline."],
  ["TCK", "tck2", "Je peux expliquer quelles technologies ont été utilisées dans la recherche dans mon domaine."],
  ["TCK", "tck3", "Je sais quelles nouvelles technologies sont actuellement en cours de développement dans mon domaine."],
  ["TCK", "tck4", "Je sais comment utiliser les technologies pour participer au discours scientifique dans mon domaine."],
  ["TPACK", "tpck1", "Je peux utiliser des stratégies qui combinent le contenu, les technologies et les approches pédagogiques apprises lors de mes formations."],
  ["TPACK", "tpck2", "Je peux choisir des technologies qui améliorent le contenu d’un cours."],
  ["TPACK", "tpck3", "Je peux choisir des technologies à utiliser dans ma salle de cours qui améliorent ce que j’enseigne, la manière dont j’enseigne et ce que les apprenants retiennent."],
  ["TPACK", "tpck4", "Je peux enseigner des cours qui combinent de manière appropriée ma discipline d’enseignement, mes technologies et mes approches pédagogiques."]
];

const ipipBigFiveItems = [
  ["Extraversion", "Am the life of the party.", false],
  ["Extraversion", "Feel comfortable around people.", false],
  ["Extraversion", "Start conversations.", false],
  ["Extraversion", "Talk to a lot of different people at parties.", false],
  ["Extraversion", "Don’t mind being the center of attention.", false],
  ["Extraversion", "Don’t talk a lot.", true],
  ["Extraversion", "Keep in the background.", true],
  ["Extraversion", "Have little to say.", true],
  ["Extraversion", "Don’t like to draw attention to myself.", true],
  ["Extraversion", "Am quiet around strangers.", true],
  ["Agréabilité", "Am interested in people.", false],
  ["Agréabilité", "Sympathize with others’ feelings.", false],
  ["Agréabilité", "Have a soft heart.", false],
  ["Agréabilité", "Take time out for others.", false],
  ["Agréabilité", "Feel others’ emotions.", false],
  ["Agréabilité", "Make people feel at ease.", false],
  ["Agréabilité", "Am not really interested in others.", true],
  ["Agréabilité", "Insult people.", true],
  ["Agréabilité", "Am not interested in other people’s problems.", true],
  ["Agréabilité", "Feel little concern for others.", true],
  ["Conscience", "Am always prepared.", false],
  ["Conscience", "Pay attention to details.", false],
  ["Conscience", "Get chores done right away.", false],
  ["Conscience", "Like order.", false],
  ["Conscience", "Follow a schedule.", false],
  ["Conscience", "Am exacting in my work.", false],
  ["Conscience", "Leave my belongings around.", true],
  ["Conscience", "Make a mess of things.", true],
  ["Conscience", "Often forget to put things back in their proper place.", true],
  ["Conscience", "Shirk my duties.", true],
  ["Stabilité émotionnelle", "Am relaxed most of the time.", false],
  ["Stabilité émotionnelle", "Seldom feel blue.", false],
  ["Stabilité émotionnelle", "Get stressed out easily.", true],
  ["Stabilité émotionnelle", "Worry about things.", true],
  ["Stabilité émotionnelle", "Am easily disturbed.", true],
  ["Stabilité émotionnelle", "Get upset easily.", true],
  ["Stabilité émotionnelle", "Change my mood a lot.", true],
  ["Stabilité émotionnelle", "Have frequent mood swings.", true],
  ["Stabilité émotionnelle", "Get irritated easily.", true],
  ["Stabilité émotionnelle", "Often feel blue.", true],
  ["Ouverture", "Have a rich vocabulary.", false],
  ["Ouverture", "Have a vivid imagination.", false],
  ["Ouverture", "Have excellent ideas.", false],
  ["Ouverture", "Am quick to understand things.", false],
  ["Ouverture", "Use difficult words.", false],
  ["Ouverture", "Spend time reflecting on things.", false],
  ["Ouverture", "Am full of ideas.", false],
  ["Ouverture", "Have difficulty understanding abstract ideas.", true],
  ["Ouverture", "Am not interested in abstract ideas.", true],
  ["Ouverture", "Do not have a good imagination.", true]
];

function dims(labels) {
  return labels.map((label, index) => ({ id: slug(label), label, color: palette[index % palette.length] }));
}

function uniqueDims(items) {
  return [...new Set(items.map((item) => Array.isArray(item) ? item[0] : item.dimension))];
}

function q100(id, dimension, text) {
  return { id, dimensionId: slug(dimension), text, min: 0, max: 100, step: 10, weight: 1, kind: "range" };
}

function qLikert(id, dimension, text, reverse = false, code = "") {
  return { id, code, dimensionId: slug(dimension), text, min: 1, max: 5, step: 1, weight: 1, kind: "likert", reverse };
}

function qText(id, dimension, text, code = "") {
  return { id, code, dimensionId: slug(dimension), text, kind: "text", weight: 0 };
}

function sec(dimension, text, reverse, code) {
  return { kind: "likert", dimension, text, reverse, code };
}

function confidenceScale() {
  return { type: "confidence", min: 0, max: 100, step: 10, anchors: ["Ne peut pas du tout faire", "Peut modérément faire", "Très certain de pouvoir faire"] };
}

function likert5(minLabel = "Jamais", maxLabel = "Souvent") {
  return { type: "likert", min: 1, max: 5, step: 1, anchors: [minLabel, "Plutôt non", "Intermédiaire", "Plutôt oui", maxLabel] };
}

function confidenceFeedback(low, high) {
  return [
    { min: 0, max: 39, text: low },
    { min: 40, max: 69, text: "Le profil est en construction : certaines dimensions peuvent être stabilisées par des situations concrètes." },
    { min: 70, max: 100, text: high }
  ];
}

function slug(value) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
