import { createGardnerData } from "../gardner.js";
import { createDefaultAtmospheres } from "./atmospheres.js";
import { createAssessment } from "./assessments.js";
import { createAssessmentFromPreset } from "./assessment-presets.js";
import { createDefaultAvatar } from "./visuals.js";
import { morphologyState } from "./morphology.js";
import { componentSources } from "./component-sources.js";

export const SCHEMA_VERSION = 1;

export const moduleCatalog = [
  { type: "rich-text", label: "Texte riche", category: "Contenus", icon: "Type", layout: [12, 3] },
  { type: "starter-pack", label: "Starter pack", category: "Collections", icon: "Shapes", layout: [8, 4] },
  { type: "constellation", label: "Constellation", category: "Personnalisation", icon: "Orbit", layout: [4, 6] },
  { type: "portrait-chinois", label: "Portrait chinois", category: "Quiz & portraits", icon: "CircleDot", layout: [4, 4] },
  { type: "values", label: "Valeurs en tension", category: "Tests & questionnaires", icon: "SlidersHorizontal", layout: [4, 4] },
  { type: "manual", label: "Mode d'emploi", category: "Personnalisation", icon: "NotebookTabs", layout: [8, 4] },
  { type: "timeline", label: "Chronique", category: "Parcours", icon: "GitCommitHorizontal", layout: [8, 4] },
  { type: "self-efficacy", label: "Efficacité personnelle", category: "Tests & questionnaires", icon: "Activity", layout: [4, 4] },
  { type: "learner-efficacy", label: "Auto-efficacité apprenante", category: "Tests & questionnaires", icon: "GraduationCap", layout: [4, 4] },
  { type: "collective-efficacy", label: "Efficacité collective", category: "Tests & questionnaires", icon: "UsersRound", layout: [4, 4] },
  { type: "collective-intelligence", label: "Intelligences collectives", category: "Tests & questionnaires", icon: "Network", layout: [6, 4] },
  { type: "sic-compact", label: "SICsIA court", category: "Tests & questionnaires", icon: "Waypoints", layout: [4, 4] },
  { type: "sic-long", label: "SICsIA recherche", category: "Tests & questionnaires", icon: "Route", layout: [6, 5] },
  { type: "tpack", label: "TPACK.xs", category: "Tests & questionnaires", icon: "MonitorCog", layout: [4, 4] },
  { type: "personality", label: "Big Five IPIP", category: "Tests & questionnaires", icon: "Fingerprint", layout: [4, 4] },
  { type: "gardner", label: "Mes huit terrains de jeu", category: "Tests & questionnaires", icon: "Radar", layout: [8, 5] },
  { type: "cognitive", label: "Défis cognitifs", category: "Jeux & défis", icon: "BrainCircuit", layout: [4, 4] },
  { type: "link-card", label: "Lien enrichi", category: "Web & médias", icon: "Link2", layout: [4, 3] },
  { type: "embed", label: "Intégration", category: "Web & médias", icon: "PanelsTopLeft", layout: [6, 4] }
];

const profileParts = {
  first: ["Brume", "Silex", "Moka", "Pixel", "Velours", "Mistral", "Comète", "Bambou", "Quartz", "Nuage", "Tempo", "Zeste"],
  second: ["Lynx", "Poulpe", "Bison", "Gecko", "Morse", "Luciole", "Panda", "Corbeau", "Koala", "Loutre", "Faucon", "Maki"],
  third: ["Cosmique", "Oblique", "Nomade", "Magnétique", "Solaire", "Élastique", "Minuscule", "Analogique", "Nocturne", "Fluide", "Volcanique", "Tempo"]
};

export function generateProfileName(seed = Date.now()) {
  let value = Math.abs(Math.sin(Number(seed)) * 10000);
  const take = (list) => {
    value = (value * 9301 + 49297) % 233280;
    return list[Math.floor((value / 233280) * list.length)];
  };
  return `${take(profileParts.first)} ${take(profileParts.second)} ${take(profileParts.third)}`;
}

const demoResponses = Object.fromEntries(Array.from({ length: 72 }, (_, index) => [
  `g${index + 1}`,
  new Set([2, 3, 6, 7, 8, 10, 12, 14, 20, 22, 25, 28, 32, 35, 39, 40, 43, 44, 50, 51, 55, 56, 58, 59, 60, 61, 62, 63, 67, 69, 72]).has(index + 1)
]));

