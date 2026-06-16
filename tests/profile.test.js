import { describe, expect, it } from "vitest";
import { createDefaultProfile, createModule, generateProfileName, SCHEMA_VERSION } from "../src/core/profile.js";

describe("profil V3", () => {
  it("crée uniquement le nouveau schéma", () => {
    const profile = createDefaultProfile();
    expect(profile.schemaVersion).toBe(SCHEMA_VERSION);
    expect(profile.modules).toHaveLength(13);
    expect(profile.identity.name).toBeTruthy();
    expect(profile.identity.avatar.kind).toBe("initials");
    expect(profile.modules[0].type).toBe("rich-text");
    expect(profile.uiPreferences.panels.editor.edge).toBe("right");
    expect(profile.atmospheres).toHaveLength(6);
    expect(profile.activeAtmosphereId).toBe("ink");
    expect(profile.modules.every((module) => ["x", "y", "w", "h", "minW", "minH"].every((key) => key in module.layout))).toBe(true);
    expect(profile.modules.every((module) => module.presentation?.rendererId)).toBe(true);
    expect(profile.morphology.enabled).toBe(true);
    expect(profile.morphology.seed).toBe("modulop-v36");
    expect(profile.credits).toHaveLength(8);
    expect(profile.uiPreferences.panels.about.edge).toBe("bottom");
  });

  it("génère un pseudonyme stable en trois parties", () => {
    expect(generateProfileName(42)).toBe(generateProfileName(42));
    expect(generateProfileName(42).split(" ")).toHaveLength(3);
  });

  it("crée des fragments indépendants", () => {
    const first = createModule("starter-pack");
    const second = createModule("starter-pack");
    first.data.items[0].label = "Modifié";
    expect(second.data.items[0].label).toBe("Nouvel objet");
    expect(first.id).not.toBe(second.id);
  });
});
