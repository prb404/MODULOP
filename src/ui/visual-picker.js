import { saveAsset } from "../core/store.js";
import { diceBearUrl, initialsAvatar, visualRef } from "../core/visuals.js";
import { remoteResources } from "../core/remote-resources.js";
import { icon } from "./icons.js";
import { consentControl } from "./controls.js";

export function visualPreview(value) {
  const ref = visualRef(value);
  if (ref.kind === "initials") return `<span class="visual-preview__initials" style="--visual-bg:${escapeHtml(ref.bg || "#31433a")};--visual-fg:${escapeHtml(ref.fg || "#fffaf0")}">${escapeHtml(ref.initials || "MO")}</span>`;
  if (ref.kind === "emoji") return `<span class="visual-preview__emoji">${escapeHtml(ref.value)}</span>`;
  if (ref.kind === "icon") return `<span class="visual-preview__icon">${icon(ref.name || "Sparkles", 24)}</span>`;
  if (ref.kind === "asset") return `<span data-asset="${escapeHtml(ref.src)}"></span>`;
  const src = ref.kind === "dicebear" ? diceBearUrl(ref) : ref.src;
  const resourceType = ref.kind === "dicebear" ? "avatar" : "image";
  if (remoteResources.status(src, resourceType) !== "allowed") return `<span class="visual-preview__fallback">${escapeHtml(ref.fallback || "◇")}</span>`;
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(ref.alt || "")}" loading="lazy">`;
}

export function visualPickerField(value, path, label = "Visuel", options = {}) {
  const ref = visualRef(value);
  const isGenerated = ref.kind === "dicebear";
  const canRegenerate = ref.kind === "initials" || ref.kind === "dicebear";
  const allowedKinds = options.allowedKinds || ["initials", "emoji", "icon", "asset", "remote", "dicebear"];
  const kindButtons = [
    ["initials", "Initiales", "BKS"],
    ["emoji", "Emoji", "☕"],
    ["icon", "Icône", icon("Sparkles", 18)],
    ["asset", "Image locale", icon("ImagePlus", 18)],
    ["remote", "URL distante", icon("Link", 18)],
    ["dicebear", "Généré", "DB"]
  ].filter(([kind]) => allowedKinds.includes(kind));
  return `<fieldset class="visual-field" data-visual-field data-path="${path}">
    <legend>${label}</legend>
    <div class="visual-field__summary">
      <div class="visual-field__preview">${visualPreview(ref)}</div>
      <div>
        <strong>${escapeHtml(kindLabel(ref.kind))}</strong>
        <small>${escapeHtml(kindDescription(ref))}</small>
      </div>
      ${canRegenerate ? `<button type="button" class="soft-button visual-regenerate" data-visual-regenerate>${icon("RefreshCw", 15)} Régénérer</button>` : ""}
    </div>
    <div class="visual-kind-grid" role="listbox" aria-label="Type de visuel">
      ${kindButtons.map(([kind, buttonLabel, preview]) => visualKindButton(kind, buttonLabel, preview, ref.kind)).join("")}
    </div>
    ${isGenerated ? `<div class="visual-generated-presets" aria-label="Suggestions d’avatars générés">${diceBearStyles().map((style) => `<button type="button" class="${style === (ref.style || "shapes") ? "is-active" : ""}" data-visual-style="${style}" aria-pressed="${style === (ref.style || "shapes")}"><span>${visualPreview({ ...ref, kind: "dicebear", style, seed: `${ref.seed || "modulop"}-${style}`, fallback: style.slice(0, 2).toUpperCase() })}</span><strong>${style}</strong></button>`).join("")}</div>` : ""}
    <div data-visual-options>${visualOptions(ref)}</div>
  </fieldset>`;
}

