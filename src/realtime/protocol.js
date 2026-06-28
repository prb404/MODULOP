export const REALTIME_VERSION = 1;
export const DEFAULT_ROOM = "modulop:v1:lobby";
export const MESSAGE_TYPES = new Set([
  "presence.hello",
  "presence.heartbeat",
  "presence.goodbye",
  "profile.announce",
  "chat.message",
  "ping.send",
  "comment.add",
  "reaction.toggle",
  "fragment.offer",
  "fragment.request",
  "fragment.cancel"
]);

const MAX_TEXT = 800;
const MAX_TITLE = 120;

export function createEnvelope({ type, from, room, publicKey, seq, payload = {}, target = null }) {
  if (!MESSAGE_TYPES.has(type)) throw new Error(`Type realtime invalide: ${type}`);
  return {
    v: REALTIME_VERSION,
    type,
    from,
    room,
    target,
    ts: Date.now(),
    seq,
    publicKey,
    payload: sanitizePayload(type, payload)
  };
}

export function validateEnvelope(envelope, roomId) {
  if (!envelope || envelope.v !== REALTIME_VERSION) return false;
  if (!MESSAGE_TYPES.has(envelope.type)) return false;
  if (envelope.room !== roomId) return false;
  if (!/^[a-f0-9]{24}$/.test(envelope.from || "")) return false;
  if (!Number.isFinite(envelope.ts) || Math.abs(Date.now() - envelope.ts) > 1000 * 60 * 20) return false;
  if (!Number.isSafeInteger(envelope.seq) || envelope.seq < 0) return false;
  return true;
}

export function sanitizePayload(type, payload = {}) {
  if (type.startsWith("presence.") || type === "profile.announce") return sanitizeCard(payload);
  if (type === "chat.message") return { text: limit(payload.text, MAX_TEXT) };
  if (type === "ping.send") return { text: limit(payload.text || "Ping", 80) };
  if (type === "comment.add") {
    return {
      id: limit(payload.id, 80),
      moduleId: limit(payload.moduleId, 80),
      text: limit(payload.text, MAX_TEXT),
      parentId: payload.parentId ? limit(payload.parentId, 80) : null
    };
  }
  if (type === "reaction.toggle") {
    return {
      targetId: limit(payload.targetId, 80),
      moduleId: limit(payload.moduleId, 80),
      emoji: limit(payload.emoji, 16),
      annotation: limit(payload.annotation, 80)
    };
  }
  if (type === "fragment.offer") {
    return {
      offerId: limit(payload.offerId, 80),
      moduleId: limit(payload.moduleId, 80),
      title: limit(payload.title, MAX_TITLE),
      moduleType: limit(payload.moduleType, 60),
      size: clampInteger(payload.size, 0, 8 * 1024 * 1024)
    };
  }
  if (type === "fragment.request" || type === "fragment.cancel") return { offerId: limit(payload.offerId, 80) };
  return {};
}

export function sanitizeCard(payload = {}) {
  return {
    peerId: limit(payload.peerId, 48),
    nickname: limit(payload.nickname, 80),
    displayName: limit(payload.displayName, 120),
    avatar: sanitizeAvatar(payload.avatar),
    roomId: limit(payload.roomId, 120),
    moduleCount: clampInteger(payload.moduleCount, 0, 10000),
    selectedModuleId: payload.selectedModuleId ? limit(payload.selectedModuleId, 80) : null,
    publicFragments: Array.isArray(payload.publicFragments)
      ? payload.publicFragments.slice(0, 12).map((item) => ({
          id: limit(item?.id, 80),
          type: limit(item?.type, 60),
          title: limit(item?.title, MAX_TITLE)
        }))
      : []
  };
}

export function normalizeRoomId(value) {
  const raw = String(value || DEFAULT_ROOM).trim();
  return raw.replace(/[^\p{Letter}\p{Number}:._-]+/gu, "-").slice(0, 96) || DEFAULT_ROOM;
}

export function createPrivateRoom() {
  return `modulop:v1:${crypto.randomUUID().slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`;
}

function sanitizeAvatar(avatar) {
  if (!avatar || typeof avatar !== "object") return null;
  const copy = { ...avatar };
  for (const [key, value] of Object.entries(copy)) {
    if (typeof value === "string") copy[key] = limit(value, 400);
    else if (typeof value !== "number" && typeof value !== "boolean") delete copy[key];
  }
  return copy;
}

function limit(value, max) {
  return String(value || "").trim().slice(0, max);
}

function clampInteger(value, min, max) {
  const number = Math.trunc(Number(value) || 0);
  return Math.max(min, Math.min(max, number));
}
