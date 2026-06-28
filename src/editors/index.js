import DOMPurify from "dompurify";
import { marked } from "marked";
import { icon } from "../ui/icons.js";
import { gardnerDimensions, gardnerQuestions, scoreGardner } from "../gardner.js";
import { saveAsset } from "../core/store.js";
import { renderField } from "../fields/index.js";
import { resolveEmbed } from "../core/embed-providers.js";
import { remoteResources } from "../core/remote-resources.js";
import { listFonts } from "../core/fonts.js";
import { visualPickerField, bindVisualPickers } from "../ui/visual-picker.js";
import { assessmentProgress, scoreAssessment } from "../core/assessments.js";
import { ControlRegistry, choiceCards, consentControl, disclosure } from "../ui/controls.js";
import { rendererFor } from "../renderers/index.js";

let editorInstance = null;
let markdownView = null;
const assessmentTypes = ["self-efficacy", "learner-efficacy", "collective-efficacy", "collective-intelligence", "sic-compact", "sic-long", "tpack", "personality", "cognitive"];

export function destroyEditor() {
  editorInstance?.destroy?.();
  editorInstance = null;
  markdownView?.destroy?.();
  markdownView = null;
}

export function editorBody(module) {
  let body;
  if (module.type === "rich-text") body = richTextEditor(module);
  else if (module.type === "starter-pack") body = starterEditor(module);
  else if (module.type === "constellation") body = constellationEditor(module);
  else if (module.type === "gardner") body = gardnerEditor(module);
  else if (assessmentTypes.includes(module.type)) return assessmentDefinitionEditor(module);
  else body = genericEditor(module);
  return `${body}${appearanceEditor(module)}`;
}

export function assessmentBody(module) {
  return module.type === "gardner" ? gardnerEditor(module) : assessmentRunner(module);
}

export function appearanceBody(module) {
  return `<div class="save-state" data-save-state><i></i><span>Enregistré localement</span></div>${appearanceEditor(module)}`;
}

export async function mountEditor({ module, root, patch, announce }) {
  destroyEditor();
  bindCommon(root, patch);
  if (module.type === "rich-text") await mountMarkdown(module, root, patch, announce);
  if (module.type === "starter-pack") await mountStarter(module, root, patch, announce);
  if (module.type === "gardner") mountGardner(module, root, patch);
  if (["portrait-chinois", "manual", "timeline", "values"].includes(module.type)) mountListEditor(module, root, patch);
  if (module.type === "media") mountMedia(root, patch, announce);
  if (assessmentTypes.includes(module.type)) mountAssessmentEditor(module, root, patch);
  ControlRegistry.bind(root, (name, value, input) => {
    if (name.startsWith("pair:")) {
      patch((draft) => { draft.data.pairs[Number(name.split(":")[1])].value = value; });
      return;
    }
    if (name.startsWith("presentation.")) {
      patch((draft) => setPath(draft, name, value), input?.matches("button"));
    }
  });
  root.querySelector("[data-apply-embed]")?.addEventListener("click", () => {
    const input = root.querySelector("[data-embed-input]")?.value || "";
    const resolved = resolveEmbed(input);
    patch((draft) => {
      draft.data.input = input;
      draft.data.src = resolved?.src || "";
      draft.data.provider = resolved?.provider || "";
    }, true);
  });
  bindVisualPickers(root, patch, announce);
}

export function mountAssessment({ module, root, patch }) {
  bindCommon(root, patch);
  if (module.type === "gardner") mountGardner(module, root, patch);
  else mountAssessmentRunner(module, root, patch);
}

export function mountAppearanceEditor({ root, patch }) {
  bindCommon(root, patch);
  ControlRegistry.bind(root, (name, value, input) => {
    if (name.startsWith("presentation.")) patch((draft) => setPath(draft, name, value), input?.matches("button"));
    if (name === "variant") patch((draft) => { draft.variant = value; }, true);
  });
}

function richTextEditor(module) {
  const options = module.presentation?.options || {};
  const fonts = listFonts().map((font) => `<option value="${font.id}" ${font.id === options.fontFamily ? "selected" : ""}>${font.label}</option>`).join("");
  return `
    <div class="save-state" data-save-state><i></i><span>Enregistré localement</span></div>
    <section class="editor-section">
      <label class="field"><span>Titre interne</span><input data-path="title" value="${escapeAttribute(module.title)}"></label>
      <label class="field"><span>Surtitre</span><input data-path="data.eyebrow" value="${escapeAttribute(module.data.eyebrow)}"></label>
      <div class="rich-type-grid">
        <label class="field"><span>Police du fragment</span><select data-path="presentation.options.fontFamily">${fonts}</select></label>
        <label class="field"><span>Composition</span><select data-path="presentation.options.align">${["left", "center", "right"].map((value) => `<option value="${value}" ${value === (options.align || "left") ? "selected" : ""}>${{ left: "Gauche", center: "Centrée", right: "Droite" }[value]}</option>`).join("")}</select></label>
        ${numberField("Graisse", "presentation.options.fontWeight", options.fontWeight || 400, 200, 900, 50)}
        ${numberField("Échelle", "presentation.options.fontScale", options.fontScale || 100, 70, 160, 5)}
        ${numberField("Interligne", "presentation.options.lineHeight", options.lineHeight || 100, 80, 180, 5)}
        ${numberField("Largeur", "presentation.options.maxWidth", options.maxWidth || 1150, 420, 1500, 10)}
      </div>
      <div class="editor-mode-tabs" role="tablist">
        <button type="button" class="is-active" data-rich-mode="visual">Éditeur visuel</button>
        <button type="button" data-rich-mode="markdown">Markdown</button>
      </div>
      <div class="rich-editor-pane" data-rich-pane="visual"><div class="markdown-editor" data-markdown-editor></div></div>
      <div class="rich-editor-pane rich-editor-pane--markdown" data-rich-pane="markdown" hidden>
        <div class="markdown-source" data-markdown-source></div>
        <div class="markdown-preview"><span class="eyebrow">Aperçu non éditable</span><div data-markdown-preview></div></div>
      </div>
    </section>`;
}

