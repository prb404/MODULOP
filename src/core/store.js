import Dexie from "dexie";
import { createModule, createProfileFromTemplate, moduleCatalog, PERSONAL_SPACE_TITLE } from "./profile.js";
import { remoteResources } from "./remote-resources.js";

export const db = new Dexie("modulop-v36");
export const PERSONAL_PROFILE_KEY = "personalProfileId";
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
      markPersonalSpace(this.profile);
      await db.profiles.put(this.profile);
      await db.preferences.put({ key: "activeProfileId", value: this.profile.id });
      await db.preferences.put({ key: PERSONAL_PROFILE_KEY, value: this.profile.id });
    } else if (normalizeProfile(this.profile)) {
      await db.profiles.put(this.profile);
    }
    await this.ensurePersonalSpace();
    return this.profile;
  }

  async ensurePersonalSpace() {
    const personal = await db.preferences.get(PERSONAL_PROFILE_KEY);
    let personalProfile = personal?.value ? await db.profiles.get(personal.value) : null;
    if (!personalProfile) {
      const all = await db.profiles.orderBy("updatedAt").toArray();
      personalProfile = all.find((profile) => profile.space?.kind === "personal") || this.profile;
      markPersonalSpace(personalProfile);
      await db.profiles.put(personalProfile);
      await db.preferences.put({ key: PERSONAL_PROFILE_KEY, value: personalProfile.id });
    } else if (markPersonalSpace(personalProfile) || normalizeProfile(personalProfile)) {
      await db.profiles.put(personalProfile);
    }
    if (this.profile?.id === personalProfile.id) this.profile = personalProfile;
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
    normalizeWorkspaceSpace(this.profile);
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
    const personal = await db.preferences.get(PERSONAL_PROFILE_KEY);
    const target = await db.profiles.get(id);
    if (personal?.value === id || target?.space?.kind === "personal" || target?.space?.locked) return false;
    await db.profiles.delete(id);
    if (this.profile?.id === id) {
      this.profile = await db.profiles.orderBy("updatedAt").last() || createProfileFromTemplate("blank");
      if (this.profile.space?.kind !== "personal") normalizeWorkspaceSpace(this.profile);
      normalizeProfile(this.profile);
      await db.profiles.put(this.profile);
      await db.preferences.put({ key: "activeProfileId", value: this.profile.id });
      this.dispatchEvent(new CustomEvent("change", { detail: this.profile }));
    }
    return true;
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
      markPersonalSpace(this.profile);
      await db.profiles.put(this.profile);
      await db.preferences.put({ key: "activeProfileId", value: this.profile.id });
      await db.preferences.put({ key: PERSONAL_PROFILE_KEY, value: this.profile.id });
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
      markPersonalSpace(this.profile);
      await db.profiles.put(this.profile);
      await db.preferences.put({ key: "activeProfileId", value: this.profile.id });
      await db.preferences.put({ key: PERSONAL_PROFILE_KEY, value: this.profile.id });
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
    space: profile.space,
    uiPreferences: profile.uiPreferences,
    realtimeTraces: profile.realtimeTraces,
    moduleLayouts: profile.modules?.map((module) => [module.id, module.type, module.layout, module.presentation])
  });
  profile.template ||= "custom";
  profile.space ||= {
    kind: "workspace",
    title: profile.identity?.name || "Espace",
    visibility: "private",
    locked: false,
    createdAt: profile.updatedAt || new Date().toISOString()
  };
  if (profile.space.kind === "personal") markPersonalSpace(profile);
  else normalizeWorkspaceSpace(profile);
  profile.uiPreferences ||= {};
  profile.realtimeTraces ||= {};
  profile.realtimeTraces.comments = Array.isArray(profile.realtimeTraces.comments) ? profile.realtimeTraces.comments.filter(Boolean).slice(-240) : [];
  profile.realtimeTraces.reactions = Array.isArray(profile.realtimeTraces.reactions) ? profile.realtimeTraces.reactions.filter(Boolean).slice(-400) : [];
  profile.uiPreferences.moduleActions ||= {};
  profile.uiPreferences.moduleActions.visibleShortcuts = clampNumber(profile.uiPreferences.moduleActions.visibleShortcuts, 1, 3, 1);
  profile.uiPreferences.commandToolbar ||= {};
  profile.uiPreferences.commandToolbar = normalizeToolbarPreferences(profile.uiPreferences.commandToolbar);
  profile.uiPreferences.panels ||= {};
  const defaults = createProfileFromTemplate("blank").uiPreferences.panels;
  Object.entries(defaults).forEach(([key, value]) => {
    profile.uiPreferences.panels[key] = { ...value, ...(profile.uiPreferences.panels[key] || {}) };
  });
  profile.modules = Array.isArray(profile.modules) ? profile.modules.filter(Boolean).map(normalizeModule) : [];
  profile.updatedAt ||= new Date().toISOString();
  const after = JSON.stringify({
    template: profile.template,
    space: profile.space,
    uiPreferences: profile.uiPreferences,
    realtimeTraces: profile.realtimeTraces,
    moduleLayouts: profile.modules?.map((module) => [module.id, module.type, module.layout, module.presentation])
  });
  return before !== after;
}

