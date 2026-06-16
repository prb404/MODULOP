const SYSTEM_FONTS = {
  "system-sans": {
    label: "Système sans serif",
    category: "sans-serif",
    family: "Segoe UI",
    fallback: "system-ui, sans-serif"
  },
  "system-serif": {
    label: "Système éditorial",
    category: "serif",
    family: "Iowan Old Style",
    fallback: "Georgia, serif"
  },
  "system-humanist": { label: "Humaniste système", category: "sans-serif", family: "Aptos", fallback: '"Segoe UI", system-ui, sans-serif' },
  "system-mono": { label: "Monospace système", category: "sans-serif", family: "Cascadia Code", fallback: 'Consolas, monospace' },
  "system-classic": { label: "Classique système", category: "serif", family: "Palatino Linotype", fallback: 'Palatino, Georgia, serif' },
  "system-book": { label: "Livre système", category: "serif", family: "Cambria", fallback: 'Georgia, serif' }
};

const BUNDLED_FONTS = {
  inter: {
    label: "Inter",
    category: "sans-serif",
    family: "Inter Variable",
    fallback: '"Segoe UI", system-ui, sans-serif',
    license: "OFL-1.1",
    load: () => installBundledFont({
      family: "Inter Variable",
      weight: "100 900",
      latin: () => import("@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url"),
      latinExt: () => import("@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2?url")
    })
  },
  newsreader: {
    label: "Newsreader",
    category: "serif",
    family: "Newsreader Variable",
    fallback: 'Georgia, "Times New Roman", serif',
    license: "OFL-1.1",
    load: () => installBundledFont({
      family: "Newsreader Variable",
      weight: "200 800",
      latin: () => import("@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2?url"),
      latinExt: () => import("@fontsource-variable/newsreader/files/newsreader-latin-ext-wght-normal.woff2?url")
    })
  }
};

export const fontCatalog = { ...SYSTEM_FONTS, ...BUNDLED_FONTS };

export const fontProviderRegistry = {
  system: { id: "system", label: "Polices du système", remote: false, enabled: true },
  fontsource: { id: "fontsource", label: "Catalogue embarqué Fontsource", remote: false, enabled: true },
  bunny: { id: "bunny", label: "Bunny Fonts", remote: true, enabled: true, endpoint: "https://fonts.bunny.net/css" }
};

const loaded = new Set();

export function fontStack(id, fallbackId) {
  const font = fontCatalog[id] || remoteFontCatalog.find((item) => item.id === id) || fontCatalog[fallbackId] || SYSTEM_FONTS["system-sans"];
  const fallback = font.fallback || (font.category === "serif" ? 'Georgia, "Times New Roman", serif' : '"Segoe UI", system-ui, sans-serif');
  return `"${font.family}", ${fallback}`;
}

export async function loadFonts(ids = []) {
  await Promise.all([...new Set(ids)].map(async (id) => {
    const font = BUNDLED_FONTS[id];
    const remote = remoteFontCatalog.find((item) => item.id === id);
    if (loaded.has(id)) return;
    if (font) await font.load();
    else if (remote) await installRemoteFont(remote);
    else return;
    loaded.add(id);
  }));
}

export function listFonts(category) {
  return [...Object.entries(fontCatalog)
    .filter(([, font]) => !category || font.category === category)
    .map(([id, font]) => ({ id, ...font, load: undefined, provider: BUNDLED_FONTS[id] ? "fontsource" : "system" })),
    ...remoteFontCatalog.filter((font) => !category || font.category === category).map((font) => ({ ...font, fallback: font.category === "serif" ? "Georgia, serif" : "system-ui, sans-serif", remote: true }))];
}

export const remoteFontCatalog = [
  { id: "figtree", label: "Figtree", category: "sans-serif", provider: "bunny", family: "Figtree" },
  { id: "manrope", label: "Manrope", category: "sans-serif", provider: "bunny", family: "Manrope" },
  { id: "space-grotesk", label: "Space Grotesk", category: "sans-serif", provider: "bunny", family: "Space Grotesk" },
  { id: "fraunces", label: "Fraunces", category: "serif", provider: "bunny", family: "Fraunces" },
  { id: "literata", label: "Literata", category: "serif", provider: "bunny", family: "Literata" },
  { id: "source-serif-4", label: "Source Serif 4", category: "serif", provider: "bunny", family: "Source Serif 4" }
];

async function installRemoteFont(font) {
  const endpoint = `https://fonts.bunny.net/css?family=${encodeURIComponent(font.id)}:400,600,700`;
  if (remoteResources.status(endpoint) !== "allowed") return;
  if (document.querySelector(`link[data-modulop-font="${font.id}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = endpoint;
  link.dataset.modulopFont = font.id;
  document.head.append(link);
}

async function installBundledFont({ family, weight, latin, latinExt }) {
  const [{ default: latinUrl }, { default: latinExtUrl }] = await Promise.all([latin(), latinExt()]);
  const style = document.createElement("style");
  style.dataset.modulopFont = family;
  style.textContent = `
    @font-face {
      font-family: "${family}"; font-style: normal; font-display: swap; font-weight: ${weight};
      src: url("${latinExtUrl}") format("woff2-variations");
      unicode-range: U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;
    }
    @font-face {
      font-family: "${family}"; font-style: normal; font-display: swap; font-weight: ${weight};
      src: url("${latinUrl}") format("woff2-variations");
      unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
    }`;
  document.head.append(style);
}
import { remoteResources } from "./remote-resources.js";
