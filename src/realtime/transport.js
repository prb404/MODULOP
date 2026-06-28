import { joinRoom, selfId } from "trystero";
import { createEnvelope, sanitizePayload, validateEnvelope } from "./protocol.js";
import { signEnvelope, verifyEnvelope } from "./identity.js";
import { decryptRoomBytes, decryptRoomPayload, encryptRoomBytes, encryptRoomPayload } from "./room-crypto.js";

const APP_ID = "modulop-p2p-v1";
const HEARTBEAT_MS = 15000;
const SEND_TIMEOUT_MS = 2500;

export class LocalRealtimeProvider extends EventTarget {
  constructor({ identity, roomId, roomSecret = "", getCard }) {
    super();
    this.identity = identity;
    this.roomId = roomId;
    this.roomSecret = roomSecret;
    this.getCard = getCard;
    this.seq = 0;
    this.status = "local";
    this.peers = new Map();
  }

  async connect() {
    this.status = "local";
    this.publishPresence();
    this.dispatchStatus();
  }

  async disconnect() {
    this.peers.clear();
    this.publishPresence();
    this.dispatchStatus("disconnected");
  }

  async updatePresence(extra = {}) {
    this.localCard = { ...this.getCard(), ...extra, lastSeen: Date.now(), transportPeerId: "local" };
    this.publishPresence();
  }

  async sendChat(text) {
    this.dispatchEvent(new CustomEvent("message", { detail: { kind: "chat", local: true, text, createdAt: Date.now(), from: this.identity.peerId } }));
  }

  async sendPing(text = "Ping") {
    this.dispatchEvent(new CustomEvent("message", { detail: { kind: "ping", local: true, text, createdAt: Date.now(), from: this.identity.peerId } }));
  }

  async addComment(comment) {
    this.dispatchEvent(new CustomEvent("comment", { detail: { ...comment, local: true, from: this.identity.peerId, createdAt: Date.now() } }));
  }

  async toggleReaction(reaction) {
    this.dispatchEvent(new CustomEvent("reaction", { detail: { ...reaction, local: true, from: this.identity.peerId, createdAt: Date.now() } }));
  }

  async offerFragment() {}
  async acceptOffer() {}
  async declineOffer() {}

  publishPresence() {
    const self = this.localCard || { ...this.getCard(), lastSeen: Date.now(), transportPeerId: "local" };
    this.dispatchEvent(new CustomEvent("presence", { detail: [self, ...this.peers.values()] }));
  }

  dispatchStatus(status = this.status) {
    this.dispatchEvent(new CustomEvent("status", { detail: { status, roomId: this.roomId, transportId: "local" } }));
  }
}

export class TrysteroRealtimeProvider extends LocalRealtimeProvider {
  async connect() {
    this.status = "connecting";
    this.dispatchStatus();
    try {
      this.room = joinRoom({ appId: APP_ID }, this.roomId, {
        onJoinError: (details) => this.dispatchEvent(new CustomEvent("error", { detail: details }))
      });
      this.action = this.room.makeAction("modulop-message");
      this.fileAction = this.room.makeAction("modulop-fragment");
      this.action.onMessage = (data, meta) => this.receiveEnvelope(data, meta?.peerId);
      this.fileAction.onMessage = (data, meta) => this.receiveFragment(data, meta);
      this.room.onPeerJoin = (peerId) => {
        this.sendEnvelope("presence.hello", this.getCard(), { target: peerId });
        this.sendEnvelope("profile.announce", this.getCard(), { target: peerId });
      };
      this.room.onPeerLeave = (peerId) => {
        for (const [id, peer] of this.peers) {
          if (peer.transportPeerId === peerId) this.peers.delete(id);
        }
        this.publishPresence();
      };
      this.status = "p2p";
      await super.updatePresence();
      this.dispatchStatus();
      this.sendEnvelope("profile.announce", this.getCard()).catch(() => {});
      this.sendEnvelope("presence.hello", this.getCard()).catch(() => {});
      this.heartbeatTimer = setInterval(() => this.sendEnvelope("presence.heartbeat", this.getCard()).catch(() => {}), HEARTBEAT_MS);
    } catch (error) {
      this.status = "local";
      this.dispatchEvent(new CustomEvent("error", { detail: error }));
      this.dispatchStatus();
      this.publishPresence();
    }
  }

  async disconnect() {
    clearInterval(this.heartbeatTimer);
    try {
      await this.sendEnvelope("presence.goodbye", this.getCard());
    } catch {}
    this.room?.leave?.();
    this.room = null;
    this.peers.clear();
    this.status = "local";
    this.publishPresence();
    this.dispatchStatus("disconnected");
  }

  async updatePresence(extra = {}) {
    await super.updatePresence(extra);
    if (this.room) await this.sendEnvelope("profile.announce", { ...this.getCard(), ...extra });
  }

  async sendChat(text) {
    await super.sendChat(text);
    await this.sendEnvelope("chat.message", { text });
  }

