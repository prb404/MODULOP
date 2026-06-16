export const gardnerDimensions = [
  { id: "verbal", short: "VL", label: "Verbale / linguistique", color: "#f07b52" },
  { id: "logical", short: "LM", label: "Logique / mathématique", color: "#d7ef76" },
  { id: "visual", short: "VS", label: "Visuelle / spatiale", color: "#71d7d1" },
  { id: "musical", short: "MR", label: "Musicale / rythmique", color: "#8ea6ff" },
  { id: "bodily", short: "K", label: "Kinesthésique", color: "#ef9ca9" },
  { id: "interpersonal", short: "INTER", label: "Interpersonnelle", color: "#ffbe65" },
  { id: "intrapersonal", short: "INTRA", label: "Intrapersonnelle", color: "#bda0f2" },
  { id: "naturalist", short: "N", label: "Naturaliste", color: "#7fcf8a" }
];

const dimensionItems = {
  verbal: [67, 62, 56, 32, 22, 20, 12, 10, 3],
  logical: [47, 38, 33, 31, 27, 23, 13, 11, 1],
  visual: [72, 60, 55, 54, 40, 28, 16, 7, 6],
  musical: [69, 63, 50, 45, 39, 26, 18, 14, 4],
  bodily: [71, 68, 65, 46, 42, 34, 30, 24, 5],
  interpersonal: [66, 58, 48, 43, 36, 35, 15, 9, 2],
  intrapersonal: [61, 59, 52, 51, 44, 25, 21, 17, 8],
  naturalist: [70, 64, 57, 53, 49, 41, 37, 29, 19]
};

const statements = [
  "Je me pose beaucoup de questions sur le fonctionnement des objets.",
  "J’offre spontanément de l’aide à mes amis lorsqu’ils en ont besoin.",
  "J’aime beaucoup raconter des histoires ou des blagues.",
  "Je suis sensible aux bruits et aux sons.",
  "Je pratique régulièrement des activités physiques ou sportives.",
  "J’apprécie les arts visuels, la peinture ou la sculpture.",
  "Je vois des images dans ma tête quand je pense à quelque chose.",
  "Je suis indépendant et je tiens à mes idées.",
  "Je semble être une personne appréciée.",
  "J’aime lire pendant mes temps libres.",
  "Je trouve rapidement les failles dans le raisonnement des gens.",
  "Prendre des notes m’aide à comprendre et à mémoriser.",
  "Je compte rapidement dans ma tête.",
  "Je me rappelle facilement les mélodies que j’entends.",
  "J’aime jouer aux cartes ou aux jeux de société.",
  "Je tiens mon espace en ordre : une place pour chaque chose.",
  "Je suis motivé à travailler seul sur certains projets.",
  "Il m’est facile de bouger et de danser en rythme.",
  "Le contact avec la nature m’apaise.",
  "Je suis intéressé par l’écoute de conférences ou d’exposés.",
  "J’ai besoin de savoir pourquoi je devrais faire quelque chose avant de l’accepter.",
  "J’ai une bonne mémoire de ce que je lis ou entends.",
  "Le fait d’être structuré contribue au succès de ce que j’entreprends.",
  "Je parle souvent avec mes mains.",
  "Je décide par moi-même ce que je pense, choisis et fais.",
  "Je peux suivre la mesure dans une pièce musicale.",
  "Je m’intéresse aux processus scientifiques expérimentaux.",
  "Je lis des cartes, tableaux et diagrammes sans difficulté.",
  "Je me préoccupe de l’environnement dans mes gestes quotidiens.",
  "Je suis habile de mes mains et j’aime travailler avec des outils.",
  "Je suis habile aux jeux de stratégie.",
  "Je m’exprime avec un vocabulaire riche.",
  "Avant de décider, je pèse le pour et le contre.",
  "J’aime créer de mes mains : dessiner, fabriquer ou sculpter.",
  "On me consulte lorsqu’il y a un conflit dans un groupe.",
  "J’aime bavarder sur tout et rien.",
  "J’aime être en contact avec les animaux ou les observer.",
  "Je peux passer beaucoup de temps à résoudre des problèmes.",
  "Je m’intéresse à toutes sortes de musiques et j’en écoute régulièrement.",
  "Dans un livre illustré, je regarde volontiers les illustrations d’abord.",
  "J’aime classifier et catégoriser.",
  "Je touche volontiers les objets pour mieux les découvrir.",
  "Je suis à l’écoute des sentiments des autres et j’en tiens compte.",
  "Je réagis fortement aux opinions controversées.",
  "J’ai du mal à me concentrer lorsque j’écoute simultanément la radio ou la télévision.",
  "J’apprends en faisant.",
  "J’adore les énigmes et casse-têtes logiques.",
  "J’organise souvent des activités dans mon entourage.",
  "J’aime collectionner des objets puis les classer.",
  "J’aime les concerts, récitals ou comédies musicales.",
  "J’ai confiance en moi.",
  "Je suis entreprenant.",
  "J’ai la main verte.",
  "Je m’oriente facilement dans une nouvelle ville.",
  "J’aime regarder des films et des photographies.",
  "J’ai de la facilité à écrire.",
  "J’aime jardiner ou m’occuper de plantes.",
  "J’aime m’exprimer dans les discussions.",
  "J’aime réfléchir à ma vie, mes désirs et mes croyances.",
  "J’aime les exercices de visualisation et imaginer un espace transformé.",
  "Je travaille bien seul.",
  "J’aime les mots croisés et les jeux de lettres.",
  "Je suis facilement ému par la musique ou les chansons.",
  "J’aime les randonnées de plein air.",
  "J’aime monter et démonter des objets.",
  "Je participe à des clubs ou activités collectives.",
  "J’ai une bonne mémoire des noms, dates, lieux ou détails.",
  "Je peux imiter les gestes ou manières d’autres personnes.",
  "Je suis sensible à la musicalité de la parole et des textes.",
  "Je travaille mieux lorsque les données sont organisées et classées.",
  "J’ai du mal à rester assis trop longtemps et j’ai besoin de bouger.",
  "Je reconnais facilement la rotation d’une figure dans l’espace."
];

const dimensionByItem = new Map();
Object.entries(dimensionItems).forEach(([dimension, numbers]) => {
  numbers.forEach((number) => dimensionByItem.set(number, dimension));
});

export const gardnerQuestions = statements.map((statement, index) => ({
  id: `g${index + 1}`,
  number: index + 1,
  statement,
  dimension: dimensionByItem.get(index + 1)
}));

export function scoreGardner(responses = {}) {
  return gardnerDimensions.map((dimension) => {
    const questions = gardnerQuestions.filter((question) => question.dimension === dimension.id);
    const value = questions.reduce((sum, question) => sum + (responses[question.id] ? 1 : 0), 0);
    return { ...dimension, value, max: questions.length, percent: Math.round((value / questions.length) * 100) };
  });
}

export function createGardnerData() {
  return {
    page: 0,
    responses: {},
    completedAt: null
  };
}
