import { icon, iconButton } from "./icons.js";

const EDGES = ["left", "right", "top", "bottom"];

export class PanelManager {
  constructor({ host, getPreferences, savePreferences, onClose }) {
    this.host = host;
    this.getPreferences = getPreferences;
    this.savePreferences = savePreferences;
    this.onClose = onClose;
    this.session = null;
    this.onKeyDown = (event) => event.key === "Escape" && this.cancel();
    document.addEventListener("keydown", this.onKeyDown, true);
  }

  render({ type, title, eyebrow, body, className = "" }) {
    this.cancel();
    const prefs = this.getPreferences(type);
    const mobile = matchMedia("(max-width: 720px)").matches;
    const mode = mobile ? (prefs.mobileMode || "sheet") : (prefs.mode || "dock");
    const edge = mobile ? "bottom" : (prefs.edge || "right");
    this.host.innerHTML = `
      <button class="panel-clickout panel-clickout--${mode}" type="button" data-action="close-panel" aria-label="Fermer le panneau"></button>
      <section class="panel panel--${mode} panel--${edge} ${className}" data-panel-type="${type}"
        style="--panel-size:${prefs.size || 720}px;--panel-x:${prefs.x || 120}px;--panel-y:${prefs.y || 90}px;--panel-height:${prefs.height || 760}px"
        role="dialog" aria-modal="${mobile ? "true" : "false"}" aria-label="${title}">
        <header class="panel__header">
          <button class="panel__move-handle" type="button" data-panel-drag aria-label="Déplacer le panneau" data-tooltip="Déplacer le panneau">${icon("GripHorizontal", 18)}</button>
          <div><span class="eyebrow">${eyebrow}</span><h2>${title}</h2></div>
          <div class="panel__tools">
            ${iconButton({ icon: mode === "float" ? "PanelRight" : "PictureInPicture2", label: mode === "float" ? "Rattacher le panneau" : "Détacher en fenêtre", action: "toggle-panel-mode" })}
            <div class="panel-edge-menu">
              ${iconButton({ icon: "PanelTop", label: "Changer le côté d’ancrage", action: "toggle-edge-menu" })}
              <div class="edge-options" hidden>
                ${EDGES.map((item) => `<button type="button" data-panel-edge="${item}" data-tooltip="Ancrer ${edgeLabel(item)}">${icon(edgeIcon(item))}</button>`).join("")}
              </div>
            </div>
            ${iconButton({ icon: "X", label: "Fermer", action: "close-panel" })}
          </div>
        </header>
        <div class="panel__body">${body}</div>
        ${["n", "ne", "e", "se", "s", "sw", "w", "nw"].map((direction) => `<button class="panel-resize panel-resize--${direction}" type="button" data-panel-resize="${direction}" aria-label="Redimensionner le panneau"></button>`).join("")}
      </section>
      <div class="panel-dock-zones" aria-hidden="true">
        ${EDGES.map((edgeName) => `<div class="panel-dock-zone panel-dock-zone--${edgeName}" data-dock-zone="${edgeName}"><span>${edgeLabel(edgeName)}</span></div>`).join("")}
      </div>`;
    this.bind(type);
  }

  bind(type) {
    const panel = this.host.querySelector(".panel");
    if (!panel) return;
    this.host.querySelectorAll('[data-action="close-panel"]').forEach((button) => button.addEventListener("click", () => {
      this.cancel();
      this.onClose();
    }));
    this.host.querySelector('[data-action="toggle-edge-menu"]')?.addEventListener("click", (event) => {
      const menu = event.currentTarget.nextElementSibling;
      menu.hidden = !menu.hidden;
    });
    this.host.querySelectorAll("[data-panel-edge]").forEach((button) => button.addEventListener("click", () => {
      this.dock(type, button.dataset.panelEdge);
    }));
    this.host.querySelector('[data-action="toggle-panel-mode"]')?.addEventListener("click", () => {
      const prefs = this.getPreferences(type);
      prefs.mode === "float" ? this.dock(type, prefs.edge || "right") : this.detach(type, panel);
    });
    panel.querySelector("[data-panel-drag]")?.addEventListener("pointerdown", (event) => {
      if (!panel.classList.contains("panel--float")) return;
      this.beginMove(event, panel, type);
    });
    panel.querySelectorAll("[data-panel-resize]").forEach((handle) => handle.addEventListener("pointerdown", (event) => {
      this.beginResize(event, panel, type, handle.dataset.panelResize);
    }));
  }

  detach(type, panel) {
    const rect = panel.getBoundingClientRect();
    this.savePreferences(type, {
      mode: "float",
      x: Math.max(8, Math.round(Math.min(rect.left || 120, innerWidth - Math.min(rect.width, 520) - 8))),
      y: Math.max(8, Math.round(Math.min(rect.top || 90, innerHeight - 160))),
      size: Math.round(Math.min(rect.width || 520, 760))
    });
  }

  dock(type, edge) {
    this.cancel();
    this.savePreferences(type, { mode: "dock", edge });
  }

  beginMove(event, panel, type) {
    this.beginSession(event, panel, type, "move");
  }

  beginResize(event, panel, type, direction = "se") {
    this.beginSession(event, panel, type, "resize", direction);
  }

