import Dexie from "dexie";
import { createModule, createProfileFromTemplate, moduleCatalog } from "./profile.js";
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
      this.profile = createProfileFromTemplate("blank");
      await db.profiles.put(this.profile);
      await db.preferences.put({ key: "activeProfileId", value: this.profile.id });
    } else if (normalizeProfile(this.profile)) {
      await db.profiles.put(this.profile);
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
    normalizeProfile(this.profile);
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
    if (normalizeProfile(this.profile)) await db.profiles.put(this.profile);
    await db.preferences.put({ key: "activeProfileId", value: id });
    this.history = [];
    this.future = [];
    this.dispatchEvent(new CustomEvent("change", { detail: this.profile }));
    return this.profile;
  }

  async deleteSpace(id) {
    await db.profiles.delete(id);
    if (this.profile?.id === id) {
      this.profile = await db.profiles.orderBy("updatedAt").last() || createProfileFromTemplate("blank");
      normalizeProfile(this.profile);
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
    normalizeProfile(this.profile);
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
      this.profile = createProfileFromTemplate("blank");
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
      this.profile = createProfileFromTemplate("blank");
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

export function normalizeProfile(profile) {
  if (!profile || profile.schemaVersion !== 1) return false;
  const before = JSON.stringify({
    template: profile.template,
    uiPreferences: profile.uiPreferences,
    moduleLayouts: profile.modules?.map((module) => [module.id, module.type, module.layout, module.presentation])
  });
  profile.template ||= "custom";
  profile.uiPreferences ||= {};
  profile.uiPreferences.moduleActions ||= {};
  profile.uiPreferences.moduleActions.visibleShortcuts = clampNumber(profile.uiPreferences.moduleActions.visibleShortcuts, 1, 3, 1);
  profile.uiPreferences.panels ||= {};
  const defaults = createProfileFromTemplate("blank").uiPreferences.panels;
  Object.entries(defaults).forEach(([key, value]) => {
    profile.uiPreferences.panels[key] = { ...value, ...(profile.uiPreferences.panels[key] || {}) };
  });
  profile.modules = Array.isArray(profile.modules) ? profile.modules.filter(Boolean).map(normalizeModule) : [];
  profile.updatedAt ||= new Date().toISOString();
  const after = JSON.stringify({
    template: profile.template,
    uiPreferences: profile.uiPreferences,
    moduleLayouts: profile.modules?.map((module) => [module.id, module.type, module.layout, module.presentation])
  });
  return before !== after;
}

function normalizeModule(module) {
  const fallback = createModule(module.type || "rich-text");
  const definition = moduleCatalog.find((item) => item.type === module.type) || moduleCatalog[0];
  module.id ||= crypto.randomUUID();
  module.type ||= fallback.type;
  module.title ||= fallback.title;
  module.variant ||= fallback.variant;
  module.data ||= structuredClone(fallback.data);
  module.presentation ||= structuredClone(fallback.presentation);
  module.presentation.options ||= {};
  module.layout ||= {};
  module.layout.w = clampNumber(module.layout.w, 1, 12, definition.layout?.[0] || 4);
  module.layout.h = clampNumber(module.layout.h, 1, 20, definition.layout?.[1] || 4);
  module.layout.minW = clampNumber(module.layout.minW, 1, module.layout.w, Math.min(3, module.layout.w));
  module.layout.minH = clampNumber(module.layout.minH, 1, module.layout.h, Math.min(2, module.layout.h));
  if (module.layout.x !== undefined) module.layout.x = clampNumber(module.layout.x, 0, 12, 0);
  if (module.layout.y !== undefined) module.layout.y = Math.max(0, Number(module.layout.y) || 0);
  return module;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}
