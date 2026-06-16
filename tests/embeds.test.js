import { describe, expect, it } from "vitest";
import { extractIframeSource, resolveEmbed } from "../src/core/embed-providers.js";

describe("intégrations distantes", () => {
  it("convertit les fournisseurs directs vers des URL HTTPS maîtrisées", () => {
    expect(resolveEmbed("https://youtu.be/abc123")).toEqual(expect.objectContaining({
      provider: "youtube",
      src: "https://www.youtube-nocookie.com/embed/abc123"
    }));
    expect(resolveEmbed("https://vimeo.com/1234")).toEqual(expect.objectContaining({ provider: "vimeo" }));
  });

  it("rejette HTTP et scripts mais accepte un HTTPS générique sandboxable", () => {
    expect(resolveEmbed("http://youtube.com/watch?v=abc")).toBeNull();
    expect(resolveEmbed("javascript:alert(1)")).toBeNull();
    expect(resolveEmbed("https://unknown.example/video")).toEqual(expect.objectContaining({ provider: "generic" }));
  });

  it("n’extrait que src d’un iframe collé", () => {
    const input = '<iframe src="https://open.spotify.com/track/abc" onload="alert(1)"><script>bad()</script></iframe>';
    expect(extractIframeSource(input)).toBe("https://open.spotify.com/track/abc");
    expect(resolveEmbed(input)?.provider).toBe("spotify");
  });
});
