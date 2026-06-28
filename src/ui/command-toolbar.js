import { icon } from "./icons.js";

export const TOOLBAR_CELL = 40;
export const TOOLBAR_GAP = 8;
export const TOOLBAR_PADDING = 8;
export const MIN_TOOLBAR_SIZE = 48;

export const TOOLBAR_TOOLS = {
  spaces: { icon: "PanelTopOpen", label: "Espaces", action: "show-home" },
  fragments: { icon: "LayoutGrid", label: "Fragments", action: "open-library" },
  presence: { icon: "Radar", label: "Présences", action: "open-live" },
  import: { icon: "FileUp", label: "Importer", action: "import" },
  appearance: { icon: "Palette", label: "Apparence", action: "open-atmosphere" },
  settings: { icon: "SlidersHorizontal", label: "Réglages", action: "open-menu" },
  help: { icon: "CircleHelp", label: "Aide", action: "open-about" }
};

export const TOOLBAR_ORDER = Object.keys(TOOLBAR_TOOLS);
const EDGES = ["left", "right", "top", "bottom", "free"];
const RESIZE_DIRECTIONS = ["n", "e", "s", "w", "ne", "nw", "se", "sw"];

export class CommandToolbar {
  constructor({ host, getPreferences, savePreferences }) {
    this.host = host;
    this.getPreferences = getPreferences;
    this.savePreferences = savePreferences;
    this.session = null;
    this.overflowOpen = false;
  }

  render({ active = "", status = "", currentSpace = "" } = {}) {
    this.renderContext = { active, status, currentSpace };
    const prefs = normalizeToolbarPreferences(this.getPreferences());
    const orderedTools = prefs.order.map((id) => ({ id, ...TOOLBAR_TOOLS[id] })).filter((tool) => tool.action);
    const capacity = visibleToolCapacity(prefs, orderedTools.length);
    const visible = orderedTools.slice(0, capacity);
    const hidden = orderedTools.slice(capacity);
    const orientation = toolbarOrientation(prefs.edge, prefs.width, prefs.height);

    this.host.innerHTML = `<nav class="command-toolbar command-toolbar--adaptive" data-edge="${prefs.edge}" data-mode="${prefs.mode}" data-orientation="${orientation}" aria-label="Commandes principales"
      style="--toolbar-width:${prefs.width}px;--toolbar-height:${prefs.height}px;--toolbar-columns:${prefs.columns};--toolbar-rows:${prefs.rows};--toolbar-x:${prefs.x}px;--toolbar-y:${prefs.y}px">
      <button class="command-toolbar__grab" type="button" data-toolbar-drag data-tooltip="Déplacer" aria-label="Déplacer les commandes">${icon("GripHorizontal", 17)}</button>
      <div class="command-toolbar__status" title="${escapeAttribute(currentSpace)}"><i class="${status === "p2p" ? "is-online" : ""}"></i></div>
      <div class="command-toolbar__tools" data-toolbar-tools>
        ${visible.map((tool) => renderToolButton(tool, active)).join("")}
        ${hidden.length ? `<button type="button" class="command-toolbar__tool command-toolbar__overflow-toggle" data-toolbar-overflow-toggle data-tooltip="${hidden.length} outil${hidden.length > 1 ? "s" : ""} masqué${hidden.length > 1 ? "s" : ""}" aria-label="Outils masqués">${icon("Ellipsis", 19)}</button>` : ""}
      </div>
      ${hidden.length ? `<div class="command-toolbar__overflow ${this.overflowOpen ? "is-open" : ""}" data-toolbar-overflow>
        ${hidden.map((tool) => renderToolButton(tool, active, true)).join("")}
      </div>` : ""}
      ${RESIZE_DIRECTIONS.map((direction) => `<span class="command-toolbar__resize command-toolbar__resize--${direction}" data-toolbar-resize="${direction}" aria-hidden="true"></span>`).join("")}
    </nav>`;
    this.bind();
  }