  beginSession(event, panel, type, operation, direction = "") {
    if (this.session || event.button !== 0) return;
    event.preventDefault();
    const target = event.currentTarget;
    const rect = panel.getBoundingClientRect();
    const initial = {
      x: event.clientX, y: event.clientY,
      left: rect.left, top: rect.top, width: rect.width, height: rect.height
    };
    const session = {
      pointerId: event.pointerId, target, panel, type, operation, direction, initial,
      previewEdge: null
    };
    this.session = session;
    target.setPointerCapture?.(event.pointerId);
    panel.classList.add(`is-${operation}`);
    if (operation === "move") this.host.querySelector(".panel-dock-zones")?.classList.add("is-visible");
    session.move = (next) => this.updateSession(next);
    session.end = (next) => this.commit(next);
    session.cancel = () => this.cancel();
    target.addEventListener("pointermove", session.move);
    target.addEventListener("pointerup", session.end);
    target.addEventListener("pointercancel", session.cancel);
    target.addEventListener("lostpointercapture", session.cancel);
  }

  updateSession(event) {
    const session = this.session;
    if (!session || event.pointerId !== session.pointerId) return;
    const { panel, initial, operation } = session;
    if (operation === "move") {
      const x = clamp(initial.left + event.clientX - initial.x, 8, innerWidth - initial.width - 8);
      const y = clamp(initial.top + event.clientY - initial.y, 8, innerHeight - 80);
      panel.style.setProperty("--panel-x", `${x}px`);
      panel.style.setProperty("--panel-y", `${y}px`);
      session.previewEdge = edgeAt(event.clientX, event.clientY);
      this.host.querySelectorAll("[data-dock-zone]").forEach((zone) => {
        zone.classList.toggle("is-target", zone.dataset.dockZone === session.previewEdge);
      });
    } else {
      const mobile = matchMedia("(max-width: 720px)").matches;
      if (mobile) {
        const height = clamp(initial.height - (event.clientY - initial.y), 280, innerHeight * .96);
        panel.style.height = `${height}px`;
      } else {
        const dx = event.clientX - initial.x;
        const dy = event.clientY - initial.y;
        const direction = session.direction;
        let left = initial.left;
        let top = initial.top;
        let width = initial.width;
        let height = initial.height;
        if (direction.includes("e")) width = clamp(initial.width + dx, 340, innerWidth - initial.left - 8);
        if (direction.includes("s")) height = clamp(initial.height + dy, 320, innerHeight - initial.top - 8);
        if (direction.includes("w")) {
          width = clamp(initial.width - dx, 340, initial.left + initial.width - 8);
          left = initial.left + initial.width - width;
        }
        if (direction.includes("n")) {
          height = clamp(initial.height - dy, 320, initial.top + initial.height - 8);
          top = initial.top + initial.height - height;
        }
        panel.style.setProperty("--panel-x", `${left}px`);
        panel.style.setProperty("--panel-y", `${top}px`);
        panel.style.setProperty("--panel-size", `${width}px`);
        panel.style.setProperty("--panel-height", `${height}px`);
        if (panel.classList.contains("panel--dock") && (panel.classList.contains("panel--top") || panel.classList.contains("panel--bottom"))) {
          panel.style.setProperty("--panel-size", `${height}px`);
        }
      }
    }
  }

  commit(event) {
    const session = this.session;
    if (!session || (event.pointerId !== undefined && event.pointerId !== session.pointerId)) return;
    const rect = session.panel.getBoundingClientRect();
    const horizontalDock = session.panel.classList.contains("panel--top") || session.panel.classList.contains("panel--bottom");
    const values = session.operation === "move" && session.previewEdge
      ? { mode: "dock", edge: session.previewEdge, size: Math.round(rect.width) }
      : { x: Math.round(rect.left), y: Math.round(rect.top), size: Math.round(horizontalDock ? rect.height : rect.width), height: Math.round(rect.height) };
    const rerender = Boolean(values.mode);
    this.finishSession();
    this.savePreferences(session.type, values, rerender);
  }

  cancel() {
    const session = this.session;
    if (!session) return false;
    const { panel, initial } = session;
    panel.style.setProperty("--panel-x", `${initial.left}px`);
    panel.style.setProperty("--panel-y", `${initial.top}px`);
    panel.style.setProperty("--panel-size", `${initial.width}px`);
    panel.style.setProperty("--panel-height", `${initial.height}px`);
    panel.style.removeProperty("height");
    this.finishSession();
    return true;
  }

  finishSession() {
    const session = this.session;
    if (!session) return;
    session.target.removeEventListener("pointermove", session.move);
    session.target.removeEventListener("pointerup", session.end);
    session.target.removeEventListener("pointercancel", session.cancel);
    session.target.removeEventListener("lostpointercapture", session.cancel);
    if (session.target.hasPointerCapture?.(session.pointerId)) session.target.releasePointerCapture(session.pointerId);
    session.panel.classList.remove("is-move", "is-resize");
    this.host.querySelector(".panel-dock-zones")?.classList.remove("is-visible");
    this.host.querySelectorAll("[data-dock-zone]").forEach((zone) => zone.classList.remove("is-target"));
    this.session = null;
  }

  destroy() {
    this.cancel();
    document.removeEventListener("keydown", this.onKeyDown, true);
  }
}

function edgeAt(x, y) {
  const threshold = Math.min(120, Math.max(70, Math.min(innerWidth, innerHeight) * .1));
  if (x < threshold) return "left";
  if (x > innerWidth - threshold) return "right";
  if (y < threshold) return "top";
  if (y > innerHeight - threshold) return "bottom";
  return null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function edgeIcon(edge) {
  return { left: "PanelLeft", right: "PanelRight", top: "PanelTop", bottom: "PanelBottom" }[edge];
}

function edgeLabel(edge) {
  return { left: "À gauche", right: "À droite", top: "En haut", bottom: "En bas" }[edge];
}
