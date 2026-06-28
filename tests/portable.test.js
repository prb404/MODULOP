import JSZip from "jszip";
import { afterEach, describe, expect, it } from "vitest";
import { collectAssetReferences, importFragmentPackage, importProfile } from "../src/core/portable.js";
import { createDefaultProfile } from "../src/core/profile.js";
import { db } from "../src/core/store.js";

afterEach(async () => {
  await db.assets.clear();
});

describe("format autonome MODULOP", () => {
  it("réimporte un profil et ses médias depuis un paquet zip", async () => {
    const profile = createDefaultProfile();
    const assetId = crypto.randomUUID();
    const zip = new JSZip();
    zip.file("profile.json", JSON.stringify(profile));
    zip.file("manifest.json", JSON.stringify({
      format: "modulop",
      version: 1,
      assets: [{ id: assetId, name: "visuel.png", type: "image/png" }]
    }));
    zip.file(`assets/${assetId}`, new Uint8Array([137, 80, 78, 71]));
    const archive = await zip.generateAsync({ type: "uint8array" });
    archive.name = "profil.modulop.zip";

    const imported = await importProfile(archive);

    expect(imported.schemaVersion).toBe(1);
    expect(imported.modules).toHaveLength(14);
    expect(await db.assets.get(assetId)).toMatchObject({ name: "visuel.png", type: "image/png" });
  });

  it("détecte les médias locaux référencés dans un fragment", () => {
    const refs = collectAssetReferences({
      data: {
        src: "asset://hero",
        items: [{ media: "asset://card" }, { media: "https://example.com/image.png" }]
      },
      presentation: { backgroundImage: "asset://hero" }
    });

    expect([...refs].sort()).toEqual(["card", "hero"]);
  });

  it("réimporte un fragment autonome et ses médias sans conserver son emplacement", async () => {
    const assetId = crypto.randomUUID();
    const module = {
      id: "fragment-source",
      type: "media",
      title: "Image locale",
      variant: "caption",
      data: { src: `asset://${assetId}`, title: "Visuel" },
      layout: { x: 4, y: 8, w: 4, h: 3 }
    };
    const zip = new JSZip();
    zip.file("fragment.json", JSON.stringify({ format: "modulop-fragment", version: 1, module }));
    zip.file("manifest.json", JSON.stringify({
      format: "modulop-fragment",
      version: 1,
      assets: [{ id: assetId, name: "visuel.png", type: "image/png" }]
    }));
    zip.file(`assets/${assetId}`, new Uint8Array([137, 80, 78, 71]));
    const archive = await zip.generateAsync({ type: "uint8array" });
    archive.name = "image-locale.modulop-fragment.zip";

    const imported = await importFragmentPackage(archive);

    expect(imported).toMatchObject({ type: "media", title: "Image locale", data: { src: `asset://${assetId}` } });
    expect(imported.id).not.toBe(module.id);
    expect(imported.layout).toMatchObject({ w: 4, h: 3 });
    expect(imported.layout.x).toBeUndefined();
    expect(imported.layout.y).toBeUndefined();
    expect(await db.assets.get(assetId)).toMatchObject({ name: "visuel.png", type: "image/png" });
  });
});
