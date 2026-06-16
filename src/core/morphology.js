const SCENES = [
  {
    colors: { bg: "#11130f", surface: "#171a15", surface2: "#1c2019", surface3: "#252a21", text: "#f4f1e8", muted: "#9ca294", accent: "#f2764b", aqua: "#74d8d1", acid: "#c7ec6f", danger: "#ff8b7b" },
    background: { mode: "gradient", angle: 145, texture: 7, animated: false, stops: ["#11130f", "#15180f"] }
  },
  {
    colors: { bg: "#102018", surface: "#162a20", surface2: "#1d3428", surface3: "#294536", text: "#f0f7e8", muted: "#a7b7a2", accent: "#df8a4c", aqua: "#7bd4bd", acid: "#b9e66e", danger: "#ff897a" },
    background: { mode: "mesh", angle: 120, texture: 9, animated: true, stops: ["#102018", "#1f3d2d", "#294536"] }
  },
  {
    colors: { bg: "#ede8dc", surface: "#f6f1e7", surface2: "#fffaf0", surface3: "#e7e0d2", text: "#25261f", muted: "#696c61", accent: "#b85e3b", aqua: "#247f7b", acid: "#667d1e", danger: "#b23b31" },
    background: { mode: "solid", angle: 145, texture: 4, animated: false, stops: ["#ede8dc", "#f6f1e7"] }
  },
  {
    colors: { bg: "#f8f4ec", surface: "#fffaf2", surface2: "#f1eadf", surface3: "#e7ded0", text: "#23251f", muted: "#6f7067", accent: "#a75f45", aqua: "#2c8982", acid: "#6c812c", danger: "#b14d43" },
    background: { mode: "radial", angle: 145, texture: 3, animated: false, stops: ["#fffdf8", "#f8f4ec", "#ece2d3"] }
  },
  {
    colors: { bg: "#0e1015", surface: "#151821", surface2: "#1b1f2a", surface3: "#262b39", text: "#f4f5fa", muted: "#9aa1b5", accent: "#ff5f87", aqua: "#62e6ff", acid: "#d7ff5c", danger: "#ff7b8d" },
    background: { mode: "gradient", angle: 135, texture: 5, animated: true, stops: ["#0e1015", "#151024", "#132337"] }
  }
];

const VARIANTS = {
  "rich-text": ["editorial", "compact", "manifesto"], "starter-pack": ["shelf", "tiles", "editorial"],
  constellation: ["network", "space"], "portrait-chinois": ["editorial", "cards", "gallery"],
  values: ["balance", "gauge", "radar"], manual: ["notes", "cards", "path"],
  timeline: ["vertical", "horizontal", "cards"], "self-efficacy": ["range", "gauge", "radar"],
  cognitive: ["cards", "bars", "radar"], gardner: ["radar", "bars", "orbit"],
  "link-card": ["compact", "editorial"], embed: ["responsive"]
};

export class MorphologyEngine {
  generateProfile(profile, seed = Date.now()) {
    const random = seeded(seed);
    profile.morphology ||= morphologyState(seed);
    profile.morphology.seed = String(seed);
    profile.morphology.generatedAt = new Date().toISOString();
    const atmosphere = profile.atmospheres.find((item) => item.id === profile.activeAtmosphereId);
    this.generateAtmosphere(atmosphere, random, profile.morphology.locks.atmosphere || {});
    profile.modules.forEach((module, index) => this.generateModule(module, random, profile.morphology.locks.modules[module.id] || {}, index));
    return profile;
  }

  generateAtmosphere(atmosphere, random, locks = {}) {
    const scene = pick(random, SCENES);
    if (!locks.palette) atmosphere.colors = structuredClone(scene.colors);
    if (!locks.background) Object.assign(atmosphere.background, structuredClone(scene.background), {
      angle: (scene.background.angle + integer(random, -18, 18) + 360) % 360,
      texture: Math.max(0, scene.background.texture + integer(random, -2, 2))
    });
    if (!locks.typography) Object.assign(atmosphere.typography, {
      sans: pick(random, ["inter", "system-humanist", "system-sans"]),
      serif: pick(random, ["newsreader", "system-classic", "system-book"]), scale: integer(random, 94, 108)
    });
    if (!locks.shape) Object.assign(atmosphere.shape, { radius: integer(random, 10, 30), borderOpacity: integer(random, 8, 22), shadow: integer(random, 15, 58) });
    if (!locks.motion) atmosphere.motion.intensity = integer(random, 65, 120);
    if (!locks.icons) Object.assign(atmosphere.icons, { provider: pick(random, ["lucide", "tabler", "material"]), size: integer(random, 16, 22) });
    if (!locks.header) Object.assign(atmosphere.header, { mode: pick(random, ["off", "reveal", "always"]), effect: pick(random, ["glide", "fade", "scale"]), typeScale: integer(random, 92, 112) });
    if (!locks.controls) atmosphere.controls = { rangeTheme: pick(random, ["expressive", "segmented", "bubble", "bands", "magnetic", "ribbon", "pulse", "minimal"]) };
  }

  generateModule(module, random, locks = {}, index = 0) {
    if (!locks.variant) module.variant = pick(random, VARIANTS[module.type] || [module.variant]);
    if (!locks.presentation) {
      module.presentation.themeId = pick(random, ["expressive", "segmented", "bubble", "bands", "magnetic", "ribbon", "pulse", "minimal"]);
      Object.assign(module.presentation.options, {
        radius: integer(random, 10, 32), density: integer(random, 85, 115), motion: integer(random, 55, 120)
      });
    }
    if (!locks.layout) {
      const widths = module.type === "rich-text" ? [8, 10, 12] : [4, 6, 8];
      module.layout.w = Math.max(module.layout.minW || 3, pick(random, widths));
      module.layout.h = Math.max(module.layout.minH || 2, module.layout.h + integer(random, -1, 1));
      module.layout.x = index % 2 ? 6 : 0;
      module.layout.y = undefined;
    }
  }

  unlock(profile, scope, section) {
    if (scope === "atmosphere") delete profile.morphology.locks.atmosphere[section];
    else delete profile.morphology.locks.modules[scope]?.[section];
  }
}

export function morphologyState(seed = Date.now()) {
  return { enabled: true, seed: String(seed), generatedAt: null, locks: { atmosphere: {}, modules: {} } };
}

export function lockMorphologySection(profile, scope, section) {
  profile.morphology ||= morphologyState();
  if (scope === "atmosphere") profile.morphology.locks.atmosphere[section] = true;
  else (profile.morphology.locks.modules[scope] ||= {})[section] = true;
}

function seeded(seed) {
  let value = [...String(seed)].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
  return () => ((value = Math.imul(value ^ value >>> 15, 1 | value) + 0x6D2B79F5 | 0) >>> 0) / 4294967296;
}
const pick = (random, values) => values[Math.floor(random() * values.length)];
const integer = (random, min, max) => Math.round(min + random() * (max - min));
