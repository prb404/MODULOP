import { fontStack, loadFonts } from "./fonts.js";

const defaults = {
  ink: {
    id: "ink", name: "Encre",
    colors: { bg: "#11130f", surface: "#171a15", surface2: "#1c2019", surface3: "#252a21", text: "#f4f1e8", muted: "#9ca294", accent: "#f2764b", aqua: "#74d8d1", acid: "#c7ec6f", danger: "#ff8b7b" },
    background: { mode: "gradient", angle: 145, secondary: "#15180f", texture: 7, stops: ["#11130f", "#15180f"], image: "", opacity: 100, blend: "normal", size: "cover", position: "center", animated: false },
    typography: { sans: "inter", serif: "newsreader", scale: 100 },
    shape: { radius: 22, borderOpacity: 11, shadow: 46 },
    motion: { intensity: 100 }, icons: { provider: "lucide", weight: 1.8, size: 18, animation: "none" },
    header: { mode: "reveal", height: 76, opacity: 100, blur: 0, border: 12, shadow: 10, typeScale: 100, effect: "glide" },
    controls: { rangeTheme: "expressive" }
  },
  forest: {
    id: "forest", name: "Sous-bois",
    colors: { bg: "#102018", surface: "#162a20", surface2: "#1d3428", surface3: "#294536", text: "#f0f7e8", muted: "#a7b7a2", accent: "#df8a4c", aqua: "#7bd4bd", acid: "#b9e66e", danger: "#ff897a" },
    background: { mode: "mesh", angle: 120, secondary: "#1d3428", texture: 9, stops: ["#102018", "#1f3d2d", "#294536"], image: "", opacity: 100, blend: "normal", size: "cover", position: "center", animated: true },
    typography: { sans: "inter", serif: "newsreader", scale: 100 },
    shape: { radius: 24, borderOpacity: 13, shadow: 42 },
    motion: { intensity: 96 }, icons: { provider: "lucide", weight: 1.8, size: 18, animation: "none" },
    header: { mode: "reveal", height: 76, opacity: 100, blur: 0, border: 14, shadow: 10, typeScale: 100, effect: "glide" },
    controls: { rangeTheme: "segmented" }
  },
  paper: {
    id: "paper", name: "Papier",
    colors: { bg: "#ede8dc", surface: "#f6f1e7", surface2: "#fffaf0", surface3: "#e7e0d2", text: "#25261f", muted: "#696c61", accent: "#b85e3b", aqua: "#247f7b", acid: "#667d1e", danger: "#b23b31" },
    background: { mode: "solid", angle: 145, secondary: "#f6f1e7", texture: 4, stops: ["#ede8dc", "#f6f1e7"], image: "", opacity: 100, blend: "normal", size: "cover", position: "center", animated: false },
    typography: { sans: "inter", serif: "newsreader", scale: 100 },
    shape: { radius: 18, borderOpacity: 12, shadow: 20 },
    motion: { intensity: 85 }, icons: { provider: "lucide", weight: 1.7, size: 18, animation: "none" },
    header: { mode: "reveal", height: 72, opacity: 100, blur: 0, border: 14, shadow: 8, typeScale: 96, effect: "fade" },
    controls: { rangeTheme: "segmented" }
  },
  pearl: {
    id: "pearl", name: "Perle",
    colors: { bg: "#f8f4ec", surface: "#fffaf2", surface2: "#f1eadf", surface3: "#e7ded0", text: "#23251f", muted: "#6f7067", accent: "#a75f45", aqua: "#2c8982", acid: "#6c812c", danger: "#b14d43" },
    background: { mode: "radial", angle: 145, secondary: "#f1eadf", texture: 3, stops: ["#fffdf8", "#f8f4ec", "#ece2d3"], image: "", opacity: 100, blend: "normal", size: "cover", position: "center", animated: false },
    typography: { sans: "inter", serif: "newsreader", scale: 100 },
    shape: { radius: 26, borderOpacity: 10, shadow: 16 },
    motion: { intensity: 72 }, icons: { provider: "lucide", weight: 1.6, size: 18, animation: "none" },
    header: { mode: "reveal", height: 72, opacity: 100, blur: 0, border: 10, shadow: 5, typeScale: 96, effect: "fade" },
    controls: { rangeTheme: "bubble" }
  },
  signal: {
    id: "signal", name: "Signal",
    colors: { bg: "#0e1015", surface: "#151821", surface2: "#1b1f2a", surface3: "#262b39", text: "#f4f5fa", muted: "#9aa1b5", accent: "#ff5f87", aqua: "#62e6ff", acid: "#d7ff5c", danger: "#ff7b8d" },
    background: { mode: "gradient", angle: 135, secondary: "#151024", texture: 5, stops: ["#0e1015", "#151024", "#132337"], image: "", opacity: 100, blend: "normal", size: "cover", position: "center", animated: true },
    typography: { sans: "inter", serif: "newsreader", scale: 102 },
    shape: { radius: 16, borderOpacity: 14, shadow: 52 },
    motion: { intensity: 110 }, icons: { provider: "tabler", weight: 1.8, size: 18, animation: "pulse" },
    header: { mode: "reveal", height: 78, opacity: 100, blur: 0, border: 16, shadow: 12, typeScale: 103, effect: "glide" },
    controls: { rangeTheme: "bubble" }
  }
};

