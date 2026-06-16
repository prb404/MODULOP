import JSZip from "jszip";
import { afterEach, describe, expect, it } from "vitest";
import { importProfile } from "../src/core/portable.js";
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
    expect(imported.modules).toHaveLength(13);
    expect(await db.assets.get(assetId)).toMatchObject({ name: "visuel.png", type: "image/png" });
  });
});
