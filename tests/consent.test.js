import { describe, expect, it, vi } from "vitest";
import { ConsentService } from "../src/core/remote-resources.js";

describe("consentements distants", () => {
  it("sépare les autorisations par domaine et type de ressource", () => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() };
    const service = new ConsentService(storage);

    service.allow("https://avatars.example/person.svg", "avatar");

    expect(service.status("https://avatars.example/other.svg", "avatar")).toBe("allowed");
    expect(service.status("https://avatars.example/font.woff2", "font")).toBe("off");
    expect(storage.setItem).toHaveBeenCalled();
  });

  it("notifie et remplace une autorisation révoquée par le fallback", () => {
    const service = new ConsentService({ getItem: () => null, setItem: () => {} });
    const listener = vi.fn();
    service.subscribe(listener);
    service.allow("https://media.example/image.jpg", "image");
    service.revoke("https://media.example/image.jpg", "image");

    expect(service.status("https://media.example/image.jpg", "image")).toBe("off");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("expose les services connus même inactifs", () => {
    const service = new ConsentService({ getItem: () => null, setItem: () => {} });
    const catalog = service.catalog();

    expect(catalog.map((item) => item.id)).toContain("dicebear");
    expect(catalog.find((item) => item.id === "bunny-fonts")?.status).toBe("off");
  });

  it("persiste les actions globales d'activation et révocation", () => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() };
    const service = new ConsentService(storage);

    service.allowAll();
    expect(service.catalog().every((item) => item.status === "allowed")).toBe(true);

    service.revokeAll();
    expect(service.catalog().every((item) => item.status === "off")).toBe(true);
    expect(storage.setItem).toHaveBeenCalled();
  });
});
