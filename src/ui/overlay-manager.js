import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";

export class OverlayManager {
  constructor() {
    this.cleanups = new Set();
  }

  position(anchor, overlay, { placement = "top", distance = 8 } = {}) {
    const update = async () => {
      if (!anchor.isConnected || !overlay.isConnected) {
        cleanup();
        overlay.remove();
        return;
      }
      const { x, y } = await computePosition(anchor, overlay, {
        strategy: "fixed",
        placement,
        middleware: [offset(distance), flip(), shift({ padding: 10 })]
      });
      Object.assign(overlay.style, { position: "fixed", left: `${x}px`, top: `${y}px` });
    };
    const stop = autoUpdate(anchor, overlay, update, { animationFrame: true });
    const cleanup = () => {
      stop();
      this.cleanups.delete(cleanup);
    };
    this.cleanups.add(cleanup);
    update();
    return cleanup;
  }

  destroy() {
    [...this.cleanups].forEach((cleanup) => cleanup());
  }
}

export const overlays = new OverlayManager();
