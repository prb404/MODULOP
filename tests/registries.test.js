import { describe, expect, it } from "vitest";
import { listFields, renderField } from "../src/fields/index.js";
import { experiments } from "../src/core/experiments.js";
import { listRenderers } from "../src/renderers/index.js";

describe("registres V3.2", () => {
  it("déclare les champs et les inspirations sans code distant", () => {
    expect(listFields().map((item) => item.id)).toEqual(["range", "multiRange"]);
    expect(experiments).toHaveLength(8);
    expect(experiments.every((item) => item.source.startsWith("https://codepen.io/"))).toBe(true);
    expect(experiments.every((item) => ["adapted", "permissive", "inspiration-only"].includes(item.status))).toBe(true);
  });

  it("conserve un input range natif sous chaque thème", () => {
    for (const theme of ["expressive", "segmented", "bubble", "bands"]) {
      expect(renderField("range", { theme, value: 42 })).toContain('type="range"');
    }
    expect(renderField("range", { value: 42, mode: "display" })).not.toContain('type="range"');
    expect(renderField("range", { value: 42, mode: "display" })).toContain('role="meter"');
  });

  it("expose des manifestes de renderer complets", () => {
    const renderers = listRenderers();
    expect(renderers.some((item) => item.type === "embed")).toBe(true);
    expect(renderers.every((item) => item.id && item.engine && item.captureMode && item.loadingStrategy)).toBe(true);
    expect(renderers.every((item) => Object.keys(item.optionsSchema).length > 0)).toBe(true);
  });
});
