export function createAssessment({ id, title, dimensions, questions, feedback = [], scale = null, scoring = {} }) {
  return {
    assessmentId: id,
    title,
    scale,
    dimensions,
    questions,
    responses: {},
    feedback,
    scoring: { mode: "weighted-average", normalizeTo: 100, ...scoring }
  };
}

export function scoreAssessment(data = {}) {
  const totals = Object.fromEntries((data.dimensions || []).map((dimension) => [dimension.id, { ...dimension, raw: 0, max: 0, answered: 0 }]));
  const scorableDimensionIds = new Set();
  for (const question of data.questions || []) {
    if (question.kind === "text") continue;
    scorableDimensionIds.add(question.dimensionId);
    const response = data.responses?.[question.id];
    if (response === undefined || response === "") continue;
    const value = scoreQuestion(question, response);
    const weight = Number(question.weight ?? 1);
    const target = totals[question.dimensionId];
    if (!target) continue;
    target.raw += value * weight;
    target.max += scoreMax(question) * weight;
    target.answered += 1;
  }
  return Object.values(totals).filter((dimension) => scorableDimensionIds.has(dimension.id)).map((dimension) => ({
    ...dimension,
    value: dimension.max ? Math.round(dimension.raw / dimension.max * Number(data.scoring?.normalizeTo || 100)) : 0
  }));
}

export function feedbackFor(data, scores = scoreAssessment(data)) {
  const top = [...scores].sort((a, b) => b.value - a.value)[0];
  const rule = (data.feedback || []).find((item) =>
    (!item.dimensionId || item.dimensionId === top?.id) &&
    top?.value >= Number(item.min ?? 0) &&
    top?.value <= Number(item.max ?? 100));
  return rule?.text || (top ? `${top.label} constitue actuellement votre appui principal.` : "Complétez le questionnaire pour obtenir une restitution.");
}

export function assessmentProgress(data = {}) {
  const total = data.questions?.length || 0;
  const answered = Object.keys(data.responses || {}).filter((key) => data.responses[key] !== undefined && data.responses[key] !== "").length;
  return { answered, total, percent: total ? Math.round(answered / total * 100) : 0 };
}

export function scoreQuestion(question = {}, response) {
  if (question.kind === "choice" && question.correct !== undefined) return response === question.correct ? Number(question.max ?? 1) : 0;
  const min = Number(question.min ?? 0);
  const max = Number(question.max ?? 5);
  const numeric = Math.max(min, Math.min(max, Number(response)));
  return question.reverse ? max - numeric + min : numeric;
}

export function scoreMax(question = {}) {
  if (question.kind === "choice" && question.correct !== undefined) return Number(question.max ?? 1);
  return Number(question.max ?? 5);
}