function starterEditor(module) {
  return `
    <div class="save-state" data-save-state><i></i><span>Enregistré localement</span></div>
    <section class="editor-section">
      <label class="field"><span>Titre</span><input data-path="title" value="${escapeAttribute(module.title)}"></label>
      <div class="segmented" aria-label="Composition">
        ${["shelf", "tiles", "editorial"].map((value) => `<button type="button" data-choice-path="variant" data-value="${value}" class="${module.variant === value ? "is-active" : ""}">${{ shelf: "Étagère", tiles: "Mosaïque", editorial: "Éditorial" }[value]}</button>`).join("")}
      </div>
      <div class="item-editor-list">
        ${(module.data.items || []).map((item, index) => `
          <article class="item-editor" data-item-index="${index}">
            <div>${visualPickerField(item.visualRef || item.asset || item.visual, `data.items.${index}.visualRef`, "Visuel")}</div>
            <div>
              <input data-item-field="label" value="${escapeAttribute(item.label)}" aria-label="Nom de l’objet">
              <input data-item-field="note" value="${escapeAttribute(item.note)}" aria-label="Note">
            </div>
            <div class="item-actions">
              <button type="button" data-move-item="-1" aria-label="Monter">${icon("ChevronUp", 15)}</button>
              <button type="button" data-move-item="1" aria-label="Descendre">${icon("ChevronDown", 15)}</button>
              <button type="button" data-remove-item aria-label="Retirer">${icon("X", 15)}</button>
            </div>
          </article>`).join("")}
      </div>
      <button class="soft-button" type="button" data-add-item>${icon("Plus", 16)} Ajouter un objet</button>
      <div class="media-row">
        <label class="soft-button">${icon("ImagePlus", 16)} Importer une image<input type="file" accept="image/*" data-media-file hidden></label>
        <button class="soft-button" type="button" data-paste-media>${icon("ClipboardPaste", 16)} Coller</button>
      </div>
      <div class="emoji-popover" hidden><emoji-picker locale="fr"></emoji-picker></div>
    </section>`;
}

function constellationEditor(module) {
  return `
    <div class="save-state" data-save-state><i></i><span>Enregistré localement</span></div>
    <section class="editor-section">
      <label class="field"><span>Titre</span><input data-path="title" value="${escapeAttribute(module.title)}"></label>
      <div class="segmented">
        <button type="button" data-choice-path="variant" data-value="network" class="${module.variant === "network" ? "is-active" : ""}">Réseau 2D</button>
        <button type="button" data-choice-path="variant" data-value="space" class="${module.variant === "space" ? "is-active" : ""}">Espace 3D</button>
      </div>
      <div class="node-editor-list">${(module.data.nodes || []).map((node, index) => `
        <article class="node-editor" data-node-index="${index}">
          <input data-node-label value="${escapeAttribute(node.label)}" aria-label="Nom du centre d’intérêt">
          <select data-node-category aria-label="Catégorie"><option value="core" ${node.category === "core" ? "selected" : ""}>Centre</option><option value="satellite" ${node.category !== "core" ? "selected" : ""}>Satellite</option></select>
          <label class="kinetic-range"><span>Intensité <output>${node.weight}</output></span><input data-node-weight type="range" min="10" max="100" value="${node.weight}"><i></i></label>
          ${visualPickerField(node.visual, `data.nodes.${index}.visual`, "Visuel du nœud")}
        </article>`).join("")}</div>
      <button class="soft-button" type="button" data-add-node>${icon("Plus", 16)} Ajouter un intérêt</button>
      <details><summary>Relations</summary><div class="relation-list">${(module.data.links || []).map((link, index) => `<article data-link-index="${index}">
        <select data-link-source>${module.data.nodes.map((node) => `<option value="${node.id}" ${node.id === link.source ? "selected" : ""}>${escapeHtml(node.label)}</option>`).join("")}</select>
        <span>→</span>
        <select data-link-target>${module.data.nodes.map((node) => `<option value="${node.id}" ${node.id === link.target ? "selected" : ""}>${escapeHtml(node.label)}</option>`).join("")}</select>
        <button type="button" data-remove-link>${icon("Trash2", 15)}</button>
      </article>`).join("")}</div><button class="soft-button" type="button" data-add-link>${icon("Plus", 16)} Ajouter une relation</button></details>
    </section>`;
}

