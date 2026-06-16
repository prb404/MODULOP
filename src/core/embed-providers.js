const providers = [
  {
    id: "youtube",
    domains: ["youtube.com", "www.youtube.com", "youtu.be", "www.youtube-nocookie.com"],
    resolve(url) {
      const id = url.hostname.includes("youtu.be") ? url.pathname.slice(1) : url.searchParams.get("v") || url.pathname.split("/").pop();
      return id && `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
    }
  },
  {
    id: "vimeo",
    domains: ["vimeo.com", "www.vimeo.com", "player.vimeo.com"],
    resolve: (url) => {
      const id = url.pathname.split("/").filter(Boolean).pop();
      return id && `https://player.vimeo.com/video/${encodeURIComponent(id)}`;
    }
  },
  {
    id: "spotify",
    domains: ["open.spotify.com"],
    resolve: (url) => `https://open.spotify.com/embed${url.pathname}`
  },
  {
    id: "soundcloud",
    domains: ["soundcloud.com", "www.soundcloud.com"],
    resolve: (url) => `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.href)}`
  }
];

export function resolveEmbed(input) {
  const source = extractIframeSource(input) || String(input || "").trim();
  let url;
  try {
    url = new URL(source);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const provider = providers.find((item) => item.domains.includes(url.hostname.toLowerCase()));
  if (!provider) return { provider: "generic", src: url.href, domain: url.hostname.toLowerCase(), generic: true };
  const src = provider.resolve(url);
  return src ? { provider: provider.id, src, domain: new URL(src).hostname } : null;
}

export function extractIframeSource(input) {
  const text = String(input || "");
  if (!text.includes("<iframe")) return "";
  const document = new DOMParser().parseFromString(text, "text/html");
  return document.querySelector("iframe")?.getAttribute("src") || "";
}

export function listEmbedProviders() {
  return providers.map(({ id, domains }) => ({ id, domains: [...domains] }));
}
