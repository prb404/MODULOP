import { describe, expect, it } from "vitest";
import { diceBearUrl, initialsAvatar, visualRef } from "../src/core/visuals.js";

describe("références visuelles", () => {
  it("normalise les anciens visuels simples", () => {
    expect(visualRef("🌿")).toMatchObject({ kind: "emoji", value: "🌿" });
    expect(visualRef("asset://abc")).toMatchObject({ kind: "asset", src: "asset://abc" });
  });

  it("construit une URL DiceBear déterministe", () => {
    expect(diceBearUrl({ style: "shapes", seed: "Profil test" })).toContain("shapes/svg?seed=Profil%20test");
  });

  it("génère un avatar local à initiales", () => {
    expect(initialsAvatar("Bambou Koala Solaire")).toMatchObject({ kind: "initials", initials: "BKS" });
  });
});
