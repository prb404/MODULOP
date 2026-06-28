import { describe, expect, it } from "vitest";
import { normalizeToolbarPreferences, TOOLBAR_ORDER } from "../src/ui/command-toolbar.js";

describe("toolbar de commande", () => {
  it("normalise les anciennes préférences sans perdre les outils", () => {
    const prefs = normalizeToolbarPreferences({ edge: "left", size: 48, expanded: true, order: ["presence", "spaces"] });

    expect(prefs.mode).toBe("dock");
    expect(prefs.edge).toBe("left");
    expect(prefs.width).toBeGreaterThanOrEqual(48);
    expect(prefs.height).toBeGreaterThanOrEqual(48);
    expect(prefs.columns).toBeGreaterThanOrEqual(1);
    expect(prefs.rows).toBeGreaterThanOrEqual(1);
    expect(prefs.order.slice(0, 2)).toEqual(["presence", "spaces"]);
    expect(prefs.order).toEqual(expect.arrayContaining(TOOLBAR_ORDER));
  });

  it("supporte un mode flottant quantifié", () => {
    const prefs = normalizeToolbarPreferences({ edge: "free", mode: "float", width: 219, height: 104, x: 30, y: 80 });

    expect(prefs.mode).toBe("float");
    expect(prefs.edge).toBe("free");
    expect(prefs.width).toBeGreaterThanOrEqual(48);
    expect(prefs.height).toBeGreaterThanOrEqual(48);
    expect(prefs.x).toBe(30);
    expect(prefs.y).toBe(80);
  });
});
