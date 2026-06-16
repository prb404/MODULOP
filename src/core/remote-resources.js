const STORAGE_KEY = "modulop-v34-remote-consent";

export const knownRemoteServices = [
  { id: "dicebear", label: "DiceBear", url: "https://api.dicebear.com", type: "avatar", description: "Avatars générés à distance avec fallback local." },
  { id: "bunny-fonts", label: "Bunny Fonts", url: "https://fonts.bunny.net", type: "font", description: "Polices distantes facultatives." },
  { id: "youtube", label: "YouTube", url: "https://www.youtube.com", type: "embed", description: "Lecteurs vidéo intégrés." },
  { id: "youtube-nocookie", label: "YouTube nocookie", url: "https://www.youtube-nocookie.com", type: "embed", description: "Lecteurs YouTube en domaine privacy-enhanced." },
  { id: "vimeo", label: "Vimeo", url: "https://player.vimeo.com", type: "embed", description: "Lecteurs vidéo Vimeo." },
  { id: "spotify", label: "Spotify", url: "https://open.spotify.com", type: "embed", description: "Lecteurs audio et playlists intégrés." },
  { id: "soundcloud", label: "SoundCloud", url: "https://w.soundcloud.com", type: "embed", description: "Lecteurs audio SoundCloud." },
  { id: "remote-images", label: "Images distantes", url: "https://images.example", type: "image", description: "Images chargées depuis des URL externes." },
  { id: "metadata", label: "Métadonnées OpenGraph/oEmbed", url: "https://metadata.example", type: "metadata", description: "Enrichissement optionnel des liens." }
];

export class ConsentService extends EventTarget {
  constructor(storage = globalThis.localStorage) {
    super();
    this.storage = storage;
    this.consents = this.read();
  }

  domain(input) {
    try { return new URL(input).hostname.toLowerCase(); } catch { return ""; }
  }

  key(input, type = "generic") {
    const domain = this.domain(input);
    return domain ? `${type}:${domain}` : "";
  }

  status(input, type = "generic") {
    return this.consents[this.key(input, type)] || this.consents[`generic:${this.domain(input)}`] || "off";
  }

  allow(input, type = "generic") { return this.set(input, type, "allowed"); }
  refuse(input, type = "generic") { return this.set(input, type, "refused"); }
  revoke(input, type = "generic") { return this.set(input, type, "off"); }
  subscribe(listener) { this.addEventListener("change", listener); return () => this.removeEventListener("change", listener); }
  count() { return Object.values(this.consents).filter((status) => status === "allowed").length; }
  catalog() {
    const knownKeys = new Set(knownRemoteServices.map((service) => this.key(service.url, service.type)));
    const discovered = Object.keys(this.consents)
      .filter((key) => !knownKeys.has(key))
      .map((key) => {
        const [type, domain] = key.split(":");
        return { id: key, label: domain, url: `https://${domain}`, type, description: "Domaine rencontré dans ce navigateur." };
      });
    return [...knownRemoteServices, ...discovered].map((service) => ({
      ...service,
      key: this.key(service.url, service.type),
      domain: this.domain(service.url),
      status: this.status(service.url, service.type)
    }));
  }
  allowAll() { return this.setAll("allowed"); }
  revokeAll() { return this.setAll("off"); }
  clear() {
    this.consents = {};
    this.storage?.removeItem(STORAGE_KEY);
    this.dispatchEvent(new CustomEvent("change", { detail: { cleared: true } }));
  }

  set(input, type, status) {
    const key = this.key(input, type);
    if (!key) return false;
    this.consents[key] = status;
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.consents));
    this.dispatchEvent(new CustomEvent("change", { detail: { input, type, status, domain: this.domain(input) } }));
    return true;
  }

  setAll(status) {
    for (const service of this.catalog()) this.consents[service.key] = status;
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.consents));
    this.dispatchEvent(new CustomEvent("change", { detail: { all: true, status } }));
    return true;
  }

  read() {
    try { return JSON.parse(this.storage?.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  }
}

export const remoteResources = new ConsentService();
