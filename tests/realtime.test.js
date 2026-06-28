import { describe, expect, it } from "vitest";
import { createEnvelope, DEFAULT_ROOM, normalizeRoomId, validateEnvelope } from "../src/realtime/protocol.js";
import { generatedNickname, hashJson, signEnvelope, verifyEnvelope } from "../src/realtime/identity.js";

describe("couche realtime P2P", () => {
  it("normalise les rooms sans sortir du namespace textuel", () => {
    expect(normalizeRoomId("  atelier test / privé  ")).toBe("atelier-test-privé");
    expect(normalizeRoomId("")).toBe(DEFAULT_ROOM);
  });

  it("signe et vérifie une enveloppe de protocole", async () => {
    const keyPair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const identity = {
      peerId: await hashJson(publicKey),
      publicKey,
      privateKey,
      nickname: generatedNickname("abcdef123456")
    };
    const envelope = createEnvelope({
      type: "chat.message",
      from: identity.peerId,
      room: DEFAULT_ROOM,
      publicKey,
      seq: 1,
      payload: { text: "Bonjour P2P" }
    });

    const signed = await signEnvelope(identity, envelope);

    expect(validateEnvelope(signed, DEFAULT_ROOM)).toBe(true);
    expect(await verifyEnvelope(signed)).toBe(true);
    expect(await verifyEnvelope({ ...signed, payload: { text: "Altéré" } })).toBe(false);
  });

  it("rejette les messages hors room ou trop longs après sanitisation", () => {
    const envelope = createEnvelope({
      type: "chat.message",
      from: "a".repeat(24),
      room: DEFAULT_ROOM,
      publicKey: {},
      seq: 2,
      payload: { text: "x".repeat(1200) }
    });

    expect(envelope.payload.text).toHaveLength(800);
    expect(validateEnvelope(envelope, "modulop:v1:autre")).toBe(false);
  });

  it("borne les échanges contextuels de fragments", () => {
    const comment = createEnvelope({
      type: "comment.add",
      from: "b".repeat(24),
      room: DEFAULT_ROOM,
      publicKey: {},
      seq: 3,
      payload: { id: "c1", moduleId: "m1", text: "x".repeat(1200), parentId: "" }
    });
    const reaction = createEnvelope({
      type: "reaction.toggle",
      from: "c".repeat(24),
      room: DEFAULT_ROOM,
      publicKey: {},
      seq: 4,
      payload: { moduleId: "m1", targetId: "c1", emoji: "👍👍👍👍👍👍👍👍👍", annotation: "Validation".repeat(20) }
    });

    expect(comment.payload).toMatchObject({ id: "c1", moduleId: "m1", parentId: null });
    expect(comment.payload.text).toHaveLength(800);
    expect(reaction.payload.emoji.length).toBeLessThanOrEqual(16);
    expect(reaction.payload.annotation.length).toBeLessThanOrEqual(80);
  });
});
