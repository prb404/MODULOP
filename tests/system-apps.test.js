import { describe, expect, it } from "vitest";
import { systemAppById, systemAppCatalog, validateSystemApps } from "../src/system/apps.js";

describe("registre d’apps système", () => {
  it("déclare des apps valides et uniques", () => {
    const apps = systemAppCatalog();
    expect(validateSystemApps(apps)).toEqual([]);
    expect(new Set(apps.map((app) => app.id)).size).toBe(apps.length);
  });

  it("expose Présences comme première app complète", () => {
    const presence = systemAppById("presence");
    expect(presence.label).toBe("Présences");
    expect(presence.renderModes).toEqual(expect.arrayContaining(["toolbar", "panel", "sheet", "space-fragment", "toast"]));
    expect(presence.defaultAction).toBe("open-live");
  });
});