export function bindVisualPickers(root, patch, announce) {
  root.querySelectorAll("[data-visual-field]").forEach((field) => {
    const path = field.dataset.path;
    const update = (mutator, rerender = false) => patch((draft) => {
      const current = visualRef(getPath(draft, path));
      mutator(current);
      setPath(draft, path, current);
    }, rerender);
    field.querySelectorAll("[data-visual-kind]").forEach((button) => button.addEventListener("click", () => {
      const kind = button.dataset.visualKind;
      patch((draft) => setPath(draft, path, defaultsFor(kind)), true);
    }));
    field.querySelector("[data-visual-regenerate]")?.addEventListener("click", () => {
      patch((draft) => {
        const current = visualRef(getPath(draft, path));
        if (current.kind === "initials") setPath(draft, path, initialsAvatar(current.alt || current.seed || "MODULOP", crypto.randomUUID()));
        else if (current.kind === "dicebear") setPath(draft, path, { ...current, seed: crypto.randomUUID() });
        else setPath(draft, path, defaultsFor("initials"));
      }, true);
    });
    field.querySelector("[data-visual-value]")?.addEventListener("input", (event) => update((ref) => {
      if (ref.kind === "initials") ref.initials = event.target.value.toUpperCase().slice(0, 3);
      else ref.value = event.target.value;
    }));
    field.querySelector("[data-visual-bg]")?.addEventListener("input", (event) => update((ref) => {
      ref.bg = event.target.value;
      ref.fg = readableTextColor(event.target.value);
    }));
    field.querySelector("[data-visual-icon]")?.addEventListener("input", (event) => update((ref) => { ref.name = event.target.value; }));
    field.querySelectorAll("[data-visual-icon-choice]").forEach((button) => button.addEventListener("click", () => update((ref) => { ref.name = button.dataset.visualIconChoice; }, true)));
    field.querySelector("[data-visual-icon-search]")?.addEventListener("input", (event) => {
      const query = event.target.value.toLowerCase();
      field.querySelectorAll("[data-visual-icon-choice]").forEach((button) => {
        button.hidden = !button.dataset.search.includes(query);
      });
    });
    field.querySelector("[data-emoji-open]")?.addEventListener("click", async () => {
      await import("emoji-picker-element");
      const popover = field.querySelector("[data-emoji-popover]");
      popover.hidden = !popover.hidden;
      popover.querySelector("emoji-picker")?.focus?.();
    });
    field.querySelector("emoji-picker")?.addEventListener("emoji-click", (event) => {
      const emoji = event.detail?.unicode || event.detail?.emoji?.unicode;
      if (emoji) update((ref) => { ref.value = emoji; }, true);
    });
    field.querySelector("[data-visual-url]")?.addEventListener("change", (event) => update((ref) => { ref.src = event.target.value; }, true));
    field.querySelector("[data-visual-seed]")?.addEventListener("input", (event) => update((ref) => { ref.seed = event.target.value; }));
    field.querySelectorAll("[data-visual-style]").forEach((button) => button.addEventListener("click", () => update((ref) => { ref.style = button.dataset.visualStyle; }, true)));
    field.querySelector("[data-visual-file]")?.addEventListener("change", async (event) => {
      const [file] = event.target.files;
      if (!file) return;
      const src = await saveAsset(file, file.name);
      patch((draft) => setPath(draft, path, { kind: "asset", src, alt: file.name }), true);
      announce?.("Image conservée localement");
    });
  });
}

function visualOptions(ref) {
  if (ref.kind === "initials") return `<div class="visual-inline-grid">
    <label class="field"><span>Initiales</span><input data-visual-value maxlength="3" value="${escapeAttribute(ref.initials || "MO")}"></label>
    <label class="field"><span>Fond</span><input type="color" data-visual-bg value="${escapeAttribute(ref.bg || "#31433a")}"></label>
  </div>`;
  if (ref.kind === "emoji") return `<div class="visual-emoji-picker">
    <label class="field"><span>Emoji</span><input data-visual-value value="${escapeAttribute(ref.value || "◇")}"></label>
    <button type="button" class="soft-button" data-emoji-open>${icon("Smile", 16)} Parcourir</button>
    <div class="visual-emoji-popover" data-emoji-popover hidden><emoji-picker locale="fr"></emoji-picker></div>
  </div>`;
  if (ref.kind === "icon") return `<div class="visual-icon-picker">
    <label class="field"><span>Rechercher une icône Lucide</span><input data-visual-icon-search value="${escapeAttribute(ref.name || "")}" placeholder="Sparkles, Image, Link…"></label>
    <input type="hidden" data-visual-icon value="${escapeAttribute(ref.name || "Sparkles")}">
    <div class="visual-icon-grid">${iconChoices().map((name) => `<button type="button" class="${name === (ref.name || "Sparkles") ? "is-active" : ""}" data-visual-icon-choice="${name}" data-search="${name.toLowerCase()}">${icon(name, 17)}<span>${escapeHtml(name)}</span></button>`).join("")}</div>
  </div>`;
  if (ref.kind === "asset") return `<label class="drop-field">${icon("ImagePlus", 18)} Choisir ou déposer une image<input type="file" accept="image/*" data-visual-file></label>`;
  if (ref.kind === "remote") {
    const url = ref.src || "https://example.invalid";
    return `<label class="field"><span>URL HTTPS</span><input type="url" data-visual-url value="${escapeAttribute(ref.src || "")}"></label>${consentControl({
      url, type: "image", label: "Image distante", status: remoteResources.status(url, "image"),
      description: ref.src ? "La ressource reste remplaçable par son fallback local." : "Renseignez une URL avant l’autorisation."
    })}`;
  }
  const diceUrl = diceBearUrl(ref);
  return `${consentControl({ url: diceUrl, type: "avatar", label: "DiceBear", status: remoteResources.status(diceUrl, "avatar"), description: "Génération distante facultative avec fallback local." })}`;
}

