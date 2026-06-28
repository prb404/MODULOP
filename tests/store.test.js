import { afterEach, describe, expect, it } from "vitest";
import { db, normalizeProfile, ProfileStore, saveAsset } from "../src/core/store.js";

afterEach(async () => {
  await db.profiles.clear();
  await db.assets.clear();
  await db.preferences.clear();
});

describe("persistance locale", () => {
  it("sauvegarde le profil et gère annuler/rétablir", async () => {
    const store = new ProfileStore();
    await store.init();
    const initial = store.profile.activeAtmosphereId;
    store.mutate((profile) => { profile.activeAtmosphereId = "signal"; }, { immediate: true });
    await store.persist();
    store.undo();
    expect(store.profile.activeAtmosphereId).toBe(initial);
    store.redo();
    expect(store.profile.activeAtmosphereId).toBe("signal");
  });

  it("stocke les médias sous une référence asset", async () => {
    const reference = await saveAsset(new Blob(["image"], { type: "image/png" }), "test.png");
    expect(reference.startsWith("asset://")).toBe(true);
    expect(await db.assets.count()).toBe(1);
  });

  it("normalise les anciens profils locaux avant rendu", () => {
    const legacy = {
      schemaVersion: 1,
      id: "legacy",
      identity: { name: "Ancien profil" },
      activeAtmosphereId: "ink",
      modules: [{
        id: "m1",
        type: "rich-text",
        title: "Ancien fragment",
        data: { markdown: "# Test" },
        layout: { w: "20", h: undefined }
      }]
    };

    expect(normalizeProfile(legacy)).toBe(true);
    expect(legacy.template).toBe("custom");
    expect(legacy.space).toMatchObject({ kind: "workspace", title: "Ancien profil", visibility: "private", locked: false });
    expect(legacy.uiPreferences.moduleActions.visibleShortcuts).toBe(1);
    expect(legacy.uiPreferences.commandToolbar.edge).toBe("left");
    expect(legacy.uiPreferences.panels.editor.edge).toBe("right");
    expect(legacy.realtimeTraces.comments).toEqual([]);
    expect(legacy.realtimeTraces.reactions).toEqual([]);
    expect(legacy.modules[0].layout.w).toBe(12);
    expect(legacy.modules[0].layout.h).toBe(5);
    expect(legacy.modules[0].presentation.rendererId).toBeTruthy();
  });

  it("verrouille l’espace personnel et refuse sa suppression", async () => {
    const store = new ProfileStore();
    await store.init();
    const personalId = store.profile.id;
    expect(store.profile.space.title).toBe("Espace personnel");
    expect(await store.deleteSpace(personalId)).toBe(false);
    expect(await db.profiles.get(personalId)).toBeTruthy();

    const workspace = await store.createSpace("blank");
    expect(workspace.space.kind).toBe("workspace");
    expect(await store.deleteSpace(workspace.id)).toBe(true);
  });
});
