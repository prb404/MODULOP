import { describe, expect, it } from "vitest";
import { classifyFileInput, classifyTextInput, createMediaModule, createModuleFromTextClassification } from "../src/core/ingest.js";
import { createModule } from "../src/core/profile.js";

describe("ingestion de contenus", () => {
  it("classe les URL de providers connus comme embeds sûrs", () => {
    const result = classifyTextInput("https://www.youtube.com/watch?v=abc123");

    expect(result.kind).toBe("embed");
    expect(result.embed.src).toContain("youtube-nocookie.com/embed/abc123");
  });

  it("classe une URL HTTPS générique comme link-card", () => {
    const result = classifyTextInput("https://example.org/article");
    const module = createModuleFromTextClassification(result, createModule);

    expect(result.kind).toBe("url");
    expect(module.type).toBe("link-card");
    expect(module.data.url).toBe("https://example.org/article");
  });

  it("transforme le texte long en rich-text", () => {
    const result = classifyTextInput("# Titre\n\nUn texte structuré avec plusieurs lignes.\n\n- Item");
    const module = createModuleFromTextClassification(result, createModule);

    expect(result.kind).toBe("rich-text");
    expect(module.type).toBe("rich-text");
    expect(module.data.markdown).toContain("# Titre");
  });

  it("reconnaît images et fichiers portables", () => {
    const image = new File(["x"], "visuel.png", { type: "image/png" });
    const portable = new File(["{}"], "profil.modulop.zip", { type: "application/zip" });

    expect(classifyFileInput(image).kind).toBe("image");
    expect(classifyFileInput(portable).kind).toBe("portable-file");
  });

  it("crée un fragment média local depuis un asset", () => {
    const module = createMediaModule({ asset: "asset://abc", name: "image.png", type: "image/png" }, createModule);

    expect(module.type).toBe("media");
    expect(module.data.src).toBe("asset://abc");
    expect(module.data.kind).toBe("image");
  });
});