function gardnerEditor(module) {
  const page = Math.max(0, Math.min(7, Number(module.data.page) || 0));
  const questions = gardnerQuestions.slice(page * 9, page * 9 + 9);
  const answered = Object.keys(module.data.responses || {}).filter((key) => module.data.responses[key] !== undefined).length;
  const scores = scoreGardner(module.data.responses).sort((a, b) => b.value - a.value);
  return `
    <div class="gardner-editor-tabs">
      <button type="button" data-gardner-view="questions" class="is-active">Questionnaire</button>
      <button type="button" data-gardner-view="results">Résultats</button>
    </div>
    <section data-gardner-questions>
      <div class="sequence-progress"><i style="width:${answered / 72 * 100}%"></i><span>${answered} réponses</span></div>
      <p class="panel-lead">Choisissez spontanément les affirmations qui vous ressemblent aujourd’hui.</p>
      <div class="question-cards">${questions.map((question) => `
        <label><input type="checkbox" data-question="${question.id}" ${module.data.responses?.[question.id] ? "checked" : ""}>
          <span><b>${String(question.number).padStart(2, "0")}</b>${escapeHtml(question.statement)}</span>
        </label>`).join("")}</div>
      <div class="sequence-nav">
        <button type="button" data-gardner-page="-1" ${page === 0 ? "disabled" : ""}>${icon("ArrowLeft", 16)} Précédent</button>
        <span>${page + 1} / 8</span>
        <button type="button" data-gardner-page="1">${page === 7 ? "Résultats" : "Suivant"} ${icon("ArrowRight", 16)}</button>
      </div>
    </section>
    <section data-gardner-results hidden>
      <div class="segmented">${["radar", "bars", "orbit"].map((value) => `<button type="button" data-choice-path="variant" data-value="${value}" class="${module.variant === value ? "is-active" : ""}">${{ radar: "Carte", bars: "Spectre", orbit: "Rosace" }[value]}</button>`).join("")}</div>
      <div class="result-list">${scores.map((score) => `<div><i style="background:${score.color}"></i><span>${score.label}</span><strong>${score.value}/9</strong></div>`).join("")}</div>
    </section>`;
}

function genericEditor(module) {
  if (module.type === "values") {
    return `<div class="save-state" data-save-state><i></i><span>Enregistré localement</span></div><section class="editor-section">
      <label class="field"><span>Titre</span><input data-path="title" value="${escapeAttribute(module.title)}"></label>
      ${choiceCards("presentation.themeId", "Style des curseurs", rangeThemeOptions(), module.presentation?.themeId || "bubble")}
      ${(module.data.pairs || []).map((pair, index) => `<div class="scale-editor"><div><input data-pair="${index}" data-side="left" value="${escapeAttribute(pair.left)}"><input data-pair="${index}" data-side="right" value="${escapeAttribute(pair.right)}"></div>
        ${renderField("range", { label: `${pair.left} / ${pair.right}`, value: pair.value, theme: module.presentation?.themeId || "bubble", name: `pair:${index}` })}</div>`).join("")}
    </section>`;
  }
  if (module.type === "link-card") return `<div class="save-state" data-save-state><i></i><span>Enregistré localement</span></div><section class="editor-section">
    <label class="field"><span>Titre du fragment</span><input data-path="title" value="${escapeAttribute(module.title)}"></label>
    <label class="field"><span>URL HTTPS</span><input type="url" data-path="data.url" value="${escapeAttribute(module.data.url)}"></label>
    <label class="field"><span>Titre affiché</span><input data-path="data.title" value="${escapeAttribute(module.data.title)}"></label>
    <label class="field"><span>Description</span><textarea data-path="data.description">${escapeHtml(module.data.description)}</textarea></label>
    ${visualPickerField(module.data.visual, "data.visual", "Aperçu", { allowedKinds: ["remote", "asset", "icon", "emoji"] })}
  </section>`;
  if (module.type === "media") return `<div class="save-state" data-save-state><i></i><span>Enregistré localement</span></div><section class="editor-section">
    <label class="field"><span>Titre du fragment</span><input data-path="title" value="${escapeAttribute(module.title)}"></label>
    <label class="field"><span>Titre affiché</span><input data-path="data.title" value="${escapeAttribute(module.data.title || "")}"></label>
    <label class="field"><span>Texte alternatif</span><input data-path="data.alt" value="${escapeAttribute(module.data.alt || "")}"></label>
    <label class="field"><span>Légende</span><textarea data-path="data.caption">${escapeHtml(module.data.caption || "")}</textarea></label>
    <div class="segmented">
      ${["poster", "full", "caption"].map((value) => `<button type="button" data-choice-path="variant" data-value="${value}" class="${module.variant === value ? "is-active" : ""}">${{ poster: "Poster", full: "Plein cadre", caption: "Légendé" }[value]}</button>`).join("")}
    </div>
    <label class="drop-field">${icon("ImagePlus", 18)} Remplacer l’image<input type="file" accept="image/*" data-media-replace></label>
  </section>`;
  if (module.type === "embed") {
    const resolved = resolveEmbed(module.data.input || module.data.src);
    return `<div class="save-state" data-save-state><i></i><span>Enregistré localement</span></div><section class="editor-section">
    <label class="field"><span>Titre du fragment</span><input data-path="title" value="${escapeAttribute(module.title)}"></label>
    <label class="field"><span>Titre affiché</span><input data-path="data.title" value="${escapeAttribute(module.data.title || module.title)}"></label>
    <label class="field"><span>URL ou code iframe</span><textarea data-embed-input>${escapeHtml(module.data.input || module.data.src)}</textarea></label>
    <p class="editor-note">MODULOP extrait uniquement une URL HTTPS reconnue. Aucun script ni HTML arbitraire n’est exécuté.</p>
    <button class="soft-button" type="button" data-apply-embed>Valider l’intégration</button>
    ${resolved ? consentControl({ url: resolved.src, type: "embed", label: resolved.domain, status: remoteResources.status(resolved.src, "embed"), description: "Autorisation distante pour cette iframe." }) : ""}
  </section>`;
  }
  if (module.type === "portrait-chinois") {
    const entries = module.data.entries || [{ prompt: module.data.prompt, answer: module.data.answer, note: module.data.note, visual: module.data.visual }];
    return listEditorShell(module, "entries", entries, (item, index) => `
      <label class="field"><span>Question</span><input data-list-field="prompt" value="${escapeAttribute(item.prompt || "")}"></label>
      <label class="field"><span>Réponse</span><textarea data-list-field="answer">${escapeHtml(item.answer || "")}</textarea></label>
      <label class="field"><span>Commentaire</span><textarea data-list-field="note">${escapeHtml(item.note || "")}</textarea></label>
      ${visualPickerField(item.visual, `data.entries.${index}.visual`, "Visuel")}`, { variants: ["editorial", "cards", "gallery"] });
  }
  if (module.type === "manual") return listEditorShell(module, "items", module.data.items, (item, index) => `
    <label class="field"><span>Repère</span><input data-list-field="label" value="${escapeAttribute(item.label || "")}"></label>
    <label class="field"><span>Contenu</span><textarea data-list-field="value">${escapeHtml(item.value || "")}</textarea></label>
    ${visualPickerField(item.visual, `data.items.${index}.visual`, "Visuel")}`, { variants: ["notes", "cards", "path"] });
  if (module.type === "timeline") return listEditorShell(module, "events", module.data.events, (item, index) => `
    <label class="field"><span>Date ou repère</span><input data-list-field="year" value="${escapeAttribute(item.year || "")}"></label>
    <label class="field"><span>Titre</span><input data-list-field="title" value="${escapeAttribute(item.title || "")}"></label>
    <label class="field"><span>Récit</span><textarea data-list-field="text">${escapeHtml(item.text || "")}</textarea></label>
    ${visualPickerField(item.visual, `data.events.${index}.visual`, "Visuel")}`, { variants: ["vertical", "horizontal", "cards"] });
  if (assessmentTypes.includes(module.type)) return assessmentDefinitionEditor(module);
  return `<div class="save-state" data-save-state><i></i><span>Enregistré localement</span></div><section class="editor-section">
    <label class="field"><span>Titre</span><input data-path="title" value="${escapeAttribute(module.title)}"></label>
    <div class="editor-note"><strong>Éditeur structuré</strong><p>Ce fragment utilise le socle V3 et conservera ses données actuelles. Son expérience spécialisée sera approfondie dans une prochaine itération.</p></div>
  </section>`;
}