export function createDefaultProfile() {
  const atmospheres = createDefaultAtmospheres();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: crypto.randomUUID(),
    identity: {
      name: generateProfileName(42),
      source: "generated",
      avatar: createDefaultAvatar("Bambou Koala Solaire")
    },
    atmospheres,
    activeAtmosphereId: "ink",
    morphology: morphologyState("modulop-v36"),
    credits: componentSources.map(({ id, source, author, concept, license, status, implementation }) => ({ id, source, author, concept, license, status, implementation })),
    updatedAt: new Date().toISOString(),
    uiPreferences: {
      panels: {
        menu: { mode: "dock", edge: "right", size: 390 },
        library: { mode: "dock", edge: "right", size: 520 },
        editor: { mode: "dock", edge: "right", size: 520 },
        assessment: { mode: "dock", edge: "right", size: 680 },
        appearance: { mode: "dock", edge: "right", size: 520 },
        atmosphere: { mode: "dock", edge: "right", size: 560 },
        about: { mode: "dock", edge: "bottom", size: 420 }
      }
    },
    modules: [
      {
        id: crypto.randomUUID(), type: "rich-text", title: "Portrait modulaire", variant: "editorial", layout: gridLayout(0, 0, 12, 4, 6, 4),
        presentation: presentation("rich-text-editorial", "default", { fontFamily: "newsreader", fontWeight: 400, fontScale: 100, lineHeight: 92, align: "left", maxWidth: 1150 }),
        data: { eyebrow: "Portrait modulaire", markdown: "# Je fabrique des liens entre les idées, les objets et les gens.", scale: "hero" }
      },
      {
        id: crypto.randomUUID(), type: "starter-pack", title: "Mon starter pack", variant: "shelf", layout: gridLayout(0, 3, 8, 4, 4, 3),
        presentation: presentation("starter-pack"),
        data: { items: [
          { id: crypto.randomUUID(), visual: "☕", label: "Tasse en grès", note: "Rituel quotidien" },
          { id: crypto.randomUUID(), visual: "▦", label: "Carnet quadrillé", note: "Penser par fragments" },
          { id: crypto.randomUUID(), visual: "🎧", label: "Casque filaire", note: "Bulle de concentration" },
          { id: crypto.randomUUID(), visual: "🌿", label: "Branche de romarin", note: "Mémoire des lieux" },
          { id: crypto.randomUUID(), visual: "📷", label: "Appareil compact", note: "Collecter l'ordinaire" },
          { id: crypto.randomUUID(), visual: "🃏", label: "Jeu de cartes", note: "Créer des contraintes" }
        ] }
      },
      {
        id: crypto.randomUUID(), type: "constellation", title: "Constellation", variant: "network", layout: gridLayout(8, 3, 4, 6, 3, 3),
        presentation: presentation("constellation-d3"),
        data: { nodes: ["Design", "Psychologie", "Objets", "Musique", "Systèmes", "Écriture", "Cuisine"].map((label, index) => ({
          id: `node-${index}`, label, weight: index ? 45 + index * 6 : 100, category: index ? "satellite" : "core"
        })), links: Array.from({ length: 6 }, (_, index) => ({ id: crypto.randomUUID(), source: "node-0", target: `node-${index + 1}`, weight: 50 })) }
      },
      {
        id: crypto.randomUUID(), type: "portrait-chinois", title: "Portrait chinois", variant: "editorial", layout: gridLayout(0, 7, 4, 4, 3, 3),
        presentation: presentation("portrait-editorial"),
        data: { prompt: "Si j'étais un lieu", answer: "Une gare au bord de la mer", note: "Du passage, du mouvement, mais toujours une ligne d'horizon." }
      },
      {
        id: crypto.randomUUID(), type: "values", title: "Valeurs en tension", variant: "balance", layout: gridLayout(4, 7, 4, 5, 3, 5),
        presentation: presentation("values-balance", "segmented"),
        data: { pairs: [
          { left: "Liberté", right: "Structure", value: 62 },
          { left: "Profondeur", right: "Vitesse", value: 76 },
          { left: "Intuition", right: "Preuve", value: 48 }
        ] }
      },
      {
        id: crypto.randomUUID(), type: "gardner", title: "Mes huit terrains de jeu", variant: "radar", layout: gridLayout(0, 11, 8, 5, 5, 4),
        presentation: presentation("gardner-echarts"),
        data: { ...createGardnerData(), responses: demoResponses, completedAt: new Date().toISOString() }
      },
      {
        id: crypto.randomUUID(), type: "manual", title: "Mode d'emploi", variant: "notes", layout: gridLayout(0, 16, 8, 4, 4, 3),
        presentation: presentation("manual-notes"),
        data: { items: [
          { id: crypto.randomUUID(), label: "Pour démarrer", value: "Donnez-moi le problème, pas encore la solution.", visual: { kind: "icon", name: "Play" } },
          { id: crypto.randomUUID(), label: "Pour un retour utile", value: "Soyez direct, précis et laissez une nuit de décantation.", visual: { kind: "icon", name: "MessageSquareText" } },
          { id: crypto.randomUUID(), label: "Quand ça bloque", value: "Changer de support débloque souvent la pensée.", visual: { kind: "icon", name: "RefreshCw" } }
        ] }
      },
      {
        id: crypto.randomUUID(), type: "timeline", title: "Chronique", variant: "vertical", layout: gridLayout(8, 16, 4, 4, 3, 3),
        presentation: presentation("timeline-editorial"),
        data: structuredClone(templates.timeline)
      },
      {
        id: crypto.randomUUID(), type: "self-efficacy", title: "Efficacité personnelle", variant: "gauge", layout: gridLayout(0, 20, 4, 4, 3, 3),
        presentation: presentation("efficacy-assessment", "expressive"),
        data: createAssessmentFromPreset("bandura-self-efficacy-fr")
      },
      {
        id: crypto.randomUUID(), type: "collective-efficacy", title: "Efficacité collective", variant: "cards", layout: gridLayout(4, 20, 4, 4, 3, 3),
        presentation: presentation("collective-efficacy-assessment", "segmented"),
        data: createAssessmentFromPreset("collective-efficacy-team")
      },
      {
        id: crypto.randomUUID(), type: "collective-intelligence", title: "Intelligences collectives", variant: "radar", layout: gridLayout(8, 20, 4, 4, 3, 3),
        presentation: presentation("collective-intelligence-assessment", "bubble"),
        data: createAssessmentFromPreset("sic22-full")
      },
      {
        id: crypto.randomUUID(), type: "link-card", title: "Lien enrichi", variant: "editorial", layout: gridLayout(0, 24, 4, 3, 3, 2),
        presentation: presentation("link-card"),
        data: structuredClone(templates["link-card"])
      },
      {
        id: crypto.randomUUID(), type: "embed", title: "Intégration", variant: "responsive", layout: gridLayout(4, 24, 6, 4, 4, 3),
        presentation: presentation("embed-safe"),
        data: structuredClone(templates.embed)
      }
    ]
  };
}