function defaultsFor(kind) {
  if (kind === "initials") return initialsAvatar("MODULOP", crypto.randomUUID());
  if (kind === "emoji") return { kind, value: "◇", alt: "" };
  if (kind === "asset") return { kind, src: "", alt: "" };
  if (kind === "remote") return { kind, src: "", alt: "", fallback: "◇" };
  if (kind === "icon") return { kind, provider: "lucide", name: "Sparkles", alt: "" };
  return { kind, style: "shapes", seed: "modulop", alt: "Avatar généré" };
}

function visualKindButton(value, label, preview, selected) {
  return `<button type="button" class="visual-kind-card ${value === selected ? "is-active" : ""}" data-visual-kind="${value}" aria-pressed="${value === selected}">
    <span>${preview}</span><strong>${label}</strong>
  </button>`;
}

function diceBearStyles() {
  return ["shapes", "bottts", "lorelei", "notionists", "thumbs"];
}

function iconChoices() {
  return [
    "Sparkles", "Image", "ImagePlus", "Link", "FileText", "NotebookTabs", "Shapes", "CircleDot",
    "Orbit", "Radar", "Network", "BrainCircuit", "Activity", "UsersRound", "GraduationCap",
    "MonitorCog", "Waypoints", "Route", "Fingerprint", "Milestone", "Coffee", "Music",
    "Camera", "Leaf", "Gamepad2", "BookOpen", "Lightbulb", "Map", "Compass", "Star",
    "Heart", "Zap", "Palette", "WandSparkles"
  ];
}

function kindLabel(kind) {
  return ({ initials: "Initiales locales", emoji: "Emoji", asset: "Image locale", remote: "Image distante", icon: "Icône", dicebear: "Avatar généré" })[kind] || "Visuel";
}

function kindDescription(ref) {
  if (ref.kind === "initials") return `${ref.initials || "MO"} · sans ressource distante`;
  if (ref.kind === "remote") return ref.src || "URL HTTPS à renseigner";
  if (ref.kind === "asset") return ref.src ? "Média local stocké" : "Import local";
  if (ref.kind === "dicebear") return "Option distante avec fallback local";
  return ref.name || ref.value || "Personnalisable";
}

function option(value, label, selected) {
  return `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`;
}

function getPath(target, path) {
  return path.split(".").reduce((current, key) => current?.[key], target);
}

function setPath(target, path, value) {
  const parts = path.split(".");
  const key = parts.pop();
  const owner = parts.reduce((current, part) => current[part] ||= {}, target);
  owner[key] = value;
}

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

const escapeAttribute = escapeHtml;

function readableTextColor(hex = "#31433a") {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((char) => char + char).join("") : value.padEnd(6, "0").slice(0, 6);
  const red = parseInt(full.slice(0, 2), 16) / 255;
  const green = parseInt(full.slice(2, 4), 16) / 255;
  const blue = parseInt(full.slice(4, 6), 16) / 255;
  const linear = [red, green, blue].map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return luminance > 0.45 ? "#11130f" : "#fffaf0";
}
