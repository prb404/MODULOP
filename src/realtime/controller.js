import { importFragmentPackage, exportFragmentBlob } from "../core/portable.js";
import { visualPreview } from "../ui/visual-picker.js";
import { escapeHtml } from "../renderers/index.js";
import { icon } from "../ui/icons.js";
import { getRealtimeIdentity, publicCardFromProfile } from "./identity.js";
import { createPrivateRoom, DEFAULT_ROOM, normalizeRoomId } from "./protocol.js";
import { LocalRealtimeProvider, TrysteroRealtimeProvider } from "./transport.js";

const ROOM_KEY = "modulop.realtime.room";
const ENABLED_KEY = "modulop.realtime.enabled";
const BLOCKED_KEY = "modulop.realtime.blockedPeers";
const RATE_WINDOW_MS = 60_000;
const INBOUND_LIMIT = 45;
const OUTBOUND_LIMIT = 24;

export class RealtimeController extends EventTarget {
  constructor({ getProfile, importModule, announce }) {
    super();
    this.getProfile = getProfile;
    this.importModule = importModule;
    this.announce = announce;
    this.roomId = normalizeRoomId(localStorage.getItem(ROOM_KEY) || DEFAULT_ROOM);
    this.enabled = localStorage.getItem(ENABLED_KEY) === "true";
    this.status = "local";
    this.presence = [];
    this.messages = [];
    this.comments = [];
    this.reactions = [];
    this.activity = [];
    this.offers = [];
    this.receivedFragments = [];
    this.blockedPeers = new Set(loadJson(BLOCKED_KEY, []));
    this.rateBuckets = new Map();
    this.selectedModuleId = null;
  }

  async init() {
    this.identity = await getRealtimeIdentity();
    if (this.enabled) await this.connect();
    else await this.useLocalProvider();
  }

  async connect(roomId = this.roomId) {
    this.roomId = normalizeRoomId(roomId);
    localStorage.setItem(ROOM_KEY, this.roomId);
    localStorage.setItem(ENABLED_KEY, "true");
    this.enabled = true;
    await this.provider?.disconnect?.();
    this.provider = new TrysteroRealtimeProvider({
      identity: this.identity,
      roomId: this.roomId,
      getCard: () => publicCardFromProfile(this.getProfile(), this.identity, this.roomId)
    });
    this.bindProvider();
    await this.provider.connect();
    this.emitChange();
  }

  async disconnect() {
    localStorage.setItem(ENABLED_KEY, "false");
    this.enabled = false;
    await this.useLocalProvider();
  }

  async useLocalProvider() {
    await this.provider?.disconnect?.();
    this.provider = new LocalRealtimeProvider({
      identity: this.identity,
      roomId: this.roomId,
      getCard: () => publicCardFromProfile(this.getProfile(), this.identity, this.roomId)
    });
    this.bindProvider();
    await this.provider.connect();
    this.emitChange();
  }

  bindProvider() {
    this.provider.addEventListener("status", (event) => {
      this.status = event.detail.status;
      this.emitChange();
    });
    this.provider.addEventListener("presence", (event) => {
      this.presence = event.detail.filter((peer) => !this.isBlocked(peer.peerId));
      this.emitChange();
    });
    this.provider.addEventListener("message", (event) => {
      if (!this.acceptEvent("message", event.detail)) return;
      this.messages = [event.detail, ...this.messages].slice(0, 80);
      this.recordActivity(event.detail.kind === "ping" ? "ping" : "message", event.detail);
      this.emitChange();
    });
    this.provider.addEventListener("comment", (event) => {
      if (!this.acceptEvent("comment", event.detail)) return;
      if (!this.comments.some((comment) => comment.id === event.detail.id)) {
        this.comments = [event.detail, ...this.comments].slice(0, 160);
        this.recordActivity("comment", event.detail);
      }
      this.emitChange();
    });
    this.provider.addEventListener("reaction", (event) => {
      if (!this.acceptEvent("reaction", event.detail)) return;
      this.applyReaction(event.detail);
      this.recordActivity("reaction", event.detail);
      this.emitChange();
    });
    this.provider.addEventListener("offer", (event) => {
      if (!this.acceptEvent("offer", event.detail)) return;
      if (!this.offers.some((offer) => offer.offerId === event.detail.offerId)) this.offers = [event.detail, ...this.offers].slice(0, 40);
      this.recordActivity("fragment.offer", event.detail);
      this.emitChange();
    });
    this.provider.addEventListener("fragment", (event) => {
      if (!this.acceptEvent("fragment", event.detail)) return;
      this.receivedFragments = [event.detail, ...this.receivedFragments].slice(0, 20);
      this.recordActivity("fragment.receive", event.detail);
      this.announce?.(`Fragment reçu : ${event.detail.title}`);
      this.emitChange();
    });
    this.provider.addEventListener("error", () => {
      this.announce?.("Coprésence P2P indisponible, mode local conservé");
    });
  }