  bind() {
    const toolbar = this.host.querySelector(".command-toolbar");
    if (!toolbar) return;
    toolbar.querySelector("[data-toolbar-drag]")?.addEventListener("pointerdown", (event) => this.beginMove(event, toolbar));
    toolbar.querySelectorAll("[data-toolbar-resize]").forEach((handle) => {
      handle.addEventListener("pointerdown", (event) => this.beginResize(event, toolbar, handle.dataset.toolbarResize));
    });
    toolbar.querySelector("[data-toolbar-overflow-toggle]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      this.overflowOpen = !this.overflowOpen;
      this.render(this.renderContext);
    });
    toolbar.querySelectorAll("[data-toolbar-tool-id]").forEach((button) => {
      button.addEventListener("dragstart", (event) => this.beginReorder(event, button));
      button.addEventListener("dragover", (event) => event.preventDefault());
      button.addEventListener("drop", (event) => this.commitReorder(event, button));
    });
    document.addEventListener("click", this.closeOverflow, { once: true });
  }

  closeOverflow = (event) => {
    if (!this.overflowOpen) return;
    if (this.host.contains(event.target)) return;
    this.overflowOpen = false;
    this.render(this.renderContext);
  };

  beginReorder(event, button) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", button.dataset.toolbarToolId);
  }

  commitReorder(event, target) {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain");
    const targetId = target.dataset.toolbarToolId;
    if (!sourceId || !targetId || sourceId === targetId) return;
    const prefs = normalizeToolbarPreferences(this.getPreferences());
    const order = prefs.order.filter((id) => id !== sourceId);
    const targetIndex = order.indexOf(targetId);
    order.splice(targetIndex < 0 ? order.length : targetIndex, 0, sourceId);
    this.savePreferences({ order });
  }

  beginMove(event, toolbar) {
    if (event.button !== 0) return;
    event.preventDefault();
    const rect = toolbar.getBoundingClientRect();
    this.beginSession(event, toolbar, "move", {
      x: event.clientX,
      y: event.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    });
  }

  beginResize(event, toolbar, direction = "se") {
    if (event.button !== 0) return;
    event.preventDefault();
    const rect = toolbar.getBoundingClientRect();
    this.beginSession(event, toolbar, "resize", {
      direction,
      x: event.clientX,
      y: event.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    });
  }

  beginSession(event, toolbar, operation, initial) {
    const target = event.currentTarget;
    const session = { pointerId: event.pointerId, target, toolbar, operation, initial, edge: null };
    this.session = session;
    target.setPointerCapture?.(event.pointerId);
    toolbar.classList.add(`is-${operation}`);
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
    if (session.operation === "move") {
      const x = clamp(session.initial.left + event.clientX - session.initial.x, 8, innerWidth - session.initial.width - 8);
      const y = clamp(session.initial.top + event.clientY - session.initial.y, 8, innerHeight - session.initial.height - 8);
      session.toolbar.style.setProperty("--toolbar-x", `${x}px`);
      session.toolbar.style.setProperty("--toolbar-y", `${y}px`);
      session.toolbar.dataset.edge = "free";
      session.toolbar.dataset.mode = "float";
      session.edge = edgeAt(event.clientX, event.clientY);
      return;
    }

    const { width, height, left, top, direction } = session.initial;
    const horizontal = direction.includes("e") ? event.clientX - session.initial.x : direction.includes("w") ? session.initial.x - event.clientX : 0;
    const vertical = direction.includes("s") ? event.clientY - session.initial.y : direction.includes("n") ? session.initial.y - event.clientY : 0;
    const nextWidth = quantizeToolbarExtent(width + horizontal, "width");
    const nextHeight = quantizeToolbarExtent(height + vertical, "height");
    session.toolbar.style.setProperty("--toolbar-width", `${nextWidth}px`);
    session.toolbar.style.setProperty("--toolbar-height", `${nextHeight}px`);
    session.toolbar.dataset.orientation = toolbarOrientation("free", nextWidth, nextHeight);
    if (direction.includes("w")) session.toolbar.style.setProperty("--toolbar-x", `${left + width - nextWidth}px`);
    if (direction.includes("n")) session.toolbar.style.setProperty("--toolbar-y", `${top + height - nextHeight}px`);
  }

  commit(event) {
    const session = this.session;
    if (!session || (event.pointerId !== undefined && event.pointerId !== session.pointerId)) return;
    const rect = session.toolbar.getBoundingClientRect();
    const values = session.operation === "move"
      ? { edge: session.edge || "free", mode: session.edge ? "dock" : "float", x: Math.round(rect.left), y: Math.round(rect.top) }
      : toolbarSizePreferences(Math.round(rect.width), Math.round(rect.height));
    this.finishSession();
    this.savePreferences(values);
  }

  cancel() {
    this.finishSession();
  }

  finishSession() {
    const session = this.session;
    if (!session) return;
    session.target.removeEventListener("pointermove", session.move);
    session.target.removeEventListener("pointerup", session.end);
    session.target.removeEventListener("pointercancel", session.cancel);
    session.target.removeEventListener("lostpointercapture", session.cancel);
    if (session.target.hasPointerCapture?.(session.pointerId)) session.target.releasePointerCapture(session.pointerId);
    session.toolbar.classList.remove("is-move", "is-resize");
    this.session = null;
  }
}

