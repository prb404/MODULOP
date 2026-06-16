const registry = new Map();

export function registerField(definition) {
  if (!definition?.id || typeof definition.render !== "function") {
    throw new TypeError("Un champ doit fournir un identifiant et une fonction render.");
  }
  registry.set(definition.id, Object.freeze({ ...definition }));
  return definition;
}

export function fieldFor(id) {
  return registry.get(id);
}

export function renderField(id, config) {
  const field = fieldFor(id);
  if (!field) throw new Error(`Champ inconnu : ${id}`);
  return field.render(config);
}

export function listFields() {
  return [...registry.values()];
}

registerField({
  id: "range",
  themes: ["expressive", "segmented", "bubble", "bands", "magnetic", "ribbon", "pulse", "minimal"],
  render: ({
    label = "", value = 50, min = 0, max = 100, step = 1, unit = "",
    theme = "bubble", name = "", marks = [], segments = [], mode = "edit", readonly = false
  }) => {
    const progress = ((Number(value) - min) / Math.max(1, max - min)) * 100;
    const segmentStyle = segments.length
      ? `background:${segments.map((segment) => `${segment.color} ${segment.from}%,${segment.color} ${segment.to}%`).join(",")}`
      : "";
    const expressive = theme === "expressive" ? `<svg class="meta-range__elastic" viewBox="0 0 100 44" preserveAspectRatio="none" aria-hidden="true">
      <path class="meta-range__elastic-base" d="M2 22 C 20 22, 36 22, ${progress} 22 S 82 22, 98 22"></path>
      <path class="meta-range__elastic-live" data-elastic-path d="${elasticPath(progress, 0)}"></path>
    </svg>` : "";
    const isDisplay = mode === "display" || readonly;
    return `<label class="meta-range meta-range--${theme} ${isDisplay ? "meta-range--display" : ""}" style="--range-progress:${progress}%">
      <span class="meta-range__label">${escapeHtml(label)}<output>${escapeHtml(value)}${escapeHtml(unit)}</output></span>
      <span class="meta-range__stage">
        ${expressive}
        <span class="meta-range__track" style="${segmentStyle}"></span>
        ${isDisplay
          ? `<span class="meta-range__static" role="meter" aria-label="${escapeHtml(label)}" aria-valuemin="${min}" aria-valuemax="${max}" aria-valuenow="${escapeHtml(value)}" aria-valuetext="${escapeHtml(value)}${escapeHtml(unit)}"></span>`
          : `<input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-field-range="${escapeHtml(name)}"
          aria-label="${escapeHtml(label)}" aria-valuetext="${escapeHtml(value)}${escapeHtml(unit)}">`}
        <span class="meta-range__bubble" aria-hidden="true">${escapeHtml(value)}${escapeHtml(unit)}</span>
      </span>
      ${marks.length ? `<span class="meta-range__marks">${marks.map((mark) => `<i style="left:${mark.at}%">${escapeHtml(mark.label)}</i>`).join("")}</span>` : ""}
    </label>`;
  }
});

registerField({
  id: "multiRange",
  themes: ["bands"],
  render: ({ label = "", values = [25, 75], min = 0, max = 100, step = 1, name = "" }) => `
    <fieldset class="meta-multirange"><legend>${escapeHtml(label)}</legend>
      ${values.map((value, index) => renderField("range", {
        label: `Valeur ${index + 1}`, value, min, max, step, theme: "bubble", name: `${name}:${index}`
      })).join("")}
    </fieldset>`
});

export function bindFields(root, onInput) {
  root.querySelectorAll("[data-field-range]").forEach((input) => {
    const update = () => {
    const owner = input.closest(".meta-range");
    const output = owner?.querySelector("output");
    const bubble = owner?.querySelector(".meta-range__bubble");
    const progress = ((Number(input.value) - Number(input.min)) / Math.max(1, Number(input.max) - Number(input.min))) * 100;
    owner?.style.setProperty("--range-progress", `${progress}%`);
    if (output) output.textContent = input.value;
    if (bubble) bubble.textContent = input.value;
    updateElastic(owner, progress, 0);
    onInput?.(input.dataset.fieldRange, Number(input.value), input);
    };
    input.addEventListener("input", update);
    input.addEventListener("pointerdown", () => input.closest(".meta-range")?.classList.add("is-active"));
    input.addEventListener("pointermove", (event) => {
      if (!input.matches(":active")) return;
      const rect = input.getBoundingClientRect();
      const local = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      const progress = local / Math.max(1, rect.width) * 100;
      const bend = Math.max(-12, Math.min(12, event.clientY - rect.top - rect.height / 2));
      updateElastic(input.closest(".meta-range"), progress, bend);
    });
    const release = () => {
      input.closest(".meta-range")?.classList.remove("is-active");
      const progress = ((Number(input.value) - Number(input.min)) / Math.max(1, Number(input.max) - Number(input.min))) * 100;
      updateElastic(input.closest(".meta-range"), progress, 0);
    };
    input.addEventListener("pointerup", release);
    input.addEventListener("pointercancel", release);
  });
}

function updateElastic(owner, progress, bend) {
  const path = owner?.querySelector("[data-elastic-path]");
  if (!path) return;
  path.setAttribute("d", elasticPath(progress, bend));
}

function elasticPath(progress, bend = 0) {
  const x = Math.max(4, Math.min(96, Number(progress)));
  const pull = Math.max(-16, Math.min(16, Number(bend)));
  const leftTension = Math.max(8, x * .58);
  const rightTension = Math.min(92, x + (100 - x) * .42);
  return `M2 22 C ${leftTension * .45} ${22 + pull * .65}, ${leftTension} ${22 + pull * 1.45}, ${x} 22 C ${rightTension} ${22 - pull * .95}, ${rightTension + (98 - rightTension) * .45} ${22 - pull * .35}, 98 22`;
}

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
