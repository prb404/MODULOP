import { resolveEmbed } from "./embed-providers.js";

export function classifyTextInput(input = "") {
  const text = String(input || "").trim();
  if (!text) return { kind: "empty" };
  if (looksLikePortableJson(text)) return { kind: "portable-json", text };
  const embed = resolveEmbed(text);
  if (embed && !embed.generic) return { kind: "embed", text, embed };
  const url = safeUrl(text);
  if (url) return { kind: "url", text, url };
  const lineCount = text.split(/\r?\n/).filter(Boolean).length;
  const markdownSignals = /^#{1,6}\s|\n[-*]\s|\n\d+\.\s|```|\[[^\]]+\]\([^)]+\)/m.test(text);
  if (markdownSignals || text.length > 240 || lineCount > 2) return { kind: "rich-text", text, markdown: text };
  return { kind: "short-text", text, markdown: `## ${text}` };
}

export function classifyFileInput(file) {
  const name = file?.name || "";
  const type = file?.type || "";
  if (/\.(json|zip|modulop\.zip|modulop-fragment\.zip)$/i.test(name)) return { kind: "portable-file", file };
  if (type.startsWith("image/")) return { kind: "image", file };
  if (type.startsWith("text/") || /\.(md|markdown|txt)$/i.test(name)) return { kind: "text-file", file };
  return { kind: "unsupported-file", file };
}

export function createModuleFromTextClassification(classification, createModule) {
  if (classification.kind === "embed") {
    const module = createModule("embed");
    module.title = classification.embed.provider === "generic" ? "Intégration" : `Embed ${classification.embed.provider}`;
    module.data = {
      ...module.data,
      input: classification.text,
      src: classification.embed.src,
      provider: classification.embed.provider,
      title: module.title
    };
    return module;
  }
  if (classification.kind === "url") {
    const module = createModule("link-card");
    module.title = classification.url.hostname;
    module.data = {
      ...module.data,
      url: classification.url.href,
      title: classification.url.hostname.replace(/^www\./, ""),
      description: "Lien ajouté localement. Les métadonnées distantes restent optionnelles."
    };
    return module;
  }
  if (classification.kind === "rich-text" || classification.kind === "short-text") {
    const module = createModule("rich-text");
    module.title = classification.kind === "short-text" ? "Note rapide" : "Texte collé";
    module.data = {
      eyebrow: classification.kind === "short-text" ? "Note" : "Texte importé",
      markdown: classification.markdown,
      scale: classification.kind === "short-text" ? "compact" : "hero"
    };
    return module;
  }
  return null;
}

export function createMediaModule({ asset, name, type }, createModule) {
  const module = createModule("media");
  module.title = name || "Image locale";
  module.data = {
    src: asset,
    title: name || "Image locale",
    caption: type || "Média conservé localement",
    alt: name || "Image locale",
    kind: type?.startsWith("image/") ? "image" : "file"
  };
  return module;
}

function safeUrl(text) {
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function looksLikePortableJson(text) {
  if (!text.startsWith("{")) return false;
  try {
    const value = JSON.parse(text);
    return value?.schemaVersion === 1 && Array.isArray(value.modules);
  } catch {
    return false;
  }
}
