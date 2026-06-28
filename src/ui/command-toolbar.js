import { icon } from "./icons.js";

const TOOLS = {
  spaces: { icon: "PanelTopOpen", label: "Espaces", action: "show-home" },
  fragments: { icon: "LayoutGrid", label: "Fragments", action: "open-library" },
  presence: { icon: "Radar", label: "Présences", action: "open-live" },
  import: { icon: "FileUp", label: "Importer", action: "import" },
  appearance: { icon: "Palette", label: "Apparence", action: "open-atmosphere" },
  settings: { icon: "SlidersHorizontal", label: "Réglages", action: "open-menu" },
  help: { icon: "CircleHelp", label: "Aide", action: "open-about" }
};

const EDGES = ["left", "right", "top", "bottom"];

export class CommandToolbar {
  constructor({ host, getPreferences, savePreferences }) {
    this.host = host;
    this.getPreferences = getPreferences;
    this.savePreferences = savePreferences;
    this.session = null;
  }

  render({ active = "", status = "", currentSpace = "" } = {}) {
    const prefs = normalizeToolbarPreferences(this.getPreferences());
    const tools = prefs.order.map((id) => TOOLS[id]).filter(Boolean);
    this.host.innerHTML = `<nav class="command-toolbar command-toolbar--${prefs.edge} ${prefs.expanded ? "is-expanded" : ""}" aria-label="Commandes principales"
      style="--toolbar-size:${prefs.size}px;--toolbar-x:${prefs.x}px;--toolbar-y:${prefs.y}px">
      <button class="command-toolbar__handle" type="button" data-toolbar-drag data-tooltip="Déplacer les commandes" aria-label="Déplacer les commandes">${icon("GripHorizontal", 17)}</button>
      <div class="command-toolbar__status" title="${escapeAttribute(currentSpace)}"><i class="${status === "p2p" ? "is-online" : ""}"></i><span>${escapeHtml(currentSpace)}</span></div>
      <div class="command-toolbar__tools">
        ${tools.map((tool) => `<button type="button" data-action="${tool.action}" class="${tool.action === active ? "is-active" : ""}" data-tooltip="${tool.label}" aria-label="${tool.label}">
          ${icon(tool.icon, 19)}<span>${tool.label}</span>
        </button>`).join("")}
      </div>
      <div class="command-toolbar__edges" aria-label="Position de la toolbar">
        ${EDGES.map((edge) => `<button type="button" data-toolbar-edge="${edge}" class="${prefs.edge === edge ? "is-active" : ""}" data-tooltip="${edgeLabel(edge)}" aria-label="${edgeLabel(edge)}">${icon(edgeIcon(edge), 15)}</button>`).join("")}
      </div>
      <button class="command-toolbar__expand" type="button" data-toolbar-expand data-tooltip="${prefs.expanded ? "Réduire" : "Étendre"}" aria-label="${prefs.expanded ? "Réduire la toolbar" : "Étendre la toolbar"}">${icon(prefs.expanded ? "ChevronUp" : "ChevronDown", 16)}</button>
      <span class="command-toolbar__resize" data-toolbar-resize aria-hidden="true"></span>
    </nav>`;
    this.bind();
  }

  bind() {
    const toolbar = this.host.querySelector(".command-toolbar");
    if (!toolbar) return;
    toolbar.querySelector("[data-toolbar-expand]")?.addEventListener("click", () => {
      const prefs = normalizeToolbarPreferences(this.getPreferences());
      this.savePreferences({ expanded: !prefs.expanded });
    });
    toolbar.querySelectorAll("[data-toolbar-edge]").forEach((button) => button.addEventListener("click", () => {
      this.savePreferences({ edge: button.dataset.toolbarEdge });
    }));
    toolbar.querySelector("[data-toolbar-drag]")?.addEventListener("pointerdown", (event) => this.beginMove(event, toolbar));
    toolbar.querySelector("[data-toolbar-resize]")?.addEventListener("pointerdown", (event) => this.beginResize(event, toolbar));
  }

  beginMove(event, toolbar) {
    if (event.button !== 0) return;
    event.preventDefault();
    const rect = toolbar.getBoundingClientRect();
    this.beginSession(event, toolbar, "move", { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, width: rect.width, height: rect.height });
  }

  beginResize(event, toolbar) {
    if (event.button !== 0) return;
    event.preventDefault();
    const rect = toolbar.getBoundingClientRect();
    this.beginSession(event, toolbar, "resize", { size: rect.width, x: event.clientX, y: event.clientY });
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
      session.toolbar.classList.add("command-toolbar--free");
      session.edge = edgeAt(event.clientX, event.clientY);
    } else {
      const delta = Math.max(Math.abs(event.clientX - session.initial.x), Math.abs(event.clientY - session.initial.y));
      const size = clamp(session.initial.size + delta, 44, 72);
      session.toolbar.style.setProperty("--toolbar-size", `${size}px`);
    }
  }

  commit(event) {
    const session = this.session;
    if (!session || (event.pointerId !== undefined && event.pointerId !== session.pointerId)) return;
    const rect = session.toolbar.getBoundingClientRect();
    const values = session.operation === "move"
      ? { edge: session.edge || "free", x: Math.round(rect.left), y: Math.round(rect.top) }
      : { size: Math.round(rect.width) };
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
  const order = Array.isArray(prefs.order) ? prefs.order.filter((id) => TOOLS[id]) : [];
  return {
    edge: ["left", "right", "top", "bottom", "free"].includes(prefs.edge) ? prefs.edge : "left",
    x: clamp(Number(prefs.x) || 18, 8, 4096),
    y: clamp(Number(prefs.y) || 120, 8, 4096),
    size: clamp(Number(prefs.size) || 48, 44, 72),
    expanded: Boolean(prefs.expanded),
    order: [...order, ...Object.keys(TOOLS).filter((id) => !order.includes(id))]
  };
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

function edgeIcon(edge) {
  return { left: "PanelLeft", right: "PanelRight", top: "PanelTop", bottom: "PanelBottom" }[edge];
}

function edgeLabel(edge) {
  return { left: "Ancrer à gauche", right: "Ancrer à droite", top: "Ancrer en haut", bottom: "Ancrer en bas" }[edge];
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function escapeAttribute(value = "") {
  return escapeHtml(value).replaceAll('"', "&quot;");
}