async function mountMarkdown(module, root, patch, announce) {
  const [{ default: Editor }] = await Promise.all([
    import("@toast-ui/editor"),
    import("@toast-ui/editor/dist/toastui-editor.css")
  ]);
  await import("@toast-ui/editor/dist/i18n/fr-fr");
  const syncMarkdown = (value) => {
    const preview = root.querySelector("[data-markdown-preview]");
    if (preview) preview.innerHTML = DOMPurify.sanitize(marked.parse(value || ""));
  };
  const dark = document.body.dataset.colorMode === "dark";
  if (dark) await import("@toast-ui/editor/dist/theme/toastui-editor-dark.css");
  editorInstance = new Editor({
    el: root.querySelector("[data-markdown-editor]"),
    height: "430px",
    initialEditType: "wysiwyg",
    previewStyle: "vertical",
    initialValue: module.data.markdown || "",
    usageStatistics: false,
    language: "fr-FR",
    theme: dark ? "dark" : "light",
    hideModeSwitch: true,
    toolbarItems: [["heading", "bold", "italic", "strike"], ["hr", "quote"], ["ul", "ol", "task"], ["table", "link"], ["image", "code", "codeblock"]],
    hooks: {
      addImageBlobHook: async (blob, callback) => {
        await saveAsset(blob, blob.name || "image");
        callback(await blobToDataUrl(blob), blob.name || "Image");
        announce("Image ajoutée au profil");
      }
    },
    events: {
      change: () => {
        const markdown = DOMPurify.sanitize(editorInstance.getMarkdown());
        patch((draft) => { draft.data.markdown = markdown; });
        syncMarkdown(markdown);
      }
    }
  });
  const [{ EditorView, keymap }, { EditorState }, { markdown }, { defaultKeymap, history, historyKeymap }] = await Promise.all([
    import("@codemirror/view"), import("@codemirror/state"), import("@codemirror/lang-markdown"), import("@codemirror/commands")
  ]);
  markdownView = new EditorView({
    parent: root.querySelector("[data-markdown-source]"),
    state: EditorState.create({
      doc: module.data.markdown || "",
      extensions: [markdown(), history(), keymap.of([...defaultKeymap, ...historyKeymap]), EditorView.lineWrapping, EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        const value = update.state.doc.toString();
        editorInstance.setMarkdown(value, false);
        patch((draft) => { draft.data.markdown = value; });
        syncMarkdown(value);
      })]
    })
  });
  syncMarkdown(module.data.markdown || "");
  root.querySelectorAll("[data-rich-mode]").forEach((button) => button.addEventListener("click", () => {
    root.querySelectorAll("[data-rich-mode]").forEach((item) => item.classList.toggle("is-active", item === button));
    root.querySelectorAll("[data-rich-pane]").forEach((pane) => { pane.hidden = pane.dataset.richPane !== button.dataset.richMode; });
    if (button.dataset.richMode === "markdown") markdownView.requestMeasure();
  }));
}

