export class GridController {
  constructor({ grid, onMove, announce }) {
    this.grid = grid;
    this.onMove = onMove;
    this.announce = announce;
    this.session = null;
    this.bound = [];
    this.onKeyDown = (event) => event.key === "Escape" && this.cancel();
    document.addEventListener("keydown", this.onKeyDown, true);
    this.bind();
  }

  bind() {
    this.grid.querySelectorAll(".drag-handle").forEach((handle) => {
      const down = (event) => this.begin(event, handle);
      const keydown = (event) => this.keyboard(event, handle);
      handle.addEventListener("pointerdown", down);
      handle.addEventListener("keydown", keydown);
      this.bound.push([handle, "pointerdown", down], [handle, "keydown", keydown]);
    });
  }

  begin(event, handle) {
    if (event.button !== 0 || this.session) return;
    event.preventDefault();
    const module = handle.closest(".module");
    const modules = [...this.grid.querySelectorAll(".module")];
    const originalIndex = modules.indexOf(module);
    const rect = module.getBoundingClientRect();
    const placeholder = document.createElement("div");
    placeholder.className = "module-placeholder";
    placeholder.style.setProperty("--span", module.style.getPropertyValue("--span"));
    placeholder.style.setProperty("--rows", module.style.getPropertyValue("--rows"));
    module.after(placeholder);
    module.classList.add("is-dragging");
    document.body.classList.add("is-reordering");
    handle.setPointerCapture?.(event.pointerId);
    this.session = {
      handle, module, placeholder, originalIndex, pointerId: event.pointerId,
      offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top,
      originalStyle: module.getAttribute("style")
    };
    this.session.move = (next) => this.move(next);
    this.session.end = (next) => this.commit(next);
    this.session.cancel = () => this.cancel();
    handle.addEventListener("pointermove", this.session.move);
    handle.addEventListener("pointerup", this.session.end);
    handle.addEventListener("pointercancel", this.session.cancel);
    handle.addEventListener("lostpointercapture", this.session.cancel);
    Object.assign(module.style, {
      position: "fixed", zIndex: "900", width: `${rect.width}px`, height: `${rect.height}px`,
      left: `${rect.left}px`, top: `${rect.top}px`, pointerEvents: "none"
    });
    this.announce(`Déplacement de ${module.querySelector("h2")?.textContent || "ce fragment"}. Échap pour annuler.`);
  }

  move(event) {
    const session = this.session;
    if (!session || event.pointerId !== session.pointerId) return;
    session.module.style.left = `${event.clientX - session.offsetX}px`;
    session.module.style.top = `${event.clientY - session.offsetY}px`;
    const candidates = [...this.grid.querySelectorAll(".module:not(.is-dragging)")];
    const target = candidates.find((item) => {
      const rect = item.getBoundingClientRect();
      return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    });
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height / 2 ||
      (Math.abs(event.clientY - (rect.top + rect.height / 2)) < rect.height * .2 && event.clientX > rect.left + rect.width / 2);
    target[after ? "after" : "before"](session.placeholder);
    this.grid.querySelectorAll(".module").forEach((item) => item.classList.toggle("is-insertion-target", item === target));
    session.placeholder.dataset.position = after ? "after" : "before";
  }

  async commit(event) {
    const session = this.session;
    if (!session || event.pointerId !== session.pointerId) return;
    const ordered = [...this.grid.children].filter((item) => item.classList.contains("module") || item === session.placeholder);
    const insertionIndex = ordered.indexOf(session.placeholder);
    const adjusted = insertionIndex > session.originalIndex ? insertionIndex - 1 : insertionIndex;
    const id = session.module.dataset.moduleId;
    this.finish();
    if (adjusted !== session.originalIndex) {
      await this.onMove(id, adjusted);
      this.announce("Fragment déplacé");
    } else {
      this.announce("Position inchangée");
    }
  }

  cancel() {
    if (!this.session) return false;
    this.finish();
    this.announce("Déplacement annulé");
    return true;
  }

  finish() {
    const session = this.session;
    if (!session) return;
    session.handle.removeEventListener("pointermove", session.move);
    session.handle.removeEventListener("pointerup", session.end);
    session.handle.removeEventListener("pointercancel", session.cancel);
    session.handle.removeEventListener("lostpointercapture", session.cancel);
    if (session.handle.hasPointerCapture?.(session.pointerId)) session.handle.releasePointerCapture(session.pointerId);
    session.module.classList.remove("is-dragging");
    session.module.setAttribute("style", session.originalStyle || "");
    session.placeholder.remove();
    this.grid.querySelectorAll(".module").forEach((item) => item.classList.remove("is-insertion-target"));
    document.body.classList.remove("is-reordering");
    this.session = null;
  }

  async keyboard(event, handle) {
    if (!["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const module = handle.closest(".module");
    const modules = [...this.grid.querySelectorAll(".module")];
    const from = modules.indexOf(module);
    const delta = ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1;
    const to = Math.max(0, Math.min(modules.length - 1, from + delta));
    if (from !== to) {
      await this.onMove(module.dataset.moduleId, to);
      this.announce(`Fragment déplacé en position ${to + 1}`);
    }
  }

  destroy() {
    this.cancel();
    this.bound.forEach(([node, event, listener]) => node.removeEventListener(event, listener));
    document.removeEventListener("keydown", this.onKeyDown, true);
  }
}
