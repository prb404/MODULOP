export const VISUAL_KINDS = ["initials", "emoji", "asset", "remote", "icon", "dicebear"];

export function visualRef(value, fallback = "◇") {
  if (value && typeof value === "object" && VISUAL_KINDS.includes(value.kind)) return value;
  if (typeof value === "string" && value.startsWith("asset://")) return { kind: "asset", src: value, alt: "" };
  return { kind: "emoji", value: typeof value === "string" && value ? value : fallback, alt: "" };
}

export function diceBearUrl(ref) {
  const style = encodeURIComponent(ref.style || "shapes");
  const seed = encodeURIComponent(ref.seed || "modulop");
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&backgroundType=gradientLinear`;
}

export function createDefaultAvatar(seed = "modulop") {
  return initialsAvatar(seed);
}

export function initialsAvatar(name = "MODULOP", salt = "") {
  const initials = initialsFromName(name);
  const bg = colorFromSeed(`${name}:${salt || initials}`);
  return { kind: "initials", initials, bg, fg: readableTextColor(bg), seed: String(salt || name), alt: `Initiales ${initials}` };
}

export function initialsFromName(name = "") {
  const words = String(name).normalize("NFKD").replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/[\s-]+/).filter(Boolean);
  const source = words.length ? words : ["MODULOP"];
  return source.slice(0, 3).map((word) => word[0]).join("").toUpperCase();
}

export function colorFromSeed(seed = "") {
  let hash = 2166136261;
  for (const char of String(seed)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const hue = Math.abs(hash) % 360;
  const saturation = 48 + Math.abs(hash >> 8) % 22;
  const lightness = 34 + Math.abs(hash >> 16) % 22;
  return hslToHex(hue, saturation, lightness);
}

export function readableTextColor(hex) {
  const [r, g, b] = hexToRgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  const luminance = .2126 * r + .7152 * g + .0722 * b;
  return luminance > .48 ? "#151713" : "#fffaf0";
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)].map((value) => Math.round(255 * value).toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgb(hex) {
  const value = String(hex || "#000").replace("#", "");
  const normalized = value.length === 3 ? value.split("").map((item) => item + item).join("") : value.padEnd(6, "0").slice(0, 6);
  return [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16));
}
