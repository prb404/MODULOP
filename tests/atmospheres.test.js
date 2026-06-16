import { describe, expect, it } from "vitest";
import { activeAtmosphere, contrastRatio, createAtmosphere, createDefaultAtmospheres } from "../src/core/atmospheres.js";

describe("atmosphères", () => {
  it("fournit cinq modèles et un Custom puis sélectionne l’atmosphère active", () => {
    const atmospheres = createDefaultAtmospheres();
    const profile = { atmospheres, activeAtmosphereId: "paper" };
    expect(atmospheres.map((item) => item.id)).toEqual(["ink", "forest", "paper", "pearl", "signal", "custom"]);
    expect(activeAtmosphere(profile).name).toBe("Papier");
  });

  it("duplique sans partager les réglages", () => {
    const [source] = createDefaultAtmospheres();
    const copy = createAtmosphere(source);
    copy.colors.bg = "#000000";
    expect(copy.id).not.toBe(source.id);
    expect(source.colors.bg).toBe("#11130f");
  });

  it("calcule un contraste exploitable", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1);
  });
});
