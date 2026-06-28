import { db } from "../core/store.js";

const IDENTITY_KEY = "realtime.identity.v1";
const WORDS_LEFT = ["Aube", "Brume", "Cobalt", "Delta", "Echo", "Horizon", "Iris", "Lumen", "Nacre", "Onde", "Pixel", "Quartz"];
const WORDS_RIGHT = ["Atelier", "Boussole", "Constellation", "Fragment", "Module", "Signal", "Studio", "Trace", "Vecteur", "Voisin"];

export async function getRealtimeIdentity() {
  const saved = await db.preferences.get(IDENTITY_KEY);
  if (saved?.value?.privateKey && saved?.value?.publicKey && saved?.value?.peerId) return saved.value;
  const keyPair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const peerId = await hashJson(publicKey);
  const identity = {
    peerId,
    publicKey,
    privateKey,
    nickname: generatedNickname(peerId),
    createdAt: new Date().toISOString()
  };
  await db.preferences.put({ key: IDENTITY_KEY, value: identity });
  return identity;
}

export async function signEnvelope(identity, envelope) {
  const key = await crypto.subtle.importKey("jwk", identity.privateKey, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const unsigned = { ...envelope };
  delete unsigned.sig;
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encode(canonicalJson(unsigned)));
  return { ...unsigned, sig: arrayBufferToBase64(signature) };
}

export async function verifyEnvelope(envelope) {
  if (!envelope?.publicKey || !envelope?.sig) return false;
  const expectedPeerId = await hashJson(envelope.publicKey);
  if (expectedPeerId !== envelope.from) return false;
  const key = await crypto.subtle.importKey("jwk", envelope.publicKey, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const unsigned = { ...envelope };
  const signature = base64ToArrayBuffer(unsigned.sig);
  delete unsigned.sig;
  return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, signature, encode(canonicalJson(unsigned)));
}

export function publicCardFromProfile(profile, identity, roomId) {
  const modules = Array.isArray(profile?.modules) ? profile.modules : [];
  return {
    peerId: identity.peerId,
    nickname: identity.nickname,
    displayName: profile?.identity?.name || identity.nickname,
    avatar: profile?.identity?.avatar || null,
    roomId,
    moduleCount: modules.length,
    publicFragments: modules.slice(0, 8).map((module) => ({
      id: module.id,
      type: module.type,
      title: module.title
    }))
  };
}

export async function hashJson(value) {
  const digest = await crypto.subtle.digest("SHA-256", encode(canonicalJson(value)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

export function generatedNickname(seed) {
  const left = WORDS_LEFT[parseInt(seed.slice(0, 2), 16) % WORDS_LEFT.length];
  const right = WORDS_RIGHT[parseInt(seed.slice(2, 4), 16) % WORDS_RIGHT.length];
  return `${left}-${right}-${seed.slice(4, 8)}`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function encode(value) {
  const bytes = new TextEncoder().encode(value);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function arrayBufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToArrayBuffer(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