export function createProfileFromTemplate(template = "blank") {
  const profile = createDefaultProfile();
  const sets = {
    blank: ["rich-text"],
    starter: ["rich-text", "starter-pack", "portrait-chinois", "values", "manual"],
    tests: ["rich-text", "self-efficacy", "collective-efficacy", "collective-intelligence", "sic-compact", "sic-long", "tpack", "personality", "gardner"],
    portfolio: ["rich-text", "starter-pack", "timeline", "portrait-chinois", "link-card", "manual"],
    "research-sicsia": ["rich-text", "collective-intelligence", "sic-compact", "sic-long", "collective-efficacy", "timeline"],
    media: ["rich-text", "link-card", "embed", "starter-pack", "constellation"]
  };
  const keep = new Set(sets[template] || sets.blank);
  profile.id = crypto.randomUUID();
  profile.template = template;
  profile.modules = profile.modules.filter((module) => keep.has(module.type)).map((module, index) => ({
    ...module,
    id: crypto.randomUUID(),
    layout: { ...module.layout, x: index % 2 ? 6 : 0, y: Math.floor(index / 2) * 5 }
  }));
  if (template === "blank") {
    profile.modules[0].title = "Nouveau profil";
    profile.modules[0].data = { eyebrow: "Nouveau départ", markdown: "# Commencez par écrire une première intention.", scale: "hero" };
  }
  profile.updatedAt = new Date().toISOString();
  return profile;
}

