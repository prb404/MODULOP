import JSZip from "jszip";
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
  const zip = new JSZip();
  zip.file("profile.json", JSON.stringify(profile, null, 2));
  zip.file("manifest.json", JSON.stringify({ format: "modulop", version: 1, credits: profile.credits || [], assets: assets.map(({ id, name, type }) => ({ id, name, type })) }, null, 2));
  assets.forEach((asset) => zip.file(`assets/${asset.id}`, asset.blob));
  download(await zip.generateAsync({ type: "blob" }), `${slug(name)}.modulop.zip`);
  return "Profil autonome exporté";
}

export async function importProfile(file) {
  if (file.name.endsWith(".json")) return JSON.parse(await file.text());
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

function slug(value) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = Object.assign(document.createElement("a"), { href: url, download: name });
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