  async sendPing(text = "Ping") {
    await super.sendPing(text);
    await this.sendEnvelope("ping.send", { text });
  }

  async addComment(comment) {
    await super.addComment(comment);
    await this.sendEnvelope("comment.add", comment);
  }

  async toggleReaction(reaction) {
    await super.toggleReaction(reaction);
    await this.sendEnvelope("reaction.toggle", reaction);
  }

  async offerFragment({ offer, bytes }) {
    this.pendingFiles ||= new Map();
    this.pendingFiles.set(offer.offerId, { offer, bytes });
    await this.sendEnvelope("fragment.offer", offer);
  }

  async acceptOffer(offer, targetPeerId) {
    await this.sendEnvelope("fragment.request", { offerId: offer.offerId }, { target: targetPeerId });
  }

  async declineOffer(offer, targetPeerId) {
    await this.sendEnvelope("fragment.cancel", { offerId: offer.offerId }, { target: targetPeerId });
  }

  async sendEnvelope(type, payload, options = {}) {
    if (!this.action) return null;
    const envelope = createEnvelope({
      type,
      from: this.identity.peerId,
      room: this.roomId,
      publicKey: this.identity.publicKey,
      seq: this.seq++,
      payload,
      target: options.target || null
    });
    if (this.roomSecret) envelope.payload = await encryptRoomPayload(envelope.payload, this.roomSecret);
    const signed = await signEnvelope(this.identity, envelope);
    await bestEffortSend(this.action.send(signed, options.target ? { target: options.target } : undefined));
    return signed;
  }

  async receiveEnvelope(envelope, transportPeerId) {
    if (!validateEnvelope(envelope, this.roomId) || envelope.from === this.identity.peerId) return;
    if (envelope.target && envelope.target !== selfId) return;
    if (!await verifyEnvelope(envelope)) return;
    const payload = await decryptRoomPayload(envelope.payload, this.roomSecret);
    if (!payload) return;
    envelope = { ...envelope, payload: sanitizePayload(envelope.type, payload) };
    if (["presence.hello", "presence.heartbeat", "profile.announce"].includes(envelope.type)) {
      this.peers.set(envelope.from, { ...envelope.payload, peerId: envelope.from, transportPeerId, lastSeen: Date.now() });
      this.publishPresence();
      if (envelope.type === "presence.hello") this.sendEnvelope("profile.announce", this.getCard(), { target: transportPeerId });
      return;
    }
    if (envelope.type === "presence.goodbye") {
      this.peers.delete(envelope.from);
      this.publishPresence();
      return;
    }
    if (envelope.type === "chat.message" || envelope.type === "ping.send") {
      this.dispatchEvent(new CustomEvent("message", { detail: { kind: envelope.type === "chat.message" ? "chat" : "ping", text: envelope.payload.text, createdAt: envelope.ts, from: envelope.from } }));
      return;
    }
    if (envelope.type === "comment.add") {
      this.dispatchEvent(new CustomEvent("comment", { detail: { ...envelope.payload, from: envelope.from, createdAt: envelope.ts } }));
      return;
    }
    if (envelope.type === "reaction.toggle") {
      this.dispatchEvent(new CustomEvent("reaction", { detail: { ...envelope.payload, from: envelope.from, createdAt: envelope.ts } }));
      return;
    }
    if (envelope.type === "fragment.offer") {
      this.dispatchEvent(new CustomEvent("offer", { detail: { ...envelope.payload, from: envelope.from, transportPeerId, createdAt: envelope.ts } }));
      return;
    }
    if (envelope.type === "fragment.request") {
      const file = this.pendingFiles?.get(envelope.payload.offerId);
      if (file) {
        const encrypted = await encryptRoomBytes(file.bytes, this.roomSecret);
        await bestEffortSend(this.fileAction.send(encrypted.bytes, { target: transportPeerId, metadata: { ...file.offer, ...encrypted.metadata, from: this.identity.peerId } }));
      }
    }
    if (envelope.type === "fragment.cancel") {
      this.pendingFiles?.delete(envelope.payload.offerId);
      this.dispatchEvent(new CustomEvent("cancel", { detail: { ...envelope.payload, from: envelope.from, createdAt: envelope.ts } }));
    }
  }

  async receiveFragment(data, meta = {}) {
    const metadata = meta.metadata || {};
    const bytes = await decryptRoomBytes(data, metadata, this.roomSecret);
    if (!bytes) return;
    this.dispatchEvent(new CustomEvent("fragment", {
      detail: {
        offerId: metadata.offerId,
        title: metadata.title,
        moduleType: metadata.moduleType,
        from: metadata.from || meta.peerId,
        bytes,
        createdAt: Date.now()
      }
    }));
  }
}

async function bestEffortSend(sendPromise) {
  try {
    await Promise.race([
      sendPromise,
      new Promise((resolve) => setTimeout(resolve, SEND_TIMEOUT_MS))
    ]);
  } catch {}
}