const templates = {
  "rich-text": { eyebrow: "Fragment éditorial", markdown: "# Une nouvelle phrase à écrire.", scale: "hero" },
  "starter-pack": { items: [{ id: crypto.randomUUID(), visual: "◇", label: "Nouvel objet", note: "Pourquoi il compte" }] },
  constellation: (() => {
    const nodes = ["Curiosité", "Sujet", "Influence", "Obsession"].map((label, index) => ({ id: crypto.randomUUID(), label, weight: index ? 55 : 100, category: index ? "satellite" : "core" }));
    return { nodes, links: nodes.slice(1).map((node) => ({ id: crypto.randomUUID(), source: nodes[0].id, target: node.id, weight: 50 })) };
  })(),
  "portrait-chinois": { prompt: "Si j'étais une matière", answer: "Papier calque", note: "Pour superposer les idées." },
  values: { pairs: [{ left: "Liberté", right: "Structure", value: 50 }] },
  manual: { items: [{ label: "Pour bien travailler avec moi", value: "Une indication concrète." }] },
  timeline: { events: [{ year: "Aujourd'hui", title: "Nouveau moment", text: "Ce qui change maintenant." }] },
  "self-efficacy": createAssessmentFromPreset("learner-self-efficacy"),
  "learner-efficacy": createAssessmentFromPreset("learner-self-efficacy"),
  "collective-efficacy": createAssessmentFromPreset("collective-efficacy-team"),
  "collective-intelligence": createAssessmentFromPreset("sic22-full"),
  "sic-compact": createAssessmentFromPreset("sicsia-short"),
  "sic-long": createAssessmentFromPreset("sicsia-long"),
  tpack: createAssessmentFromPreset("tpack-xs-fr"),
  personality: createAssessmentFromPreset("ipip-big-five-50"),
  gardner: createGardnerData(),
  cognitive: createAssessmentFromPreset("sic-compact"),
  "link-card": { url: "https://example.org", title: "Une ressource à relier au profil", description: "Ajoutez une URL et complétez son aperçu local.", image: "", provider: "web" },
  embed: { input: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", provider: "youtube", title: "Vidéo intégrée", ratio: "16/9" }
};

export function createModule(type) {
  const definition = moduleCatalog.find((item) => item.type === type);
  return {
    id: crypto.randomUUID(),
    type,
    title: definition?.label || "Nouveau fragment",
    variant: type === "constellation" ? "network" : type === "gardner" ? "radar" : "default",
    layout: gridLayout(undefined, undefined, definition?.layout[0] || 4, definition?.layout[1] || 4, 3, 2),
    presentation: presentation(`${type}-default`, ["values", "self-efficacy"].includes(type) ? "bubble" : "default",
      type === "rich-text" ? { fontFamily: "newsreader", fontWeight: 400, fontScale: 100, lineHeight: 100, align: "left", maxWidth: 960 } : {}),
    data: structuredClone(templates[type] || {})
  };
}

function gridLayout(x, y, w, h, minW = 3, minH = 2) {
  return { x, y, w, h, minW, minH };
}

function presentation(rendererId, themeId = "default", options = {}) {
  return { rendererId, themeId, options };
}

function selfEfficacyAssessment() {
  return createAssessment({
    id: "self-efficacy",
    title: "Sentiment d’efficacité personnelle",
    dimensions: [
      { id: "agency", label: "Capacité d’agir", color: "#74d8d1" },
      { id: "persistence", label: "Persévérance", color: "#f2764b" }
    ],
    questions: [
      { id: "se1", dimensionId: "agency", text: "Je trouve plusieurs moyens d’avancer face à une difficulté.", min: 0, max: 10, weight: 1 },
      { id: "se2", dimensionId: "agency", text: "Je peux mobiliser les ressources nécessaires.", min: 0, max: 10, weight: 1 },
      { id: "se3", dimensionId: "persistence", text: "Je poursuis l’effort quand les premiers essais échouent.", min: 0, max: 10, weight: 1 },
      { id: "se4", dimensionId: "persistence", text: "Je transforme les retours en prochaines actions.", min: 0, max: 10, weight: 1 }
    ],
    feedback: [{ min: 0, max: 49, text: "Votre marge de progression repose d’abord sur de petites réussites observables." }, { min: 50, max: 100, text: "Vous disposez d’un socle d’action solide, particulièrement utile dans les situations incertaines." }]
  });
}

function cognitiveAssessment() {
  return createAssessment({
    id: "cognitive",
    title: "Défis cognitifs",
    dimensions: [
      { id: "logic", label: "Logique", color: "#c7ec6f" },
      { id: "pattern", label: "Détection de motifs", color: "#74d8d1" }
    ],
    questions: [
      { id: "cq1", dimensionId: "pattern", text: "Complétez : △ ○ △ □ …", min: 0, max: 1, weight: 1, kind: "choice", choices: ["○", "△", "□"], correct: "○" },
      { id: "cq2", dimensionId: "logic", text: "Tous les fragments sont modulaires. Cet élément est un fragment. Est-il modulaire ?", min: 0, max: 1, weight: 1, kind: "choice", choices: ["Oui", "Non"], correct: "Oui" }
    ],
    feedback: [{ min: 0, max: 49, text: "Ces défis servent d’échauffement : la stratégie compte davantage que la vitesse." }, { min: 50, max: 100, text: "Vous repérez rapidement les régularités et les relations logiques." }]
  });
}
