import { afterEach, describe, expect, it } from "vitest";
import { db, ProfileStore, saveAsset } from "../src/core/store.js";

afterEach(async () => {
  await db.profiles.clear();
  await db.assets.clear();
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
});
