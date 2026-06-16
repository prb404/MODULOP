import { icon } from "./icons.js";
import { renderField, bindFields } from "../fields/index.js";

const registry = new Map();

export function registerControl(definition) {
  if (!definition?.type || typeof definition.render !== "function") throw new TypeError("Un contrôle doit fournir type et render.");
  registry.set(definition.type, Object.freeze({ ...definition }));
}

export const ControlRegistry = {
  render(schema, values = {}, context = {}) {
    return Object.entries(schema || {}).map(([path, definition]) => {
      const control = registry.get(definition.type);
      return control ? control.render({ path, definition, value: getPath(values, path), context }) : "";
    }).join("");
  },
  bind(root, onChange) {
    root.querySelectorAll("[data-control-path]").forEach((input) => {
      const eventName = input.matches("button") ? "click" : "input";
      input.addEventListener(eventName, () => {
        const value = input.matches("[data-control-choice]") ? input.dataset.controlChoice
          : input.type === "checkbox" ? input.checked
            : input.type === "range" || input.type === "number" ? Number(input.value)
              : input.value;
        onChange?.(input.dataset.controlPath, value, input);
      });
    });
    bindFields(root, (name, value, input) => onChange?.(name, value, input));
  }
};

registerControl({
  type: "choice",
  render: ({ path, definition, value }) => choiceCards(path, definition.label, definition.options || [], value, definition.previews)
});

registerControl({
  type: "variant",
  render: ({ path, definition, value, context }) => choiceCards(path, definition.label, context.variants || definition.options || [], value)
});

registerControl({
  type: "switch",
  render: ({ path, definition, value }) => switchControl(path, definition.label, Boolean(value), definition.description)
});

registerControl({
  type: "range",
  render: ({ path, definition, value, context }) => renderField("range", {
    label: definition.label, name: path, value: value ?? definition.default ?? definition.min ?? 0,
    min: definition.min ?? 0, max: definition.max ?? 100, step: definition.step ?? 1,
    unit: definition.unit || "", theme: definition.theme || context.rangeTheme || "bubble",
    marks: definition.marks || [], segments: definition.segments || []
  })
});

registerControl({
  type: "color",
  render: ({ path, definition, value }) => `<label class="morph-color"><span>${escapeHtml(definition.label)}</span><i style="--control-color:${escapeHtml(value || definition.default || "#000000")}"></i><input type="color" value="${escapeHtml(value || definition.default || "#000000")}" data-control-path="${path}"><output>${escapeHtml(value || "")}</output></label>`
});

registerControl({
  type: "text",
  render: ({ path, definition, value }) => `<label class="morph-input"><span>${escapeHtml(definition.label)}</span><input data-control-path="${path}" value="${escapeAttribute(value || "")}" placeholder="${escapeAttribute(definition.placeholder || "")}"></label>`
});

export function choiceCards(path, label, options, value, previews = {}) {
  return `<fieldset class="choice-control"><legend>${escapeHtml(label || "")}</legend><div class="choice-grid">${options.map((option) => {
    const item = typeof option === "string" ? { value: option, label: option } : option;
    return `<button type="button" class="choice-card ${item.value === value ? "is-active" : ""}" data-control-path="${path}" data-control-choice="${escapeAttribute(item.value)}" aria-pressed="${item.value === value}">
      <span class="choice-card__preview ${previews[item.value] || item.preview || ""}" aria-hidden="true">${item.icon ? icon(item.icon, 18) : ""}</span>
      <strong>${escapeHtml(item.label)}</strong>${item.description ? `<small>${escapeHtml(item.description)}</small>` : ""}
    </button>`;
  }).join("")}</div></fieldset>`;
}

export function switchControl(path, label, checked, description = "") {
  return `<label class="switch-control"><input type="checkbox" data-control-path="${path}" ${checked ? "checked" : ""}><span class="switch-control__track"><i>${icon(checked ? "Check" : "X", 13)}</i></span><span><strong>${escapeHtml(label)}</strong>${description ? `<small>${escapeHtml(description)}</small>` : ""}</span></label>`;
}

export function consentControl({ url, type = "generic", label, status = "off", description = "" }) {
  const active = status === "allowed";
  const stateLabel = active ? "Actif" : status === "refused" ? "Refusé" : status === "unavailable" ? "Indisponible" : "Désactivé";
  return `<div class="consent-control consent-control--${status}">
    <span class="consent-control__icon">${icon(active ? "ShieldCheck" : status === "refused" ? "ShieldX" : "Shield", 20)}</span>
    <span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(description || stateLabel)}</small></span>
    <button type="button" class="consent-toggle ${active ? "is-active" : ""}" data-action="${active ? "revoke-remote" : "allow-remote"}" data-url="${escapeAttribute(url)}" data-resource-type="${type}" aria-pressed="${active}"><i>${icon(active ? "Check" : "Power", 13)}</i><em>${stateLabel}</em></button>
  </div>`;
}

export function disclosure(title, body, { open = false, state = "" } = {}) {
  return `<details class="control-disclosure" ${open ? "open" : ""}><summary><span>${escapeHtml(title)}</span>${state ? `<em>${escapeHtml(state)}</em>` : ""}</summary><div class="control-disclosure__body">${body}</div></details>`;
}

function getPath(target, path) {
  return path.split(".").reduce((current, part) => current?.[part], target);
}

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

const escapeAttribute = escapeHtml;
