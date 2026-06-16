import { describe, expect, it } from "vitest";
import { gardnerDimensions, gardnerQuestions, scoreGardner } from "../src/gardner.js";
import { gardnerOption } from "../src/renderers/index.js";

describe("moteur Gardner", () => {
  it("conserve 72 questions réparties sur 8 dimensions", () => {
    expect(gardnerQuestions).toHaveLength(72);
    expect(gardnerDimensions).toHaveLength(8);
    expect(new Set(gardnerQuestions.map((item) => item.dimension)).size).toBe(8);
  });

  it("calcule les scores et pourcentages", () => {
    const responses = Object.fromEntries(gardnerQuestions.map((item) => [item.id, true]));
    const scores = scoreGardner(responses);
    expect(scores.every((item) => item.value === 9)).toBe(true);
    expect(scores.every((item) => item.percent === 100)).toBe(true);
  });

  it.each(["radar", "bars", "orbit"])("produit une option ECharts pour %s", (variant) => {
    const option = gardnerOption(scoreGardner({}), variant);
    expect(option.series).toHaveLength(1);
    expect(option.tooltip).toBeTruthy();
  });
});
