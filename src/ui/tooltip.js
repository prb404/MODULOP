import { overlays } from "./overlay-manager.js";

export function bindTooltips(root = document) {
  const tooltip = document.querySelector("#global-tooltip");
  if (!tooltip) return;
  let active = null;
  let cleanup = null;

  const show = (target) => {
    const text = target.dataset.tooltip;
    if (!text) return;
    cleanup?.();
    active = target;
    tooltip.textContent = text;
    tooltip.hidden = false;
    cleanup = overlays.position(target, tooltip, { placement: "top", distance: 9 });
  };
  const hide = (target) => {
    if (active !== target) return;
    cleanup?.();
    cleanup = null;
    active = null;
    tooltip.hidden = true;
  };

  root.querySelectorAll("[data-tooltip]").forEach((target) => {
    if (target.dataset.tooltipBound) return;
    target.dataset.tooltipBound = "true";
    target.addEventListener("mouseenter", () => show(target));
    target.addEventListener("mouseleave", () => hide(target));
    target.addEventListener("focus", () => show(target));
    target.addEventListener("blur", () => hide(target));
    target.addEventListener("keydown", (event) => event.key === "Escape" && hide(target));
  });
}
