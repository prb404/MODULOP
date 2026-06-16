import { describe, expect, it } from "vitest";
import { assessmentProgress, feedbackFor, scoreAssessment } from "../src/core/assessments.js";

describe("moteur d’évaluation", () => {
  const data = {
    dimensions: [{ id: "a", label: "Action", color: "#fff" }],
    questions: [
      { id: "q1", dimensionId: "a", max: 5, weight: 1 },
      { id: "q2", dimensionId: "a", max: 5, weight: 2 }
    ],
    responses: { q1: 5, q2: 2 },
    scoring: { normalizeTo: 100 },
    feedback: [{ min: 0, max: 70, text: "Progression" }, { min: 71, max: 100, text: "Solide" }]
  };

  it("normalise les scores pondérés", () => {
    expect(scoreAssessment(data)[0].value).toBe(60);
    expect(feedbackFor(data)).toBe("Progression");
  });

  it("calcule la progression", () => {
    expect(assessmentProgress(data)).toEqual({ answered: 2, total: 2, percent: 100 });
  });

  it("conserve les questions ouvertes hors des scores numériques", () => {
    const mixed = {
      dimensions: [
        { id: "numeric", label: "Numérique", color: "#fff" },
        { id: "open", label: "Ouverte", color: "#fff" }
      ],
      questions: [
        { id: "q1", dimensionId: "numeric", max: 5 },
        { id: "q2", dimensionId: "open", kind: "text" }
      ],
      responses: { q1: 4, q2: "Confiance fragile mais explicite." },
      scoring: { normalizeTo: 100 }
    };

    expect(assessmentProgress(mixed)).toEqual({ answered: 2, total: 2, percent: 100 });
    expect(scoreAssessment(mixed).map((dimension) => dimension.id)).toEqual(["numeric"]);
  });
});