export function markPersonalSpace(profile) {
  if (!profile) return false;
  const before = JSON.stringify(profile.space);
  profile.space = {
    kind: "personal",
    title: PERSONAL_SPACE_TITLE,
    visibility: "private",
    locked: true,
    createdAt: profile.space?.createdAt || profile.updatedAt || new Date().toISOString()
  };
  return before !== JSON.stringify(profile.space);
}

export function normalizeWorkspaceSpace(profile) {
  if (!profile) return false;
  const before = JSON.stringify(profile.space);
  profile.space = {
    kind: profile.space?.kind === "personal" ? "personal" : "workspace",
    title: profile.space?.title || profile.identity?.name || "Espace",
    visibility: ["private", "circle", "public"].includes(profile.space?.visibility) ? profile.space.visibility : "private",
    locked: Boolean(profile.space?.kind === "personal" || profile.space?.locked),
    createdAt: profile.space?.createdAt || profile.updatedAt || new Date().toISOString()
  };
  if (profile.space.kind === "personal") {
    profile.space.title = PERSONAL_SPACE_TITLE;
    profile.space.visibility = "private";
    profile.space.locked = true;
  }
  return before !== JSON.stringify(profile.space);
}

function normalizeToolbarPreferences(prefs = {}) {
  const defaultOrder = ["spaces", "fragments", "presence", "import", "appearance", "settings", "help"];
  const order = Array.isArray(prefs.order) ? prefs.order.filter((item) => defaultOrder.includes(item)) : [];
  const edge = ["left", "right", "top", "bottom", "free"].includes(prefs.edge) ? prefs.edge : "left";
  const mode = prefs.mode === "float" || edge === "free" ? "float" : "dock";
  const fallback = edge === "top" || edge === "bottom"
    ? toolbarSizeForGrid(defaultOrder.length + 2, 1)
    : toolbarSizeForGrid(1, defaultOrder.length + 2);
  const width = quantizeToolbarExtent(prefs.width ?? prefs.size ?? fallback.width, "width");
  const height = quantizeToolbarExtent(prefs.height ?? fallback.height, "height");
  const columns = Math.max(1, Math.round((width - 16 + 8) / 48));
  const rows = Math.max(1, Math.round((height - 16 + 8) / 48));
  return {
    mode,
    edge,
    x: clampNumber(prefs.x, 0, 4096, 18),
    y: clampNumber(prefs.y, 0, 4096, 120),
    width,
    height,
    columns,
    rows,
    preferredAxis: prefs.preferredAxis === "width" || prefs.preferredAxis === "height" ? prefs.preferredAxis : (edge === "top" || edge === "bottom" ? "width" : "height"),
    order: [...order, ...defaultOrder.filter((item) => !order.includes(item))]
  };
}

function toolbarSizeForGrid(columns = 1, rows = 1) {
  return {
    width: 16 + columns * 40 + Math.max(0, columns - 1) * 8,
    height: 16 + rows * 40 + Math.max(0, rows - 1) * 8
  };
}

function quantizeToolbarExtent(value, axis) {
  const max = axis === "width" ? 760 : 620;
  const number = Number(value);
  const cells = clampNumber(Math.round(((Number.isFinite(number) ? number : 56) - 16 + 8) / 48), 1, 16, 1);
  const size = toolbarSizeForGrid(axis === "width" ? cells : 1, axis === "height" ? cells : 1)[axis];
  return clampNumber(size, 48, max, axis === "width" ? 56 : 440);
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
