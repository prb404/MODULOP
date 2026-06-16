export const componentSources = [
  {
    id: "range-expressive-verly",
    family: "range",
    source: "https://codepen.io/anuraghazra/pen/agKJEd",
    author: "Anurag Hazra",
    concept: "Verly Range Slider : piste SVG élastique attachée à la poignée.",
    license: "Licence non confirmée dans le prototype local.",
    status: "adapted",
    implementation: "range/expressive",
    policy: "Réimplémentation MODULOP, aucun code source tiers copié."
  },
  {
    id: "range-segmented",
    family: "range",
    source: "https://codepen.io/mukealicious/pen/jWoeZY",
    author: "mukealicious",
    concept: "Piste découpée en zones de sens et repères visuels.",
    license: "Licence non confirmée dans le prototype local.",
    status: "adapted",
    implementation: "range/segmented",
    policy: "Réimplémentation accessible et thémable."
  },
  {
    id: "range-bubble",
    family: "range",
    source: "https://codepen.io/krisztian/pen/xOmORd",
    author: "Krisztian",
    concept: "Bulle de valeur suivant la poignée.",
    license: "Licence non confirmée dans le prototype local.",
    status: "adapted",
    implementation: "range/bubble",
    policy: "Réimplémentation MODULOP."
  },
  {
    id: "range-bands",
    family: "range",
    source: "https://codepen.io/kunukn/pen/obJEJE",
    author: "kunukn",
    concept: "Bandes superposées et lectures multi-valeurs.",
    license: "Licence non confirmée dans le prototype local.",
    status: "adapted",
    implementation: "multiRange/bands",
    policy: "Réimplémentation MODULOP."
  },
  {
    id: "switch-aaroniker",
    family: "switch",
    source: "https://codepen.io/aaroniker/pen/GRRVWvE",
    author: "Aaron Iker",
    concept: "Micro-interactions de switch fluides.",
    license: "Licence non confirmée dans le prototype local.",
    status: "inspiration-only",
    implementation: "switch/morphic",
    policy: "Inspiration visuelle uniquement."
  },
  {
    id: "motion-chrisgannon-1",
    family: "micro-interaction",
    source: "https://codepen.io/chrisgannon/pen/xweVNM",
    author: "Chris Gannon",
    concept: "Animation SVG expressive pour feedback d’interface.",
    license: "Licence non confirmée dans le prototype local.",
    status: "inspiration-only",
    implementation: "motion/future",
    policy: "Inspiration visuelle uniquement."
  },
  {
    id: "motion-chrisgannon-2",
    family: "micro-interaction",
    source: "https://codepen.io/chrisgannon/pen/GZNgLw",
    author: "Chris Gannon",
    concept: "Feedback animé pour contrôles riches.",
    license: "Licence non confirmée dans le prototype local.",
    status: "inspiration-only",
    implementation: "motion/future",
    policy: "Inspiration visuelle uniquement."
  },
  {
    id: "select-zephyo",
    family: "search-select",
    source: "https://codepen.io/zephyo/pen/MZbLwV",
    author: "Zephyo",
    concept: "Sélection filtrable rapide et compacte.",
    license: "Licence non confirmée dans le prototype local.",
    status: "inspiration-only",
    implementation: "search-select/future",
    policy: "Inspiration visuelle uniquement."
  }
];

export const assessmentSources = [
  {
    id: "bandura-self-efficacy-fr",
    label: "Bandura / self-efficacy",
    source: "Classeur SCALES/SIC fourni localement",
    status: "adapted",
    fidelity: "sélection représentative, car le document source agrège plusieurs échelles"
  },
  {
    id: "sec-team",
    label: "Sentiment d’efficacité collective",
    source: "Classeur SCALES/SIC fourni localement",
    status: "faithful",
    fidelity: "31 items conservés, dont 2 questions ouvertes non scorées"
  },
  {
    id: "sic-source",
    label: "SIC source",
    source: "SICsIA.md et classeur SCALES/SIC fournis localement",
    status: "faithful",
    fidelity: "23 items source conservés"
  },
  {
    id: "sicsia",
    label: "SICsIA",
    source: "SICsIA.md fourni localement",
    status: "faithful",
    fidelity: "versions courte 17 items et recherche 35 items conservées"
  },
  {
    id: "tpack-xs-fr",
    label: "TPACK.xs",
    source: "Classeur SCALES/SIC fourni localement",
    status: "translated",
    fidelity: "28 items conservés et traduits/adaptés en français"
  },
  {
    id: "ipip-big-five-50",
    label: "Big Five IPIP-50",
    source: "https://ipip.ori.org/",
    status: "permissive",
    fidelity: "50 items IPIP publics conservés en anglais"
  },
  {
    id: "rrs-spi27",
    label: "RRS / SPI-27",
    source: "à documenter avant intégration",
    status: "deferred",
    fidelity: "non intégrés dans cette passe : itemisation et droits à vérifier avant usage"
  }
];

export function sourcesForImplementation(implementation) {
  return componentSources.filter((item) => item.implementation === implementation);
}

export function creditsMarkdown(version) {
  return `# À propos de MODULOP

MODULOP est un prototype local, sans compte, conçu pour composer des profils modulaires et exportables.

Version applicative : **${version?.display || "prototype local"}**.

## Bibliothèques principales

- Vite pour le build statique.
- GridStack pour la grille redimensionnable et repositionnable.
- ECharts, D3 et Three.js pour les rendus de datavisualisation chargés à la demande.
- TOAST UI Editor, CodeMirror, Marked et DOMPurify pour le Markdown et le rendu sécurisé.
- Dexie et JSZip pour le stockage local, les médias et les exports autonomes.
- Lucide, Tabler Icons, Material Symbols, Fontsource et emoji-picker-element pour l’interface et les visuels.

## Inspirations de composants

${componentSources.map((item) => `- [${item.concept}](${item.source}) — ${item.author}. Statut : **${item.status}**. ${item.policy}`).join("\n")}

## Sources de questionnaires

${assessmentSources.map((item) => `- **${item.label}** — ${item.source}. Statut : **${item.status}**. Fidélité : ${item.fidelity}.`).join("\n")}

## Politique de réutilisation

Les sources externes sont créditées. Le code non accompagné d’une licence permissive explicite n’est pas copié : il est traité comme inspiration et réimplémenté dans les primitives MODULOP afin de rester accessible, thémable, maintenable et exportable.

## Données de démonstration

Les questionnaires intégrés sont des presets de travail modifiables. Les versions issues de documents fournis localement conservent les dimensions et items disponibles dans ces sources, sauf mention explicite. Ils servent à tester le moteur d’évaluation et les rendus, sans constituer des instruments psychométriques certifiés.`;
}