export function createDefaultAtmospheres() {
  const presets = ["ink", "forest", "paper", "pearl", "signal"].map((id) => structuredClone(defaults[id]));
  presets.push(createCustomAtmosphere(presets[0]));
  return presets;
}

export function createAtmosphere(source, name = `${source.name} — copie`) {
  const copy = structuredClone(source);
  copy.id = crypto.randomUUID();
  copy.name = name;
  return copy;
}

export function createCustomAtmosphere(source = defaults.ink) {
  const copy = structuredClone(source);
  copy.id = "custom";
  copy.name = "Custom";
  copy.custom = true;
  return copy;
}

export function activeAtmosphere(profile) {
  return profile.atmospheres.find((item) => item.id === profile.activeAtmosphereId) || profile.atmospheres[0];
}

export function ensureCustomAtmosphere(profile) {
  profile.atmospheres ||= createDefaultAtmospheres();
  let custom = profile.atmospheres.find((item) => item.id === "custom");
  if (!custom) {
    custom = createCustomAtmosphere(activeAtmosphere(profile));
    profile.atmospheres.push(custom);
  }
  return custom;
}

export function activateCustomAtmosphere(profile) {
  const current = activeAtmosphere(profile);
  const custom = ensureCustomAtmosphere(profile);
  if (current?.id !== "custom") {
    const clone = createCustomAtmosphere(current);
    Object.assign(custom, clone);
  }
  profile.activeAtmosphereId = "custom";
  return custom;
}

export async function applyAtmosphere(profile, root = document.documentElement) {
  const atmosphere = activeAtmosphere(profile);
  if (!atmosphere) return;
  await loadFonts([atmosphere.typography.sans, atmosphere.typography.serif]);
  const { colors, background, typography, shape, motion, icons = {}, header = {} } = atmosphere;
  const dark = relativeLuminance(colors.bg) < .42;
  const vars = {
    "--bg": colors.bg,
    "--surface": colors.surface,
    "--surface-2": colors.surface2,
    "--surface-3": colors.surface3,
    "--text": colors.text,
    "--muted": colors.muted,
    "--accent": colors.accent,
    "--aqua": colors.aqua,
    "--acid": colors.acid,
    "--danger": colors.danger,
    "--line": colorWithAlpha(colors.text, shape.borderOpacity / 100),
    "--line-strong": colorWithAlpha(colors.text, Math.min(.7, shape.borderOpacity / 50)),
    "--panel-bg": colorWithAlpha(colors.surface, .985),
    "--shadow": `0 30px 100px ${colorWithAlpha("#000000", shape.shadow / 100)}`,
    "--radius": `${shape.radius}px`,
    "--sans": fontStack(typography.sans, "system-sans"),
    "--serif": fontStack(typography.serif, "system-serif"),
    "--type-scale": typography.scale / 100,
    "--motion-scale": motion.intensity / 100,
    "--icon-size": `${icons.size || 18}px`,
    "--icon-weight": icons.weight || 1.8,
    "--grain-opacity": background.texture / 100,
    "--app-background": backgroundValue(background, colors),
    "--background-size": background.animated ? "240% 240%" : background.size || "cover",
    "--background-position": background.position || "center",
    "--background-blend": background.blend || "normal",
    "--background-animation": background.animated ? "atmosphere-flow 14s ease infinite" : "none"
    ,"--profile-header-height": `${header.height || 76}px`
    ,"--profile-header-opacity": (header.opacity ?? 92) / 100
    ,"--profile-header-blur": `${header.blur || 0}px`
    ,"--profile-header-border": (header.border ?? 12) / 100
    ,"--profile-header-shadow": (header.shadow ?? 28) / 100
    ,"--profile-header-type-scale": (header.typeScale ?? 100) / 100
  };
  Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
  document.body.dataset.colorMode = dark ? "dark" : "light";
  document.body.dataset.headerMode = header.mode || "reveal";
  document.body.dataset.headerEffect = header.effect || "glide";
  root.style.colorScheme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", colors.bg);
}

export function backgroundValue(background, colors) {
  const stops = background.stops?.length ? background.stops : [colors.bg, background.secondary || colors.bg];
  if (background.mode === "image" && background.image) return `linear-gradient(${colorWithAlpha(colors.bg, 1 - (background.opacity ?? 100) / 100)},${colorWithAlpha(colors.bg, 1 - (background.opacity ?? 100) / 100)}),url("${String(background.image).replaceAll('"', "%22")}")`;
  if (background.mode === "radial") return `radial-gradient(circle at center, ${stops.join(",")})`;
  if (background.mode === "conic") return `conic-gradient(from ${background.angle || 0}deg, ${stops.join(",")})`;
  if (background.mode === "mesh") return `radial-gradient(circle at 20% 20%,${stops[1] || colors.aqua},transparent 42%),radial-gradient(circle at 80% 30%,${stops[2] || colors.accent},transparent 45%),linear-gradient(${background.angle || 135}deg,${stops[0]},${stops.at(-1)})`;
  if (background.mode === "gradient") return `linear-gradient(${background.angle}deg, ${stops.join(",")})`;
  return colors.bg;
}

export function contrastRatio(first, second) {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

function relativeLuminance(hex) {
  const channels = hexToRgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
}

function colorWithAlpha(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const normalized = value.length === 3 ? value.split("").map((item) => item + item).join("") : value;
  return [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16));
}
