import { describe, expect, it } from "vitest";
import { createEnvelope, createPrivateRoom, DEFAULT_ROOM, normalizeRoomId, validateEnvelope } from "../src/realtime/protocol.js";
import { generatedNickname, hashJson, signEnvelope, verifyEnvelope } from "../src/realtime/identity.js";
import { realtimePanelBody } from "../src/realtime/controller.js";
import { decryptRoomBytes, decryptRoomPayload, encryptRoomBytes, encryptRoomPayload, privateRoomInviteUrl } from "../src/realtime/room-crypto.js";

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

  it("expose constellation, carte publique et ping dans le panneau Live", () => {
    const html = realtimePanelBody({
      identity: { peerId: "a".repeat(24) },
      roomId: DEFAULT_ROOM,
      enabled: true,
      status: "p2p",
      presence: [
        { peerId: "a".repeat(24), displayName: "Moi Local", roomId: DEFAULT_ROOM, moduleCount: 1, lastSeen: Date.now() },
        { peerId: "b".repeat(24), displayName: "Pair Atelier", roomId: DEFAULT_ROOM, moduleCount: 3, lastSeen: Date.now() }
      ],
      messages: [],
      comments: [],
      reactions: [],
      activity: [],
      offers: [{ offerId: "o1", title: "Fragment proposé", size: 1024 }],
      receivedFragments: [{ offerId: "r1", title: "Fragment reçu" }],
      blockedPeers: []
    }, [{ id: "m1", title: "Fragment public", type: "rich-text" }]);

    expect(html).toContain("live-peer-graph");
    expect(html).toContain("data-action=\"live-ping\"");
    expect(html).toContain("live-peer-card");
    expect(html).toContain("data-action=\"live-decline-offer\"");
    expect(html).toContain("data-action=\"live-discard-received\"");
    expect(html).toContain("Pair Atelier");
  });

  it("génère une invitation privée avec clé hors room et chiffre les payloads", async () => {
    const room = createPrivateRoom();
    const invite = privateRoomInviteUrl(room.roomId, room.secret, "https://example.test/modulop/");
    const payload = { text: "secret atelier" };
    const encrypted = await encryptRoomPayload(payload, room.secret);

    expect(room.roomId).toMatch(/^modulop:v1:/);
    expect(room.secret).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(invite).toContain(`#room=${encodeURIComponent(room.roomId)}&key=`);
    expect(encrypted).toMatchObject({ encrypted: true, alg: "A256GCM" });
    expect(await decryptRoomPayload(encrypted, room.secret)).toEqual(payload);
    expect(await decryptRoomPayload(encrypted, createPrivateRoom().secret)).toBeNull();
  });

  it("chiffre les fragments binaires partagés en room privée", async () => {
    const room = createPrivateRoom();
    const bytes = new TextEncoder().encode("fragment zip simulé").buffer;
    const encrypted = await encryptRoomBytes(bytes, room.secret);
    const decrypted = await decryptRoomBytes(encrypted.bytes, encrypted.metadata, room.secret);

    expect(encrypted.metadata.encrypted).toBe(true);
    expect(new TextDecoder().decode(decrypted)).toBe("fragment zip simulé");
    expect(await decryptRoomBytes(encrypted.bytes, encrypted.metadata, createPrivateRoom().secret)).toBeNull();
  });

  it("borne le refus signé d’une offre de fragment", () => {
    const cancel = createEnvelope({
      type: "fragment.cancel",
      from: "d".repeat(24),
      room: DEFAULT_ROOM,
      publicKey: {},
      seq: 5,
      payload: { offerId: "offre".repeat(40) }
    });

    expect(cancel.payload.offerId).toHaveLength(80);
    expect(validateEnvelope(cancel, DEFAULT_ROOM)).toBe(true);
  });
});
