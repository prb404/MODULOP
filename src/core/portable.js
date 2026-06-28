import { db } from "./store.js";

export async function exportProfile(profile) {
  return exportZipProfile(profile, { fallbackToJson: true });
}

export async function exportJsonProfile(profile) {
  const name = profile.identity?.name || profile.pseudonym || "profil-modulop";
  download(new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" }), `${slug(name)}.json`);
  return "Profil JSON exporté";
}

export async function exportZipProfile(profile, { fallbackToJson = false } = {}) {
  const assets = await db.assets.toArray();
  const name = profile.identity?.name || profile.pseudonym || "profil-modulop";
  if (!assets.length && fallbackToJson) return exportJsonProfile(profile);
  const JSZip = await loadZip();
  const zip = new JSZip();
  zip.file("profile.json", JSON.stringify(profile, null, 2));
  zip.file("manifest.json", JSON.stringify({ format: "modulop", version: 1, credits: profile.credits || [], assets: assets.map(({ id, name, type }) => ({ id, name, type })) }, null, 2));
  assets.forEach((asset) => zip.file(`assets/${asset.id}`, asset.blob));
  download(await zip.generateAsync({ type: "blob" }), `${slug(name)}.modulop.zip`);
  return "Profil autonome exporté";
}

export async function exportFragmentPackage(module) {
  const blob = await exportFragmentBlob(module);
  download(blob, `${slug(module.title || module.type || "fragment")}.modulop-fragment.zip`);
  return "Fragment exporté";
}

export async function exportFragmentBlob(module) {
  const assets = await assetsForFragment(module);
  const JSZip = await loadZip();
  const zip = new JSZip();
  zip.file("fragment.json", JSON.stringify({ format: "modulop-fragment", version: 1, module }, null, 2));
  zip.file("manifest.json", JSON.stringify({ format: "modulop-fragment", version: 1, assets: assets.map(({ id, name, type }) => ({ id, name, type })) }, null, 2));
  assets.forEach((asset) => zip.file(`assets/${asset.id}`, asset.blob));
  return zip.generateAsync({ type: "blob" });
}

export async function importProfile(file) {
  if (file.name.endsWith(".json")) return JSON.parse(await file.text());
  const JSZip = await loadZip();
  const zip = await JSZip.loadAsync(file);
  const profile = JSON.parse(await zip.file("profile.json").async("text"));
  const manifest = JSON.parse(await zip.file("manifest.json").async("text"));
  await db.assets.bulkPut(await Promise.all(manifest.assets.map(async (asset) => ({
    ...asset,
    blob: await zip.file(`assets/${asset.id}`).async("blob"),
    createdAt: new Date().toISOString()
  }))));
  return profile;
}

export async function importFragmentPackage(file) {
  if (file.name?.endsWith(".json")) {
    const module = JSON.parse(await file.text());
    return normalizeFragment(module?.module || module);
  }
  const JSZip = await loadZip();
  const zip = await JSZip.loadAsync(file);
  const manifest = JSON.parse(await zip.file("manifest.json").async("text"));
  if (manifest.format !== "modulop-fragment") throw new Error("Archive de fragment invalide");
  const payload = JSON.parse(await zip.file("fragment.json").async("text"));
  await db.assets.bulkPut(await Promise.all((manifest.assets || []).map(async (asset) => ({
    ...asset,
    blob: await zip.file(`assets/${asset.id}`).async("blob"),
    createdAt: new Date().toISOString()
  }))));
  return normalizeFragment(payload.module);
}

export function collectAssetReferences(value, refs = new Set()) {
  if (!value) return refs;
  if (typeof value === "string") {
    if (value.startsWith("asset://")) refs.add(value.slice(8));
    return refs;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectAssetReferences(item, refs));
    return refs;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((item) => collectAssetReferences(item, refs));
  }
  return refs;
}

async function assetsForFragment(module) {
  const ids = [...collectAssetReferences(module)];
  return (await Promise.all(ids.map((id) => db.assets.get(id)))).filter(Boolean);
}

function normalizeFragment(module) {
  if (!module?.type || !module?.data) throw new Error("Fragment invalide");
  const copy = structuredClone(module);
  copy.id = crypto.randomUUID();
  copy.title ||= "Fragment importé";
  copy.layout = { ...(copy.layout || {}), x: undefined, y: undefined };
  return copy;
}

function slug(value) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = Object.assign(document.createElement("a"), { href: url, download: name });
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function loadZip() {
  const module = await import("jszip");
  return module.default;
}
