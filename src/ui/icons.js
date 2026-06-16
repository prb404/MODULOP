import { createElement, icons } from "lucide";

export function icon(name, size = 18) {
  const node = icons[name] || icons.CircleHelp;
  return createElement(node, {
    width: size,
    height: size,
    "aria-hidden": "true",
    focusable: "false"
  }).outerHTML;
}

export function iconButton({ icon: name, label, action, id = "", className = "", extra = "" }) {
  return `<button class="icon-button ${className}" type="button" data-action="${action}" ${id ? `data-id="${id}"` : ""} data-tooltip="${label}" aria-label="${label}" ${extra}>${icon(name)}</button>`;
}