  async syncProfile() {
    await this.provider?.updatePresence?.();
  }

  async sendChat(text) {
    const value = text?.trim();
    if (!value) return;
    if (!this.allowOutbound("message")) return;
    await this.provider?.sendChat(value);
    this.emitChange();
  }

  async sendPing(text) {
    if (!this.allowOutbound("ping")) return;
    await this.provider?.sendPing(text?.trim() || "Ping");
  }

  async addComment(moduleId, text, parentId = null) {
    const value = text?.trim();
    if (!moduleId || !value) return;
    if (!this.allowOutbound("comment")) return;
    await this.provider?.addComment({ id: crypto.randomUUID(), moduleId, text: value, parentId });
  }

  async toggleReaction({ moduleId, targetId, emoji, annotation }) {
    if (!moduleId || !targetId || !emoji) return;
    if (!this.allowOutbound("reaction")) return;
    await this.provider?.toggleReaction({ moduleId, targetId, emoji, annotation: annotation || emoji });
  }

  async setSelectedModule(selectedModuleId = null) {
    this.selectedModuleId = selectedModuleId;
    await this.provider?.updatePresence?.({ selectedModuleId });
  }

  async offerModule(module) {
    if (!module || this.status !== "p2p") {
      this.announce?.("Activez la coprésence P2P pour proposer un fragment");
      return;
    }
    if (!this.allowOutbound("offer")) return;
    const blob = await exportFragmentBlob(module);
    const offer = {
      offerId: crypto.randomUUID(),
      moduleId: module.id,
      title: module.title,
      moduleType: module.type,
      size: blob.size
    };
    await this.provider.offerFragment({ offer, bytes: await blob.arrayBuffer() });
    this.announce?.("Offre de fragment diffusée");
  }

  async acceptOffer(offerId) {
    const offer = this.offers.find((item) => item.offerId === offerId);
    if (!offer) return;
    await this.provider?.acceptOffer(offer, offer.transportPeerId);
    this.announce?.("Demande de fragment envoyée");
  }

  async importReceived(offerId) {
    const fragment = this.receivedFragments.find((item) => item.offerId === offerId);
    if (!fragment) return;
    const file = new File([fragment.bytes], `${fragment.title || "fragment"}.modulop-fragment.zip`, { type: "application/zip" });
    const module = await importFragmentPackage(file);
    await this.importModule(module, `Fragment P2P importé : ${module.title}`);
    this.receivedFragments = this.receivedFragments.filter((item) => item.offerId !== offerId);
    this.emitChange();
  }

  setRoom(roomId) {
    this.roomId = normalizeRoomId(roomId);
    localStorage.setItem(ROOM_KEY, this.roomId);
    this.emitChange();
  }

  createPrivateRoom() {
    this.setRoom(createPrivateRoom());
  }

  blockPeer(peerId) {
    if (!peerId || peerId === this.identity?.peerId) return;
    this.blockedPeers.add(peerId);
    this.persistBlockedPeers();
    this.presence = this.presence.filter((peer) => peer.peerId !== peerId);
    this.messages = this.messages.filter((item) => item.from !== peerId);
    this.comments = this.comments.filter((item) => item.from !== peerId);
    this.reactions = this.reactions.filter((item) => item.from !== peerId);
    this.offers = this.offers.filter((item) => item.from !== peerId);
    this.activity = this.activity.filter((item) => item.actorId !== peerId);
    this.announce?.("Pair bloqué localement");
    this.emitChange();
  }