export function normalizeToolbarPreferences(prefs = {}) {
  const order = Array.isArray(prefs.order) ? prefs.order.filter((id) => TOOLBAR_TOOLS[id]) : [];
  const edge = EDGES.includes(prefs.edge) ? prefs.edge : "left";
  const mode = prefs.mode === "float" || edge === "free" ? "float" : "dock";
  const fallback = edge === "top" || edge === "bottom"
    ? toolbarSizeForGrid(TOOLBAR_ORDER.length + 2, 1)
    : toolbarSizeForGrid(1, TOOLBAR_ORDER.length + 2);
  const width = quantizeToolbarExtent(Number(prefs.width ?? prefs.size ?? fallback.width), "width");
  const height = quantizeToolbarExtent(Number(prefs.height ?? fallback.height), "height");
  const grid = toolbarGridForSize(width, height);
  return {
    mode,
    edge,
    x: clamp(Number(prefs.x) || 18, 8, 4096),
    y: clamp(Number(prefs.y) || 120, 8, 4096),
    width,
    height,
    columns: grid.columns,
    rows: grid.rows,
    preferredAxis: prefs.preferredAxis === "width" || prefs.preferredAxis === "height" ? prefs.preferredAxis : toolbarOrientation(edge, width, height),
    order: [...order, ...TOOLBAR_ORDER.filter((id) => !order.includes(id))]
  };
}

export function toolbarSizeForGrid(columns = 1, rows = 1) {
  return {
    width: TOOLBAR_PADDING * 2 + columns * TOOLBAR_CELL + Math.max(0, columns - 1) * TOOLBAR_GAP,
    height: TOOLBAR_PADDING * 2 + rows * TOOLBAR_CELL + Math.max(0, rows - 1) * TOOLBAR_GAP
  };
}

function toolbarSizePreferences(width, height) {
  const grid = toolbarGridForSize(width, height);
  return { width: quantizeToolbarExtent(width, "width"), height: quantizeToolbarExtent(height, "height"), columns: grid.columns, rows: grid.rows, preferredAxis: width >= height ? "width" : "height" };
}

function toolbarGridForSize(width, height) {
  const columns = Math.max(1, Math.round((width - TOOLBAR_PADDING * 2 + TOOLBAR_GAP) / (TOOLBAR_CELL + TOOLBAR_GAP)));
  const rows = Math.max(1, Math.round((height - TOOLBAR_PADDING * 2 + TOOLBAR_GAP) / (TOOLBAR_CELL + TOOLBAR_GAP)));
  return { columns, rows };
}

function quantizeToolbarExtent(value, axis) {
  const max = axis === "width" ? 760 : 620;
  const cells = clamp(Math.round((Number(value) - TOOLBAR_PADDING * 2 + TOOLBAR_GAP) / (TOOLBAR_CELL + TOOLBAR_GAP)), 1, 16);
  const snapped = toolbarSizeForGrid(axis === "width" ? cells : 1, axis === "height" ? cells : 1)[axis];
  return clamp(snapped, MIN_TOOLBAR_SIZE, max);
}

function visibleToolCapacity(prefs, total) {
  const reserved = 2;
  const slots = Math.max(1, (prefs.columns * prefs.rows) - reserved);
  return Math.min(total, slots);
}

function toolbarOrientation(edge, width, height) {
  if (edge === "top" || edge === "bottom") return "width";
  if (edge === "left" || edge === "right") return "height";
  return width >= height ? "width" : "height";
}

function renderToolButton(tool, active, overflow = false) {
  return `<button type="button" draggable="true" class="command-toolbar__tool ${tool.action === active ? "is-active" : ""} ${overflow ? "is-overflow-item" : ""}" data-action="${tool.action}" data-toolbar-tool-id="${tool.id}" data-tooltip="${escapeAttribute(tool.label)}" aria-label="${escapeAttribute(tool.label)}">
    ${icon(tool.icon, 19)}<span>${escapeHtml(tool.label)}</span>
  </button>`;
}

function edgeAt(x, y) {
  const threshold = Math.min(110, Math.max(64, Math.min(innerWidth, innerHeight) * .12));
  if (x < threshold) return "left";
  if (x > innerWidth - threshold) return "right";
  if (y < threshold) return "top";
  if (y > innerHeight - threshold) return "bottom";
  return null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function escapeAttribute(value = "") {
  return escapeHtml(value).replaceAll('"', "&quot;");
}
