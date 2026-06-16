import { describe, expect, it } from "vitest";
import { createDefaultProfile } from "../src/core/profile.js";
import { lockMorphologySection, MorphologyEngine } from "../src/core/morphology.js";

describe("morphologie contrôlée", () => {
  it("génère une présentation déterministe sans modifier les contenus", () => {
    const first = createDefaultProfile();
    const second = structuredClone(first);
    const content = first.modules.map((module) => structuredClone(module.data));
    const engine = new MorphologyEngine();

    engine.generateProfile(first, "graine-stable");
    engine.generateProfile(second, "graine-stable");

    expect(first.atmospheres).toEqual(second.atmospheres);
    expect(first.modules.map(({ layout, presentation, variant }) => ({ layout, presentation, variant })))
      .toEqual(second.modules.map(({ layout, presentation, variant }) => ({ layout, presentation, variant })));
    expect(first.modules.map((module) => module.data)).toEqual(content);
  });

  it("respecte les verrous de section", () => {
    const profile = createDefaultProfile();
    const palette = structuredClone(profile.atmospheres[0].colors);
    const variant = profile.modules[0].variant;
    lockMorphologySection(profile, "atmosphere", "palette");
    lockMorphologySection(profile, profile.modules[0].id, "variant");

    new MorphologyEngine().generateProfile(profile, "autre-graine");

    expect(profile.atmospheres[0].colors).toEqual(palette);
    expect(profile.modules[0].variant).toBe(variant);
  });
});