  unblockPeer(peerId) {
    this.blockedPeers.delete(peerId);
    this.persistBlockedPeers();
    this.announce?.("Pair débloqué localement");
    this.emitChange();
  }

  applyReaction(reaction) {
    const key = reactionKey(reaction);
    const existing = this.reactions.findIndex((item) => reactionKey(item) === key);
    if (existing >= 0) this.reactions.splice(existing, 1);
    else this.reactions = [reaction, ...this.reactions].slice(0, 240);
  }

  acceptEvent(kind, detail = {}) {
    if (this.isBlocked(detail.from)) return false;
    if (this.isRateLimited(`in:${detail.from || "unknown"}:${kind}`, INBOUND_LIMIT)) return false;
    return true;
  }

  allowOutbound(kind) {
    const allowed = !this.isRateLimited(`out:${kind}`, OUTBOUND_LIMIT);
    if (!allowed) this.announce?.("Rythme trop élevé, réessayez dans un instant");
    return allowed;
  }

  isRateLimited(key, limit) {
    const now = Date.now();
    const bucket = (this.rateBuckets.get(key) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
    bucket.push(now);
    this.rateBuckets.set(key, bucket);
    return bucket.length > limit;
  }

  isBlocked(peerId) {
    return Boolean(peerId && peerId !== this.identity?.peerId && this.blockedPeers.has(peerId));
  }

  persistBlockedPeers() {
    localStorage.setItem(BLOCKED_KEY, JSON.stringify([...this.blockedPeers]));
  }

  recordActivity(type, detail = {}) {
    const module = detail.moduleId ? this.getProfile()?.modules?.find((item) => item.id === detail.moduleId) : null;
    const peer = this.presence.find((item) => item.peerId === detail.from);
    const createdAt = detail.createdAt || Date.now();
    this.activity = [{
      id: `${createdAt}-${type}-${detail.id || detail.offerId || crypto.randomUUID()}`,
      type,
      actorId: detail.from || this.identity?.peerId || "local",
      actorName: peer?.displayName || peer?.nickname || (detail.local ? "Vous" : "Pair"),
      moduleId: detail.moduleId || null,
      moduleTitle: module?.title || detail.title || null,
      text: detail.text || detail.annotation || detail.title || "",
      createdAt
    }, ...this.activity].slice(0, 120);
  }

  emitChange() {
    this.dispatchEvent(new CustomEvent("change", { detail: this.snapshot() }));
  }

  snapshot() {
    return {
      identity: this.identity,
      roomId: this.roomId,
      enabled: this.enabled,
      status: this.status,
      presence: this.presence,
      messages: this.messages,
      comments: this.comments,
      reactions: this.reactions,
      activity: this.activity,
      offers: this.offers,
      receivedFragments: this.receivedFragments,
      blockedPeers: [...this.blockedPeers],
      selectedModuleId: this.selectedModuleId
    };
  }
}

export function realtimeBadge(state) {
  const online = state?.status === "p2p";
  const count = Math.max(1, state?.presence?.length || 1);
  return `<span class="live-dot ${online ? "is-online" : ""}"></span><strong>${online ? "Live P2P" : "Local"}</strong><small>${count} présent${count > 1 ? "s" : ""}</small>`;
}

export function realtimePanelBody(state, modules = []) {
  const online = state.status === "p2p";
  const peers = state.presence || [];
  return `<section class="live-panel">
    <section class="live-status-card">
      <div>${icon("Radar", 22)}<span><strong>${online ? "Coprésence P2P active" : "Coprésence locale"}</strong><small>${escapeHtml(state.roomId)}</small></span></div>
      <label class="switch-row switch-row--compact"><span>Live</span><input type="checkbox" data-live-enabled ${state.enabled ? "checked" : ""}></label>
    </section>
    <section class="live-room-tools">
      <label class="field"><span>Room</span><input data-live-room value="${escapeAttribute(state.roomId)}"></label>
      <div class="inline-actions">
        <button type="button" class="soft-button is-primary" data-action="live-join">${icon("Radar", 16)} Rejoindre</button>
        <button type="button" class="soft-button" data-action="live-private-room">${icon("Fingerprint", 16)} Privée</button>
      </div>
    </section>
    <section class="live-section"><h3>Présences</h3><div class="live-peer-list">${peers.map((peer) => renderPeer(peer, state)).join("") || `<p class="empty-spaces">Aucun pair détecté.</p>`}</div></section>
    <section class="live-section"><h3>Activité</h3><div class="live-activity-list">${(state.activity || []).map(renderActivity).join("") || `<p class="empty-spaces">Aucune activité distante.</p>`}</div></section>
    <section class="live-section"><h3>Messages</h3>
      <form class="live-chat-form" data-live-chat-form><input name="message" maxlength="800" placeholder="Message court ou ping"><button type="submit">${icon("ArrowRight", 16)}</button></form>
      <div class="live-feed">${state.messages.map(renderMessage).join("") || `<p class="empty-spaces">Aucun message.</p>`}</div>
    </section>
    <section class="live-section"><h3>Échanges par fragment</h3><div class="live-discussion-list">${modules.map((module) => renderDiscussion(module, state)).join("") || `<p class="empty-spaces">Aucun fragment dans cet espace.</p>`}</div></section>
    <section class="live-section"><h3>Partager un fragment</h3><div class="live-fragment-list">${modules.map(renderModuleOffer).join("") || `<p class="empty-spaces">Aucun fragment dans cet espace.</p>`}</div></section>
    <section class="live-section"><h3>Offres reçues</h3><div class="live-fragment-list">${state.offers.map(renderOffer).join("") || `<p class="empty-spaces">Aucune offre.</p>`}</div></section>
    <section class="live-section"><h3>Fragments reçus</h3><div class="live-fragment-list">${state.receivedFragments.map(renderReceived).join("") || `<p class="empty-spaces">Aucun fragment reçu.</p>`}</div></section>
    <section class="live-section"><h3>Pairs bloqués</h3><div class="live-fragment-list">${(state.blockedPeers || []).map(renderBlockedPeer).join("") || `<p class="empty-spaces">Aucun pair bloqué localement.</p>`}</div></section>
  </section>`;
}

function renderPeer(peer, state) {
  const self = peer.peerId === state?.identity?.peerId;
  return `<article class="live-peer"><span class="live-peer__avatar">${visualPreview(peer.avatar)}</span><span><strong>${escapeHtml(peer.displayName || peer.nickname || "Pair")}</strong><small>${peer.moduleCount || 0} fragment${peer.moduleCount > 1 ? "s" : ""}${peer.selectedModuleId ? " · actif sur un fragment" : ""}</small></span>${self ? "" : `<button type="button" data-action="live-block-peer" data-peer-id="${escapeAttribute(peer.peerId)}">${icon("ShieldOff", 15)}</button>`}</article>`;
}

function renderMessage(message) {
  return `<article class="live-message ${message.local ? "is-local" : ""}"><strong>${message.kind === "ping" ? "Ping" : "Message"}</strong><p>${escapeHtml(message.text)}</p><small>${new Date(message.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</small></article>`;
}

function renderActivity(item) {
  return `<article class="live-activity">
    <span>${activityIcon(item.type)}</span>
    <div><strong>${escapeHtml(activityLabel(item))}</strong><small>${escapeHtml(item.actorName)} · ${new Date(item.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</small></div>
  </article>`;
}

function activityIcon(type) {
  if (type === "comment") return icon("Activity", 15);
  if (type === "reaction") return icon("Smile", 15);
  if (type.startsWith("fragment")) return icon("PackageOpen", 15);
  if (type === "ping") return icon("Radar", 15);
  return icon("Activity", 15);
}

function activityLabel(item) {
  if (item.type === "comment") return `Commentaire sur ${item.moduleTitle || "un fragment"}`;
  if (item.type === "reaction") return `Réaction sur ${item.moduleTitle || "un échange"}`;
  if (item.type === "fragment.offer") return `Fragment proposé : ${item.moduleTitle || item.text || "fragment"}`;
  if (item.type === "fragment.receive") return `Fragment reçu : ${item.moduleTitle || item.text || "fragment"}`;
  if (item.type === "ping") return item.text || "Ping";
  return item.text || "Message";
}

function renderModuleOffer(module) {
  return `<button type="button" class="live-fragment-row" data-action="live-offer-fragment" data-id="${escapeAttribute(module.id)}"><span>${icon("PackageOpen", 16)}</span><strong>${escapeHtml(module.title)}</strong><small>${escapeHtml(module.type)}</small></button>`;
}

function renderDiscussion(module, state) {
  const comments = (state.comments || []).filter((comment) => comment.moduleId === module.id);
  const focused = state.selectedModuleId === module.id;
  return `<article class="live-discussion ${focused ? "is-focused" : ""}">
    <header><strong>${escapeHtml(module.title)}</strong><small>${comments.length} échange${comments.length > 1 ? "s" : ""}</small></header>
    <form class="live-comment-form" data-live-comment-form data-module-id="${escapeAttribute(module.id)}">
      <input name="comment" maxlength="800" placeholder="Commenter ce fragment">
      <button type="submit">${icon("ArrowRight", 15)}</button>
    </form>
    <div class="live-comment-list">${comments.map((comment) => renderComment(comment, state)).join("") || `<p class="empty-spaces">Aucun échange.</p>`}</div>
  </article>`;
}

function renderComment(comment, state) {
  const reactions = (state.reactions || []).filter((reaction) => reaction.targetId === comment.id);
  return `<article class="live-comment">
    <p>${escapeHtml(comment.text)}</p>
    <div class="live-comment__meta">
      <small>${new Date(comment.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</small>
      <button type="button" data-action="live-react" data-module-id="${escapeAttribute(comment.moduleId)}" data-target-id="${escapeAttribute(comment.id)}" data-emoji="👍" data-annotation="Valider">👍 ${reactionCount(reactions, "👍") || ""}</button>
      <button type="button" data-action="live-react" data-module-id="${escapeAttribute(comment.moduleId)}" data-target-id="${escapeAttribute(comment.id)}" data-emoji="💡" data-annotation="Idée">💡 ${reactionCount(reactions, "💡") || ""}</button>
      <button type="button" data-action="live-react" data-module-id="${escapeAttribute(comment.moduleId)}" data-target-id="${escapeAttribute(comment.id)}" data-emoji="❓" data-annotation="Question">❓ ${reactionCount(reactions, "❓") || ""}</button>
    </div>
  </article>`;
}

function reactionCount(reactions, emoji) {
  return reactions.filter((reaction) => reaction.emoji === emoji).length;
}

function renderOffer(offer) {
  return `<button type="button" class="live-fragment-row" data-action="live-accept-offer" data-offer-id="${escapeAttribute(offer.offerId)}"><span>${icon("PackageOpen", 16)}</span><strong>${escapeHtml(offer.title)}</strong><small>${Math.ceil((offer.size || 0) / 1024)} Ko proposés</small></button>`;
}

function renderReceived(fragment) {
  return `<button type="button" class="live-fragment-row is-ready" data-action="live-import-received" data-offer-id="${escapeAttribute(fragment.offerId)}"><span>${icon("FileUp", 16)}</span><strong>${escapeHtml(fragment.title)}</strong><small>Importer localement</small></button>`;
}

function renderBlockedPeer(peerId) {
  return `<button type="button" class="live-fragment-row" data-action="live-unblock-peer" data-peer-id="${escapeAttribute(peerId)}"><span>${icon("ShieldCheck", 16)}</span><strong>${escapeHtml(peerId)}</strong><small>Débloquer ce pair</small></button>`;
}

function escapeAttribute(value = "") {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function reactionKey(reaction) {
  return `${reaction.from}:${reaction.targetId}:${reaction.emoji}`;
}

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