function bindCommon(root, patch) {
  root.querySelectorAll("[data-path]").forEach((input) => input.addEventListener("input", () => patch((module) => setPath(module, input.dataset.path, input.type === "range" || input.type === "number" ? Number(input.value) : input.value))));
  root.querySelectorAll("[data-choice-path]").forEach((button) => button.addEventListener("click", () => patch((module) => setPath(module, button.dataset.choicePath, button.dataset.value), true)));
  root.querySelectorAll("[data-pair]").forEach((input) => input.addEventListener("input", () => patch((module) => {
    const pair = module.data.pairs[Number(input.dataset.pair)];
    pair[input.dataset.side] = input.dataset.side === "value" ? Number(input.value) : input.value;
    input.closest(".scale-editor")?.querySelector("output")?.replaceChildren(input.value);
  })));
  root.querySelectorAll("[data-node-index]").forEach((row) => {
    row.querySelector("[data-node-label]")?.addEventListener("input", (event) => patch((module) => { module.data.nodes[Number(row.dataset.nodeIndex)].label = event.target.value; }));
    row.querySelector("[data-node-weight]")?.addEventListener("input", (event) => {
      row.querySelector("output").textContent = event.target.value;
      patch((module) => { module.data.nodes[Number(row.dataset.nodeIndex)].weight = Number(event.target.value); });
    });
    row.querySelector("[data-node-category]")?.addEventListener("change", (event) => patch((module) => { module.data.nodes[Number(row.dataset.nodeIndex)].category = event.target.value; }));
  });
  root.querySelector("[data-add-node]")?.addEventListener("click", () => patch((module) => module.data.nodes.push({ id: crypto.randomUUID(), label: "Nouvel intérêt", weight: 50, category: "satellite" }), true));
  root.querySelectorAll("[data-link-index]").forEach((row) => {
    const index = Number(row.dataset.linkIndex);
    row.querySelector("[data-link-source]")?.addEventListener("change", (event) => patch((module) => { module.data.links[index].source = event.target.value; }));
    row.querySelector("[data-link-target]")?.addEventListener("change", (event) => patch((module) => { module.data.links[index].target = event.target.value; }));
    row.querySelector("[data-remove-link]")?.addEventListener("click", () => patch((module) => module.data.links.splice(index, 1), true));
  });
  root.querySelector("[data-add-link]")?.addEventListener("click", () => patch((module) => {
    module.data.links ||= [];
    if (module.data.nodes.length > 1) module.data.links.push({ id: crypto.randomUUID(), source: module.data.nodes[0].id, target: module.data.nodes[1].id, weight: 50 });
  }, true));
  root.querySelector("[data-reset-presentation]")?.addEventListener("click", () => patch((module) => { module.presentation.options = {}; }, true));
}

function mountListEditor(module, root, patch) {
  root.querySelectorAll("[data-list-item]").forEach((row) => {
    const list = row.dataset.list;
    const index = Number(row.dataset.index);
    row.querySelectorAll("[data-list-field]").forEach((input) => input.addEventListener("input", () => patch((draft) => {
      draft.data[list][index][input.dataset.listField] = input.value;
    })));
    row.querySelector("[data-list-remove]")?.addEventListener("click", () => patch((draft) => draft.data[list].splice(index, 1), true));
    row.querySelectorAll("[data-list-move]").forEach((button) => button.addEventListener("click", () => patch((draft) => {
      const next = Math.max(0, Math.min(draft.data[list].length - 1, index + Number(button.dataset.listMove)));
      const [item] = draft.data[list].splice(index, 1);
      draft.data[list].splice(next, 0, item);
    }, true)));
  });
  root.querySelector("[data-list-add]")?.addEventListener("click", () => patch((draft) => {
    const list = root.querySelector("[data-list-add]").dataset.listAdd;
    draft.data[list].push(defaultListItem(list));
  }, true));
}

function assessmentRunner(module) {
  const progress = assessmentProgress(module.data);
  const scores = scoreAssessment(module.data);
  return `<div class="save-state" data-save-state><i></i><span>Enregistré localement</span></div><section class="editor-section assessment-runner">
    <header class="assessment-runner__head">
      <span class="eyebrow">${escapeHtml(module.data.source?.fidelity || "Questionnaire")}</span>
      <h3>${escapeHtml(module.data.title || module.title)}</h3>
      <p>${escapeHtml(module.data.source?.label || "Preset MODULOP éditable")}</p>
    </header>
    <div class="sequence-progress"><i style="width:${progress.percent}%"></i><span>${progress.answered}/${progress.total} réponses</span></div>
    <div class="question-cards question-cards--assessment">${(module.data.questions || []).map((question, index) => `<article class="assessment-question" data-assessment-question="${index}">
      <label>${escapeHtml(question.text)}</label>
      ${responseInput(question, module.data.responses?.[question.id])}
    </article>`).join("")}</div>
    <div class="result-list assessment-result-panel">${scores.map((score) => `<div><i style="background:${score.color}"></i><span>${escapeHtml(score.label)}</span><strong>${score.value}</strong></div>`).join("")}</div>
  </section>`;
}

