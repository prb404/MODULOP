const KEY_BYTES = 32;
const IV_BYTES = 12;

export function randomRoomSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(KEY_BYTES));
  return base64UrlEncode(bytes);
}

export function roomSecretFromHash(hash = location.hash) {
  const params = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  const secret = params.get("key") || params.get("roomKey") || "";
  return normalizeRoomSecret(secret);
}

export function roomFromHash(hash = location.hash) {
  const params = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  return params.get("room") || "";
}

export function privateRoomInviteUrl(roomId, secret, base = location.href) {
  const url = new URL(base);
  const params = new URLSearchParams(url.hash.replace(/^#/, ""));
  params.set("room", roomId);
  params.set("key", normalizeRoomSecret(secret));
  url.hash = params.toString();
  return url.toString();
}

export function normalizeRoomSecret(value = "") {
  return String(value || "").trim().replace(/[^A-Za-z0-9_-]/g, "").slice(0, 96);
}

export async function encryptRoomPayload(payload, secret) {
  const normalized = normalizeRoomSecret(secret);
  if (!normalized) return payload;
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(JSON.stringify(payload ?? {}));
  const key = await importRoomKey(normalized);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    encrypted: true,
    alg: "A256GCM",
    iv: base64UrlEncode(iv),
    data: base64UrlEncode(new Uint8Array(cipher))
  };
}

export async function decryptRoomPayload(payload, secret) {
  if (!payload?.encrypted) return payload;
  const normalized = normalizeRoomSecret(secret);
  if (!normalized) return null;
  try {
    const key = await importRoomKey(normalized);
    const iv = base64UrlDecode(payload.iv);
    const cipher = base64UrlDecode(payload.data);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return null;
  }
}

export async function encryptRoomBytes(bytes, secret) {
  const normalized = normalizeRoomSecret(secret);
  if (!normalized) return { bytes, metadata: {} };
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await importRoomKey(normalized);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes);
  return {
    bytes: cipher,
    metadata: { encrypted: true, alg: "A256GCM", iv: base64UrlEncode(iv) }
  };
}

export async function decryptRoomBytes(bytes, metadata = {}, secret) {
  if (!metadata.encrypted) return bytes;
  const normalized = normalizeRoomSecret(secret);
  if (!normalized) return null;
  try {
    const key = await importRoomKey(normalized);
    return await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64UrlDecode(metadata.iv) }, key, bytes);
  } catch {
    return null;
  }
}

async function importRoomKey(secret) {
  const material = base64UrlDecode(secret);
  const digest = material.length === KEY_BYTES ? material : new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export function base64UrlEncode(bytes) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function base64UrlDecode(value) {
  const padded = String(value || "").replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(String(value || "").length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
