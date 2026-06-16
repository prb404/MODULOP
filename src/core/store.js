import Dexie from "dexie";
import { createDefaultProfile, createProfileFromTemplate } from "./profile.js";
import { remoteResources } from "./remote-resources.js";

export const db = new Dexie("modulop-v36");
db.version(1).stores({
  profiles: "id,updatedAt",
  assets: "id,createdAt,type",
  preferences: "key"
});

export class ProfileStore extends EventTarget {
  constructor() {
    super();
    this.profile = null;
    this.history = [];
    this.future = [];
    this.saveTimer = null;
    this.status = "saved";
  }

  async init() {
    const activeId = await db.preferences.get("activeProfileId");
    this.profile = activeId?.value ? await db.profiles.get(activeId.value) : await db.profiles.orderBy("updatedAt").last();
    if (!this.profile || this.profile.schemaVersion !== 1) {
      this.profile = createDefaultProfile();
      await db.profiles.put(this.profile);
      await db.preferences.put({ key: "activeProfileId", value: this.profile.id });
    }
    return this.profile;
  }

  async profiles() {
    const assets = await db.assets.count();
    return (await db.profiles.orderBy("updatedAt").reverse().toArray()).map((profile) => ({
      ...profile,
      moduleCount: profile.modules?.length || 0,
      assetCount: assets,
      template: profile.template || "custom"
    }));
  }

  async stats() {
    return {
      profiles: await db.profiles.count(),
      assets: await db.assets.count(),
      preferences: await db.preferences.count(),
      consents: remoteResources.count()
    };
  }

  async createSpace(template = "blank") {
    this.profile = createProfileFromTemplate(template);
    await db.profiles.put(this.profile);
    await db.preferences.put({ key: "activeProfileId", value: this.profile.id });
    this.history = [];
    this.future = [];
    this.dispatchEvent(new CustomEvent("change", { detail: this.profile }));
    return this.profile;
  }

  async openSpace(id) {
    const next = await db.profiles.get(id);
    if (!next) return null;
    this.profile = next;
    await db.preferences.put({ key: "activeProfileId", value: id });
    this.history = [];
    this.future = [];
    this.dispatchEvent(new CustomEvent("change", { detail: this.profile }));
    return this.profile;
  }

  async deleteSpace(id) {
    await db.profiles.delete(id);
    if (this.profile?.id === id) {
      this.profile = await db.profiles.orderBy("updatedAt").last() || createDefaultProfile();
      await db.profiles.put(this.profile);
      await db.preferences.put({ key: "activeProfileId", value: this.profile.id });
      this.dispatchEvent(new CustomEvent("change", { detail: this.profile }));
    }
  }

  snapshot() {
    return structuredClone(this.profile);
  }

  mutate(mutator, { history = true, immediate = false } = {}) {
    if (history) {
      this.history.push(this.snapshot());
      this.history = this.history.slice(-40);
      this.future = [];
    }
    mutator(this.profile);
    this.profile.updatedAt = new Date().toISOString();
    this.status = "dirty";
    this.dispatchEvent(new CustomEvent("change", { detail: this.profile }));
    immediate ? this.persist() : this.scheduleSave();
  }

  scheduleSave() {
    clearTimeout(this.saveTimer);
    this.status = "saving";
    this.dispatchEvent(new CustomEvent("status", { detail: this.status }));
    this.saveTimer = setTimeout(() => this.persist(), 450);
  }

  async persist() {
    clearTimeout(this.saveTimer);
    await db.profiles.put(this.profile);
    await db.preferences.put({ key: "activeProfileId", value: this.profile.id });
    this.status = "saved";
    this.dispatchEvent(new CustomEvent("status", { detail: this.status }));
  }

  undo() {
    const previous = this.history.pop();
    if (!previous) return;
    this.future.push(this.snapshot());
    this.profile = previous;
    this.persist();
    this.dispatchEvent(new CustomEvent("change", { detail: this.profile }));
  }

  redo() {
    const next = this.future.pop();
    if (!next) return;
    this.history.push(this.snapshot());
    this.profile = next;
    this.persist();
    this.dispatchEvent(new CustomEvent("change", { detail: this.profile }));
  }

  async reset() {
    await db.transaction("rw", db.profiles, db.assets, db.preferences, async () => {
      await db.profiles.clear();
      await db.assets.clear();
      this.profile = createDefaultProfile();
      await db.profiles.put(this.profile);
      await db.preferences.put({ key: "activeProfileId", value: this.profile.id });
    });
    this.history = [];
    this.future = [];
    this.dispatchEvent(new CustomEvent("change", { detail: this.profile }));
  }

  async resetAllLocalData() {
    await db.transaction("rw", db.profiles, db.assets, db.preferences, async () => {
      await db.profiles.clear();
      await db.assets.clear();
      await db.preferences.clear();
      this.profile = createDefaultProfile();
      await db.profiles.put(this.profile);
      await db.preferences.put({ key: "activeProfileId", value: this.profile.id });
    });
    remoteResources.clear();
    await clearBrowserCaches();
    clearWritableCookies();
    this.history = [];
    this.future = [];
    this.dispatchEvent(new CustomEvent("change", { detail: this.profile }));
    return this.profile;
  }
}

async function clearBrowserCaches() {
  if (!globalThis.caches?.keys) return;
  try {
    await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
  } catch {}
}

function clearWritableCookies() {
  if (!globalThis.document?.cookie) return;
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
  });
}

export async function saveAsset(blob, name = "media") {
  const id = crypto.randomUUID();
  await db.assets.put({ id, blob, name, type: blob.type, createdAt: new Date().toISOString() });
  return `asset://${id}`;
}

export async function resolveAsset(reference) {
  if (!reference?.startsWith("asset://")) return reference;
  const asset = await db.assets.get(reference.slice(8));
  return asset ? URL.createObjectURL(asset.blob) : "";
}