function assessmentDefinitionEditor(module) {
  const scores = scoreAssessment(module.data);
  return `<div class="save-state" data-save-state><i></i><span>Enregistré localement</span></div><section class="editor-section assessment-author">
    <label class="field"><span>Titre du questionnaire</span><input data-path="data.title" value="${escapeAttribute(module.data.title || module.title)}"></label>
    <div class="editor-note"><strong>Source et fidélité</strong><p>${escapeHtml(module.data.source?.label || "Preset MODULOP")} — ${escapeHtml(module.data.source?.fidelity || "structure éditable")}.</p></div>
    <details open><summary>Dimensions et scores</summary><div class="result-list">${scores.map((score) => `<div><i style="background:${score.color}"></i><span>${escapeHtml(score.label)}</span><strong>${score.value}</strong></div>`).join("")}</div>
      <button class="soft-button" type="button" data-add-dimension>${icon("Plus", 16)} Ajouter une dimension</button>
      ${(module.data.dimensions || []).map((dimension, index) => `<article class="author-row" data-dimension="${index}"><input data-dimension-field="label" value="${escapeAttribute(dimension.label)}"><input type="color" data-dimension-field="color" value="${dimension.color || "#74d8d1"}"><button data-remove-dimension type="button">${icon("Trash2", 15)}</button></article>`).join("")}
    </details>
    <details><summary>Questions et scoring</summary><button class="soft-button" type="button" data-add-question>${icon("Plus", 16)} Ajouter une question</button>
      ${(module.data.questions || []).map((question, index) => `<article class="author-question" data-author-question="${index}"><textarea data-question-field="text">${escapeHtml(question.text)}</textarea><select data-question-field="dimensionId">${module.data.dimensions.map((dimension) => `<option value="${dimension.id}" ${dimension.id === question.dimensionId ? "selected" : ""}>${escapeHtml(dimension.label)}</option>`).join("")}</select><label>Poids <input type="number" min=".1" step=".1" data-question-field="weight" value="${question.weight || 1}"></label><button data-remove-question type="button">${icon("Trash2", 15)}</button></article>`).join("")}
    </details>
    <details><summary>Textes de restitution</summary>${(module.data.feedback || []).map((item, index) => `<article class="author-feedback" data-feedback="${index}"><label>De <input type="number" data-feedback-field="min" value="${item.min ?? 0}"></label><label>à <input type="number" data-feedback-field="max" value="${item.max ?? 100}"></label><textarea data-feedback-field="text">${escapeHtml(item.text)}</textarea></article>`).join("")}</details>
  </section>`;
}

function responseInput(question, value) {
  if (question.kind === "text") return `<textarea data-assessment-response rows="4" placeholder="Réponse libre">${escapeHtml(value || "")}</textarea>`;
  if (question.kind === "choice") return `<select data-assessment-response><option value="">Choisir…</option>${(question.choices || []).map((choice) => `<option ${value === choice ? "selected" : ""}>${escapeHtml(choice)}</option>`).join("")}</select>`;
  return `<input data-assessment-response type="range" min="${question.min ?? 0}" max="${question.max ?? 5}" step="${question.step ?? 1}" value="${value ?? question.min ?? 0}"><output>${value ?? question.min ?? 0}</output>`;
}

function mountAssessmentEditor(module, root, patch) {
  bindAuthorRows(root, patch);
}

function mountAssessmentRunner(module, root, patch) {
  root.querySelectorAll("[data-assessment-question]").forEach((row) => {
    const question = module.data.questions[Number(row.dataset.assessmentQuestion)];
    row.querySelector("[data-assessment-response]")?.addEventListener("input", (event) => {
      row.querySelector("output")?.replaceChildren(event.target.value);
      patch((draft) => { draft.data.responses[question.id] = question.kind === "choice" || question.kind === "text" ? event.target.value : Number(event.target.value); });
    });
  });
}

async function mountStarter(module, root, patch, announce) {
  const [, { default: fr }, { default: dataSource }] = await Promise.all([
    import("emoji-picker-element"),
    import("emoji-picker-element/i18n/fr"),
    import("emoji-picker-element-data/fr/emojibase/data.json?url")
  ]);
  let targetIndex = 0;
  const emojiPopover = root.querySelector(".emoji-popover");
  const picker = root.querySelector("emoji-picker");
  picker.i18n = fr;
  picker.locale = "fr";
  picker.dataSource = dataSource;
  root.querySelectorAll("[data-item-index]").forEach((row) => {
    const index = Number(row.dataset.itemIndex);
    row.querySelectorAll("[data-item-field]").forEach((input) => input.addEventListener("input", () => patch((draft) => { draft.data.items[index][input.dataset.itemField] = input.value; })));
    row.querySelector("[data-emoji-target]")?.addEventListener("click", () => {
      targetIndex = index;
      emojiPopover.hidden = !emojiPopover.hidden;
    });
    row.querySelectorAll("[data-move-item]").forEach((button) => button.addEventListener("click", () => patch((draft) => {
      const next = Math.max(0, Math.min(draft.data.items.length - 1, index + Number(button.dataset.moveItem)));
      const [item] = draft.data.items.splice(index, 1);
      draft.data.items.splice(next, 0, item);
    }, true)));
    row.querySelector("[data-remove-item]")?.addEventListener("click", () => patch((draft) => draft.data.items.splice(index, 1), true));
  });
  picker?.addEventListener("emoji-click", (event) => {
    patch((draft) => { draft.data.items[targetIndex].visual = event.detail.unicode; draft.data.items[targetIndex].asset = ""; }, true);
    emojiPopover.hidden = true;
  });
  root.querySelector("[data-add-item]")?.addEventListener("click", () => patch((draft) => draft.data.items.push({ id: crypto.randomUUID(), visual: "◇", label: "Nouvel objet", note: "Pourquoi il compte" }), true));
  root.querySelector("[data-media-file]")?.addEventListener("change", async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    const reference = await saveAsset(file, file.name);
    patch((draft) => { draft.data.items[targetIndex].asset = reference; }, true);
    announce("Image conservée localement");
  });
  root.querySelector("[data-paste-media]")?.addEventListener("click", async () => {
    try {
      const items = await navigator.clipboard.read();
      const imageType = items.flatMap((item) => item.types).find((type) => type.startsWith("image/"));
      if (!imageType) throw new Error();
      const owner = items.find((item) => item.types.includes(imageType));
      const reference = await saveAsset(await owner.getType(imageType), "presse-papier");
      patch((draft) => { draft.data.items[targetIndex].asset = reference; }, true);
      announce("Image collée");
    } catch {
      announce("Aucune image accessible dans le presse-papier");
    }
  });
}

function mountMedia(root, patch, announce) {
  root.querySelector("[data-media-replace]")?.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;
    const reference = await saveAsset(file, file.name);
    patch((draft) => {
      draft.data.src = reference;
      draft.data.kind = file.type.startsWith("image/") ? "image" : "file";
      draft.data.title ||= file.name;
      draft.data.alt ||= file.name;
      draft.data.caption ||= file.type || "Média local";
    }, true);
    announce?.("Média remplacé localement");
  });
}

function mountGardner(module, root, patch) {
  root.querySelectorAll("[data-question]").forEach((input) => input.addEventListener("change", () => patch((draft) => { draft.data.responses[input.dataset.question] = input.checked; })));
  root.querySelectorAll("[data-gardner-page]").forEach((button) => button.addEventListener("click", () => patch((draft) => {
    draft.data.page = Math.max(0, Math.min(7, Number(draft.data.page || 0) + Number(button.dataset.gardnerPage)));
  }, true)));
  root.querySelectorAll("[data-gardner-view]").forEach((button) => button.addEventListener("click", () => {
    const results = button.dataset.gardnerView === "results";
    root.querySelector("[data-gardner-questions]").hidden = results;
    root.querySelector("[data-gardner-results]").hidden = !results;
    root.querySelectorAll("[data-gardner-view]").forEach((item) => item.classList.toggle("is-active", item === button));
  }));
}

function setPath(target, path, value) {
  const parts = path.split(".");
  const key = parts.pop();
  const owner = parts.reduce((current, part) => current[part], target);
  owner[key] = value;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(blob);
  });
}

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttribute(value = "") {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function rangeThemes(value) {
  return [
    ["expressive", "Poignée expressive"],
    ["segmented", "Zones sémantiques"],
    ["bubble", "Bulle de valeur"],
    ["bands", "Bandes superposées"]
  ].map(([id, label]) => `<option value="${id}" ${id === value ? "selected" : ""}>${label}</option>`).join("");
}

function rangeThemeOptions() {
  return [
    { value: "expressive", label: "Élastique", preview: "preview-slider-expressive" },
    { value: "segmented", label: "Sémantique", preview: "preview-slider-segmented" },
    { value: "bubble", label: "Bulle", preview: "preview-slider-bubble" },
    { value: "bands", label: "Bandes", preview: "preview-slider-bands" },
    { value: "magnetic", label: "Magnétique", preview: "preview-slider-magnetic" },
    { value: "ribbon", label: "Ruban", preview: "preview-slider-ribbon" },
    { value: "pulse", label: "Pulse", preview: "preview-slider-pulse" },
    { value: "minimal", label: "Minimal", preview: "preview-slider-minimal" }
  ];
}

function appearanceEditor(module) {
  const options = module.presentation?.options || {};
  const theme = module.presentation?.themeId || "bubble";
  const renderer = rendererFor(module);
  const capabilities = renderer.controlCapabilities || {};
  const variants = renderer.variants || [];
  return `<section class="editor-section fragment-appearance appearance-studio">
    ${disclosure("Apparence du fragment", `
      <header class="appearance-studio__hero"><span>${icon("WandSparkles", 20)}</span><div><strong>Studio local</strong><small>Les réglages manuels verrouillent uniquement la présentation de ce fragment.</small></div></header>
      ${variants.length > 1 ? choiceCards("variant", "Rendu", variants.map((variant) => ({ value: variant, label: variantLabel(variant) })), module.variant) : ""}
      <div class="morph-color-grid">
        <label class="morph-color"><span>Surface</span><i style="--control-color:${safeColor(options.surface, "#171a15")}"></i><input type="color" data-path="presentation.options.surface" value="${safeColor(options.surface, "#171a15")}"><output>${safeColor(options.surface, "#171a15")}</output></label>
        <label class="morph-color"><span>Texte</span><i style="--control-color:${safeColor(options.text, "#f4f1e8")}"></i><input type="color" data-path="presentation.options.text" value="${safeColor(options.text, "#f4f1e8")}"><output>${safeColor(options.text, "#f4f1e8")}</output></label>
        <label class="morph-color"><span>Accent</span><i style="--control-color:${safeColor(options.accent, "#f2764b")}"></i><input type="color" data-path="presentation.options.accent" value="${safeColor(options.accent, "#f2764b")}"><output>${safeColor(options.accent, "#f2764b")}</output></label>
      </div>
      ${capabilities.rangeTheme ? choiceCards("presentation.themeId", "Style des contrôles", rangeThemeOptions(), theme) : ""}
      ${renderField("range", { label: "Rayon local", name: "presentation.options.radius", value: options.radius ?? 22, min: 0, max: 48, unit: " px", theme })}
      ${renderField("range", { label: "Densité", name: "presentation.options.density", value: options.density ?? 100, min: 70, max: 140, unit: "%", theme })}
      ${renderField("range", { label: "Mouvement", name: "presentation.options.motion", value: options.motion ?? 100, min: 0, max: 140, unit: "%", theme })}
      <button class="soft-button" type="button" data-reset-presentation>${icon("Undo2", 16)} Revenir à l’atmosphère</button>
    `, { state: Object.keys(options).length ? "Verrouillé" : "Hérité" })}
  </section>`;
}

function variantLabel(value) {
  return ({ gauge: "Jauge", bars: "Barres", radar: "Radar", donut: "Donut", spectre: "Spectre", cards: "Cartes", shelf: "Étagère", tiles: "Mosaïque", editorial: "Éditorial", network: "Réseau", space: "Espace 3D", compact: "Compact", manifesto: "Manifeste", horizontal: "Horizontal", vertical: "Vertical", path: "Parcours", gallery: "Galerie" })[value] || value;
}

function safeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;
}

function numberField(label, path, value, min, max, step) {
  return `<label class="kinetic-range"><span>${label}<output>${value}</output></span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-path="${path}"></label>`;
}

function listEditorShell(module, list, items = [], renderItem, { variants = [] } = {}) {
  return `<div class="save-state" data-save-state><i></i><span>Enregistré localement</span></div><section class="editor-section">
    <label class="field"><span>Titre</span><input data-path="title" value="${escapeAttribute(module.title)}"></label>
    ${variants.length ? `<div class="segmented">${variants.map((variant) => `<button type="button" data-choice-path="variant" data-value="${variant}" class="${module.variant === variant ? "is-active" : ""}">${variant}</button>`).join("")}</div>` : ""}
    <div class="structured-list">${items.map((item, index) => `<article class="structured-item" data-list-item data-list="${list}" data-index="${index}">
      <div class="structured-item__actions"><button type="button" data-list-move="-1" aria-label="Monter">${icon("ChevronUp", 15)}</button><button type="button" data-list-move="1" aria-label="Descendre">${icon("ChevronDown", 15)}</button><button type="button" data-list-remove aria-label="Supprimer">${icon("Trash2", 15)}</button></div>
      ${renderItem(item, index)}
    </article>`).join("")}</div>
    <button class="soft-button" type="button" data-list-add="${list}">${icon("Plus", 16)} Ajouter</button>
  </section>`;
}

function defaultListItem(list) {
  if (list === "entries") return { id: crypto.randomUUID(), prompt: "Si j’étais…", answer: "Une nouvelle réponse", note: "", visual: { kind: "emoji", value: "◇" } };
  if (list === "events") return { id: crypto.randomUUID(), year: "Aujourd’hui", title: "Nouveau moment", text: "", visual: { kind: "icon", name: "Milestone" } };
  return { id: crypto.randomUUID(), label: "Nouveau repère", value: "Une indication concrète.", visual: { kind: "icon", name: "Sparkles" } };
}

function bindAuthorRows(root, patch) {
  root.querySelector("[data-add-dimension]")?.addEventListener("click", () => patch((draft) => draft.data.dimensions.push({ id: crypto.randomUUID(), label: "Nouvelle dimension", color: "#74d8d1" }), true));
  root.querySelectorAll("[data-dimension]").forEach((row) => {
    const index = Number(row.dataset.dimension);
    row.querySelectorAll("[data-dimension-field]").forEach((input) => input.addEventListener("input", () => patch((draft) => { draft.data.dimensions[index][input.dataset.dimensionField] = input.value; })));
    row.querySelector("[data-remove-dimension]")?.addEventListener("click", () => patch((draft) => draft.data.dimensions.splice(index, 1), true));
  });
  root.querySelector("[data-add-question]")?.addEventListener("click", () => patch((draft) => draft.data.questions.push({
    id: crypto.randomUUID(), dimensionId: draft.data.dimensions[0]?.id || "", text: "Nouvelle question", min: 0, max: 5, weight: 1
  }), true));
  root.querySelectorAll("[data-author-question]").forEach((row) => {
    const index = Number(row.dataset.authorQuestion);
    row.querySelectorAll("[data-question-field]").forEach((input) => input.addEventListener("input", () => patch((draft) => {
      draft.data.questions[index][input.dataset.questionField] = input.type === "number" ? Number(input.value) : input.value;
    })));
    row.querySelector("[data-remove-question]")?.addEventListener("click", () => patch((draft) => draft.data.questions.splice(index, 1), true));
  });
  root.querySelectorAll("[data-feedback]").forEach((row) => {
    const index = Number(row.dataset.feedback);
    row.querySelectorAll("[data-feedback-field]").forEach((input) => input.addEventListener("input", () => patch((draft) => {
      draft.data.feedback[index][input.dataset.feedbackField] = input.type === "number" ? Number(input.value) : input.value;
    })));
  });
}
