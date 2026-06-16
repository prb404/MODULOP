import { overlays } from "./overlay-manager.js";

export async function confirmAt(anchor, { title, message, confirmLabel = "Confirmer" }) {
  document.querySelector(".popconfirm")?.remove();
  const popover = document.createElement("div");
  popover.className = "popconfirm";
  popover.setAttribute("role", "alertdialog");
  popover.setAttribute("aria-label", title);
  popover.innerHTML = `
    <strong>${title}</strong>
    <p>${message}</p>
    <div><button type="button" data-cancel>Annuler</button><button class="danger" type="button" data-confirm>${confirmLabel}</button></div>`;
  document.body.append(popover);
  const returnFocus = document.activeElement;
  const canUseAnchor = anchor?.isConnected && anchor.getClientRects?.().length;
  const cleanupPosition = canUseAnchor
    ? overlays.position(anchor, popover, { placement: "bottom-end" })
    : centerPopover(popover);
  popover.querySelector("[data-confirm]").focus();
  return new Promise((resolve) => {
    const finish = (value) => {
      cleanupPosition();
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", keyboard, true);
      popover.remove();
      if (returnFocus?.isConnected) returnFocus.focus();
      resolve(value);
    };
    const outside = (event) => !popover.contains(event.target) && event.target !== anchor && finish(false);
    const keyboard = (event) => event.key === "Escape" && finish(false);
    setTimeout(() => document.addEventListener("pointerdown", outside, true));
    document.addEventListener("keydown", keyboard, true);
    popover.querySelector("[data-cancel]").addEventListener("click", () => finish(false));
    popover.querySelector("[data-confirm]").addEventListener("click", () => finish(true));
  });
}

function centerPopover(popover) {
  popover.style.position = "fixed";
  popover.style.left = "50%";
  popover.style.top = "50%";
  popover.style.transform = "translate(-50%, -50%)";
  return () => {
    popover.style.removeProperty("position");
    popover.style.removeProperty("left");
    popover.style.removeProperty("top");
    popover.style.removeProperty("transform");
  };
}
