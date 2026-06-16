export class GridStackManager {
  constructor({ element, onLayout, announce }) {
    this.element = element;
    this.onLayout = onLayout;
    this.announce = announce;
    this.grid = null;
    this.snapshot = null;
    this.cancelled = false;
    this.onKeyDown = (event) => {
      if (event.key !== "Escape" || !this.snapshot) return;
      event.preventDefault();
      this.cancelled = true;
      this.grid?.load(this.snapshot);
      this.finishInteraction("Disposition restaurée");
    };
  }

  async init() {
    if (this.grid) return this.grid;
    const { GridStack } = await import("gridstack");
    this.grid = GridStack.init({
      column: 12,
      cellHeight: 88,
      margin: 7,
      float: true,
      animate: true,
      draggable: {
        handle: ".module",
        cancel: "input,textarea,button,select,option,a,[contenteditable],.markdown-content,.portrait-answer blockquote,.portrait-answer p,.manual-list p,.timeline p,.gardner-copy,.link-card"
      },
      alwaysShowResizeHandle: "mobile",
      resizable: { handles: "all" },
      columnOpts: {
        breakpoints: [
          { w: 720, c: 1 },
          { w: 1060, c: 6 }
        ],
        layout: "list"
      }
    }, this.element);
    this.grid.on("dragstart resizestart", () => this.beginInteraction());
    this.grid.on("dragstop resizestop", (_event, element) => {
      if (!this.cancelled) this.commitLayout();
      this.finishInteraction(element ? "Disposition mise à jour" : "");
    });
    this.grid.on("change", () => {
      this.element.classList.add("is-layout-active");
    });
    document.addEventListener("keydown", this.onKeyDown, true);
    return this.grid;
  }

  addWidget(element, layout) {
    if (!this.grid) throw new Error("La grille doit être initialisée avant l’ajout d’un widget.");
    applyAttributes(element, this.responsiveLayout(element, layout, true));
    this.element.append(element);
    this.grid.makeWidget(element);
  }

  removeWidget(element) {
    if (this.grid && element?.isConnected) this.grid.removeWidget(element, true, false);
  }

  clear() {
    if (!this.grid) {
      this.element.replaceChildren();
      return;
    }
    this.grid.removeAll(true);
    this.element.replaceChildren();
    this.snapshot = null;
    this.cancelled = false;
    this.element.classList.remove("is-layout-active");
    document.body.classList.remove("is-grid-interacting");
  }

  updateWidget(element, layout) {
    if (!this.grid || !element) return;
    this.grid.update(element, this.responsiveLayout(element, layout));
  }

  responsiveLayout(element, layout, autoPosition = false) {
    const columns = this.grid?.getColumn() || 12;
    const type = element.dataset.moduleType;
    const mobileHeight = {
      "rich-text": 7, "starter-pack": 8, constellation: 7, gardner: 7,
      values: 6, manual: 5, timeline: 5, embed: 5
    }[type];
    const minimumHeight = {
      "rich-text": 4, values: 5, "starter-pack": 4, constellation: 5, gardner: 5
    }[type] || layout.minH || 2;
    const normalized = {
      ...layout,
      h: Math.max(layout.h || minimumHeight, minimumHeight),
      minH: Math.max(layout.minH || 1, minimumHeight)
    };
    if (columns >= 12) return normalized;
    return {
      ...normalized,
      x: undefined, y: undefined, w: Math.min(normalized.w, columns),
      h: columns === 1 ? mobileHeight || Math.max(4, normalized.h) : normalized.h,
      autoPosition
    };
  }

  compact() {
    this.grid?.compact("compact", false);
  }

  positionNear(element, anchorLayout, direction = "after", requestedLayout = {}) {
    if (!element || !anchorLayout) return;
    const next = insertionLayout(anchorLayout, direction, this.grid?.getColumn() || 12, requestedLayout);
    this.grid.update(element, next);
    this.commitLayout();
  }

  commitLayout() {
    const layouts = this.grid.save(false).map((node) => ({
      id: node.id || node.el?.dataset.moduleId,
      x: node.x, y: node.y, w: node.w, h: node.h,
      minW: node.minW || 1, minH: node.minH || 1
    }));
    this.onLayout?.(layouts.filter((item) => item.id));
  }

  beginInteraction() {
    this.snapshot = this.grid.save(false);
    this.cancelled = false;
    this.element.classList.add("is-layout-active");
    document.body.classList.add("is-grid-interacting");
  }

  finishInteraction(message) {
    this.snapshot = null;
    this.element.classList.remove("is-layout-active");
    document.body.classList.remove("is-grid-interacting");
    if (message) this.announce?.(message);
  }

  destroy() {
    document.removeEventListener("keydown", this.onKeyDown, true);
    this.grid?.destroy(false);
    this.grid = null;
  }
}

function applyAttributes(element, layout) {
  const values = {
    "gs-id": element.dataset.moduleId,
    "gs-x": layout.x,
    "gs-y": layout.y,
    "gs-w": layout.w,
    "gs-h": layout.h,
    "gs-min-w": layout.minW,
    "gs-min-h": layout.minH
  };
  Object.entries(values).forEach(([name, value]) => {
    if (value !== undefined) element.setAttribute(name, value);
  });
  if (layout.autoPosition) element.setAttribute("gs-auto-position", "true");
}

function insertionLayout(anchor, direction, columns, requested = {}) {
  const layout = {
    w: Math.min(requested.w || anchor.w || 4, columns),
    h: requested.h || anchor.h || 3
  };
  if (direction === "before") return { ...layout, x: anchor.x, y: Math.max(0, anchor.y - layout.h) };
  if (direction === "left") return { ...layout, x: Math.max(0, anchor.x - layout.w), y: anchor.y };
  if (direction === "right") return { ...layout, x: Math.min(columns - layout.w, anchor.x + anchor.w), y: anchor.y };
  return { ...layout, x: anchor.x, y: anchor.y + anchor.h };
}
