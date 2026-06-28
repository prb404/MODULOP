import DOMPurify from "dompurify";
import { marked } from "marked";
import { gardnerDimensions, scoreGardner } from "../gardner.js";
import { renderField } from "../fields/index.js";
import { resolveEmbed } from "../core/embed-providers.js";
import { remoteResources } from "../core/remote-resources.js";
import { visualPreview } from "../ui/visual-picker.js";
import { feedbackFor, scoreAssessment } from "../core/assessments.js";
import { fontStack } from "../core/fonts.js";

const mounted = new Map();

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

function richText(module) {
  const options = module.presentation?.options || {};
  return `<div class="intro-content intro-content--${options.align || "left"} intro-content--${module.data.scale || "hero"}"
    style="--fragment-font:${fontStack(options.fontFamily || "newsreader", "system-serif")};--fragment-weight:${Number(options.fontWeight || 400)};--fragment-scale:${Number(options.fontScale || 100) / 100};--fragment-leading:${Number(options.lineHeight || 100) / 100};--fragment-measure:${Number(options.maxWidth || 1150)}px">
    <span class="eyebrow">${escapeHtml(module.data.eyebrow)}</span>
    <div class="markdown-content">${DOMPurify.sanitize(marked.parse(module.data.markdown || ""))}</div>
  </div>`;
}

function starter(module) {
  return `<div class="starter-pack starter-pack--${module.variant || "shelf"}">${(module.data.items || []).map((item, index) => `
    <button class="object-card" type="button" data-object-index="${index}">
      <span class="object-card__visual">${visualPreview(item.visualRef || item.asset || item.visual || "◇")}</span>
      <span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.note)}</small></span>
    </button>`).join("")}</div>`;
}

function constellation(module) {
  return `<div class="constellation-stage" data-constellation aria-label="Réseau d’intérêts interactif"></div>
    <ul class="sr-only">${(module.data.nodes || []).map((node) => `<li>${escapeHtml(node.label)}, importance ${node.weight} sur 100</li>`).join("")}</ul>`;
}

function portrait(module) {
  const entries = module.data.entries || [{ prompt: module.data.prompt, answer: module.data.answer, note: module.data.note, visual: module.data.visual }];
  return `<div class="portrait-answer portrait-answer--${escapeHtml(module.variant || "editorial")}">${entries.map((entry) => `<article>${entry.visual ? `<div class="portrait-visual">${visualPreview(entry.visual)}</div>` : ""}<span>${escapeHtml(entry.prompt)}</span><blockquote>${escapeHtml(entry.answer)}</blockquote><p>${escapeHtml(entry.note)}</p></article>`).join("")}</div>`;
}

function values(module) {
  return `<div class="value-pairs">${(module.data.pairs || []).map((pair) => `
    <div class="value-pair">
      <div><span>${escapeHtml(pair.left)}</span><span>${escapeHtml(pair.right)}</span></div>
      ${renderField("range", { label: `${pair.left} / ${pair.right}`, value: pair.value, theme: module.presentation?.themeId || "segmented", name: `pair-${pair.left}`, mode: "display" })}
    </div>`).join("")}</div>`;
}

function manual(module) {
  return `<div class="manual-list manual-list--${escapeHtml(module.variant || "notes")}">${(module.data.items || []).map((item, index) => `<article><span>${item.visual ? visualPreview(item.visual) : `0${index + 1}`}</span><div><small>${escapeHtml(item.label)}</small><p>${escapeHtml(item.value)}</p></div></article>`).join("")}</div>`;
}

function timeline(module) {
  return `<div class="timeline timeline--${escapeHtml(module.variant || "vertical")}">${(module.data.events || []).map((item) => `<article>${item.visual ? `<div>${visualPreview(item.visual)}</div>` : ""}<time>${escapeHtml(item.year || item.date)}</time><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></article>`).join("")}</div>`;
}

function efficacy(module) {
  const scores = scoreAssessment(module.data);
  const score = scores.length ? Math.round(scores.reduce((sum, item) => sum + item.value, 0) / scores.length) : 0;
  const top = [...scores].sort((a, b) => b.value - a.value).slice(0, 3);
  const variant = module.variant || "gauge";
  const chart = variant === "radar" ? assessmentRadar(scores)
    : variant === "donut" ? assessmentDonut(score)
      : variant === "bars" || variant === "spectre" ? assessmentBars(scores)
        : renderField("range", { label: "Score synthétique", value: score, theme: module.presentation?.themeId || "expressive", name: "efficacy", mode: "display" });
  return `<div class="efficacy efficacy--${escapeHtml(variant)}"><span class="eyebrow">${escapeHtml(module.data.title || "Questionnaire")}</span><strong>${score}</strong><p>${escapeHtml(feedbackFor(module.data, scores))}</p>${chart}<div class="assessment-mini">${top.map((item) => `<span style="--score-color:${item.color}">${escapeHtml(item.label)} <b>${item.value}</b></span>`).join("")}</div></div>`;
}

function assessmentBars(scores) {
  return `<div class="assessment-bars">${scores.slice(0, 8).map((item) => `<span style="--score-color:${item.color};--score:${item.value}%"><i></i><b>${escapeHtml(item.label)}</b><em>${item.value}</em></span>`).join("")}</div>`;
}

function assessmentDonut(score) {
  const radius = 42;
  const circumference = Math.PI * 2 * radius;
  const dash = circumference * score / 100;
  return `<svg class="assessment-donut" viewBox="0 0 120 120" role="img" aria-label="Score synthétique ${score} sur 100">
    <circle cx="60" cy="60" r="${radius}"></circle><circle cx="60" cy="60" r="${radius}" stroke-dasharray="${dash} ${circumference - dash}"></circle>
    <text x="60" y="66" text-anchor="middle">${score}</text>
  </svg>`;
}

function assessmentRadar(scores) {
  const values = scores.slice(0, 8);
  if (!values.length) return "";
  const center = 72;
  const radius = 54;
  const points = values.map((item, index) => {
    const angle = -Math.PI / 2 + index / values.length * Math.PI * 2;
    const length = radius * item.value / 100;
    return `${center + Math.cos(angle) * length},${center + Math.sin(angle) * length}`;
  }).join(" ");
  return `<svg class="assessment-radar" viewBox="0 0 144 144" role="img" aria-label="Radar des dimensions">
    <circle cx="${center}" cy="${center}" r="${radius}"></circle><circle cx="${center}" cy="${center}" r="${radius * .66}"></circle><circle cx="${center}" cy="${center}" r="${radius * .33}"></circle>
    <polygon points="${points}"></polygon>
    ${values.map((item, index) => {
      const angle = -Math.PI / 2 + index / values.length * Math.PI * 2;
      return `<text x="${center + Math.cos(angle) * (radius + 11)}" y="${center + Math.sin(angle) * (radius + 11)}">${escapeHtml(item.label.slice(0, 4))}</text>`;
    }).join("")}
  </svg>`;
}

function cognitive(module) {
  const scores = scoreAssessment(module.data);
  return `<div class="cognitive"><span class="eyebrow">${escapeHtml(module.data.title || "Défis cognitifs")}</span><div class="assessment-score-list">${scores.map((item) => `<span style="--score-color:${item.color}"><b>${item.value}</b>${escapeHtml(item.label)}</span>`).join("")}</div><p>${escapeHtml(feedbackFor(module.data, scores))}</p></div>`;
}

function gardner(module) {
  const scores = scoreGardner(module.data.responses).sort((a, b) => b.value - a.value);
  const top = scores.slice(0, 3);
  const spread = top[0].value - top[2].value;
  const feedback = spread <= 1
    ? `Votre profil se distingue par un équilibre rare entre ${top.map((item) => item.label.toLowerCase()).join(", ")}.`
    : `${top[0].label} donne actuellement l’impulsion principale, soutenue par ${top[1].label.toLowerCase()} et ${top[2].label.toLowerCase()}.`;
  return `<div class="gardner-summary">
    <div class="gardner-chart" data-gardner-chart aria-label="Cartographie des huit terrains de jeu"></div>
    <div class="gardner-copy"><span class="eyebrow">Cartographie personnelle</span><strong>${escapeHtml(top[0].label)}</strong><p>${escapeHtml(feedback)}</p>
      <div class="gardner-highlights">${top.map((item) => `<span style="--score-color:${item.color}">${escapeHtml(item.short)} <b>${item.value}/9</b></span>`).join("")}</div>
    </div></div>`;
}

function linkCard(module) {
  const url = safeHttps(module.data.url);
  const domain = url ? new URL(url).hostname : "Adresse non configurée";
  return `<a class="link-card link-card--${escapeHtml(module.variant || "editorial")}" href="${url || "#"}" ${url ? 'target="_blank" rel="noopener noreferrer"' : 'aria-disabled="true"'}>
    ${module.data.visual ? `<div class="link-card__visual">${visualPreview(module.data.visual)}</div>` : ""}
    <span class="eyebrow">${escapeHtml(domain)}</span>
    <strong>${escapeHtml(module.data.title || module.title)}</strong>
    <p>${escapeHtml(module.data.description || "Aperçu local personnalisable.")}</p>
    <span>Ouvrir la ressource →</span>
  </a>`;
}

function media(module) {
  const src = module.data.src || module.data.asset || "";
  if (!src) return `<div class="media-fragment media-fragment--empty"><span>${escapeHtml(module.data.title || module.title)}</span><strong>Image locale</strong><p>Collez ou déposez une image pour créer un fragment média.</p></div>`;
  return `<figure class="media-fragment media-fragment--${escapeHtml(module.variant || "poster")}">
    <div class="media-fragment__frame"><img src="${escapeHtml(src)}" alt="${escapeHtml(module.data.alt || module.data.title || "")}"></div>
    <figcaption><strong>${escapeHtml(module.data.title || module.title)}</strong>${module.data.caption ? `<span>${escapeHtml(module.data.caption)}</span>` : ""}</figcaption>
  </figure>`;
}

function embed(module) {
  const resolved = resolveEmbed(module.data.input || module.data.src);
  if (!resolved) return `<div class="remote-fallback"><strong>Intégration non reconnue</strong><p>Seules les URL HTTPS de fournisseurs autorisés sont acceptées.</p></div>`;
  const consent = remoteResources.status(resolved.src, "embed");
  if (consent !== "allowed") return `<div class="remote-fallback">
    <span class="eyebrow">${escapeHtml(resolved.domain)}</span>
    <strong>Contenu distant bloqué</strong>
    <p>Cette intégration peut contacter ${escapeHtml(resolved.domain)}. L’autorisation se règle dans le panneau de modification du fragment.</p>
    ${consent === "refused" ? "<small>Domaine refusé dans vos préférences locales.</small>" : `<button type="button" class="soft-button" data-action="allow-remote" data-url="${escapeHtml(resolved.src)}" data-resource-type="embed">Autoriser ${escapeHtml(resolved.domain)}</button>`}
  </div>`;
  return `<div class="embed-frame" style="--embed-ratio:${escapeHtml(module.data.ratio || "16/9")}">
    <iframe src="${escapeHtml(resolved.src)}" title="${escapeHtml(module.data.title || module.title)}" loading="lazy"
      sandbox="allow-scripts allow-same-origin allow-presentation" referrerpolicy="strict-origin-when-cross-origin"
      allow="fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>
  </div>`;
}

const definitions = {
  "rich-text": manifest("rich-text-editorial", "html", ["editorial", "compact", "manifesto"], richText, null, null, richTextSchema()),
  "starter-pack": manifest("starter-pack", "html", ["shelf", "tiles", "editorial"], starter, null, null, listSchema("items")),
  constellation: manifest("constellation-d3", "d3/three", ["network", "space"], constellation, mountConstellation, destroyMounted, { nodes: { type: "list", label: "Nœuds" }, links: { type: "list", label: "Relations" }, variant: { type: "variant", label: "Moteur" } }),
  "portrait-chinois": manifest("portrait-editorial", "html", ["editorial", "cards", "gallery"], portrait, null, null, listSchema("entries")),
  values: manifest("values-balance", "html", ["balance", "gauge", "radar"], values, null, null, listSchema("pairs")),
  manual: manifest("manual-notes", "html", ["notes", "cards", "path"], manual, null, null, listSchema("items")),
  timeline: manifest("timeline-editorial", "html", ["vertical", "horizontal", "cards"], timeline, null, null, listSchema("events")),
  "self-efficacy": manifest("efficacy-assessment", "html", ["gauge", "bars", "radar", "donut", "spectre"], efficacy, null, null, assessmentSchema()),
  "learner-efficacy": manifest("learner-efficacy-assessment", "html", ["gauge", "bars", "radar", "donut", "spectre"], efficacy, null, null, assessmentSchema()),
  "collective-efficacy": manifest("collective-efficacy-assessment", "html", ["cards", "bars", "radar", "donut", "spectre"], efficacy, null, null, assessmentSchema()),
  "collective-intelligence": manifest("collective-intelligence-assessment", "html", ["cards", "bars", "radar", "donut", "spectre"], efficacy, null, null, assessmentSchema()),
  "sic-compact": manifest("sic-compact-assessment", "html", ["cards", "bars", "radar", "donut", "spectre"], efficacy, null, null, assessmentSchema()),
  "sic-long": manifest("sicsia-long-assessment", "html", ["cards", "bars", "radar", "donut", "spectre"], efficacy, null, null, assessmentSchema()),
  tpack: manifest("tpack-assessment", "html", ["cards", "bars", "radar", "donut", "spectre"], efficacy, null, null, assessmentSchema()),
  personality: manifest("personality-assessment", "html", ["cards", "bars", "radar", "donut", "spectre"], efficacy, null, null, assessmentSchema()),
  cognitive: manifest("cognitive-assessment", "html", ["cards", "bars", "radar"], cognitive, null, null, assessmentSchema()),
  gardner: manifest("gardner-echarts", "echarts", ["radar", "bars", "orbit"], gardner, mountGardner, destroyMounted, assessmentSchema()),
  media: manifest("media-local", "html", ["poster", "full", "caption"], media, null, null, { variant: { type: "variant", label: "Composition" } }),
  "link-card": manifest("link-card", "html", ["compact", "editorial"], linkCard, null, null, { visual: { type: "visual", label: "Aperçu" }, variant: { type: "variant", label: "Composition" } }),
  embed: manifest("embed-safe", "iframe", ["responsive"], embed, null, null, { ratio: { type: "choice", label: "Ratio", options: ["16/9", "4/3", "1/1"] }, consent: { type: "remote-consent", label: "Domaine" } })
};

export function rendererFor(moduleOrType) {
  const type = typeof moduleOrType === "string" ? moduleOrType : moduleOrType.type;
  const requested = typeof moduleOrType === "object" ? moduleOrType.presentation?.rendererId : "";
  const definition = definitions[type];
  if (definition && (!requested || requested === definition.id || requested.endsWith("-default"))) return definition;
  return definition || manifest("unsupported", "html", [], () => "<p>Fragment non pris en charge.</p>");
}

export function renderModuleContent(module) {
  return rendererFor(module).render(module);
}

export async function mountModule(module, element) {
  await rendererFor(module).mount?.(module, element);
}

export function destroyModule(module, element) {
  rendererFor(module).destroy?.(module, element);
}

export function listRenderers() {
  return Object.entries(definitions).map(([type, definition]) => ({ type, ...definition }));
}

async function mountGardner(module, element) {
  const target = element.querySelector("[data-gardner-chart]");
  if (!target) return;
  const echarts = await import("echarts");
  const scores = scoreGardner(module.data.responses);
  const chart = echarts.init(target, null, { renderer: "canvas" });
  chart.setOption(gardnerOption(scores, module.variant, getComputedStyle(document.body)));
  chart.on("highlight", () => {});
  mounted.set(element, { destroy: () => chart.dispose(), resize: () => chart.resize() });
}

export function gardnerOption(scores, variant = "radar", styles = null) {
  const muted = styles?.getPropertyValue("--muted").trim() || "#92988b";
  const line = styles?.getPropertyValue("--line-strong").trim() || "#454a40";
  const tooltip = {
    trigger: "item",
    backgroundColor: "#171a15",
    borderColor: line,
    textStyle: { color: "#f5f2e9" },
    formatter: (params) => {
      if (variant === "radar") return scores.map((item) => `${item.label}: <b>${item.value}/9</b>`).join("<br>");
      return `${params.name || scores[params.dataIndex]?.label}: <b>${params.value}/9</b>`;
    }
  };
  if (variant === "bars") return {
    animationDuration: 600, tooltip,
    grid: { left: 4, right: 12, top: 8, bottom: 8, containLabel: true },
    xAxis: { max: 9, show: false },
    yAxis: { type: "category", inverse: true, data: scores.map((item) => item.short), axisLabel: { color: muted }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{ type: "bar", data: scores.map((item) => ({ name: item.label, value: item.value, itemStyle: { color: item.color, borderRadius: 8 } })), showBackground: true, backgroundStyle: { color: line, borderRadius: 8 } }]
  };
  if (variant === "orbit") return {
    animationDuration: 700, tooltip,
    series: [{ type: "pie", radius: ["25%", "78%"], roseType: "radius", label: { show: false }, itemStyle: { borderWidth: 3, borderColor: "transparent", borderRadius: 9 }, data: scores.map((item) => ({ name: item.label, value: Math.max(.5, item.value), itemStyle: { color: item.color } })) }]
  };
  return {
    animationDuration: 650, tooltip,
    radar: {
      radius: "68%", splitNumber: 3,
      indicator: scores.map((item) => ({ name: item.short, max: 9 })),
      axisName: { color: muted, fontSize: 10 },
      splitArea: { areaStyle: { color: ["transparent"] } },
      splitLine: { lineStyle: { color: line } },
      axisLine: { lineStyle: { color: line } }
    },
    series: [{ type: "radar", symbol: "circle", symbolSize: 5, lineStyle: { color: "#71d7d1", width: 2 }, itemStyle: { color: "#f07b52" }, areaStyle: { color: "rgba(113,215,209,.22)" }, data: [{ value: scores.map((item) => item.value) }] }]
  };
}

async function mountConstellation(module, element) {
  const target = element.querySelector("[data-constellation]");
  if (!target) return;
  if (module.variant === "space") return mountThree(module, element, target);
  const d3 = await import("d3");
  const width = Math.max(280, target.clientWidth);
  const height = Math.max(300, target.clientHeight);
  const nodes = structuredClone(module.data.nodes || []);
  const links = structuredClone(module.data.links?.length ? module.data.links : nodes.slice(1).map((node) => ({ source: nodes[0].id, target: node.id })));
  const svg = d3.select(target).append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("role", "img");
  const link = svg.append("g").selectAll("line").data(links).join("line").attr("class", "constellation-link");
  const node = svg.append("g").selectAll("g").data(nodes).join("g").attr("tabindex", 0).attr("role", "button").attr("aria-label", (item) => `${item.label}, importance ${item.weight} sur 100`);
  node.append("circle").attr("r", (item) => 10 + item.weight / 8).attr("class", (item) => item.category === "core" ? "is-core" : "");
  node.append("text").text((item) => item.label).attr("text-anchor", "middle").attr("dy", 4);
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id((item) => item.id).distance(100))
    .force("charge", d3.forceManyBody().strength(-240))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide().radius((item) => 34 + item.weight / 8))
    .on("tick", () => {
      link.attr("x1", (item) => item.source.x).attr("y1", (item) => item.source.y).attr("x2", (item) => item.target.x).attr("y2", (item) => item.target.y);
      node.attr("transform", (item) => `translate(${item.x},${item.y})`);
    });
  node.call(d3.drag().on("start", (event, item) => { if (!event.active) simulation.alphaTarget(.3).restart(); item.fx = item.x; item.fy = item.y; })
    .on("drag", (event, item) => { item.fx = event.x; item.fy = event.y; })
    .on("end", (event, item) => { if (!event.active) simulation.alphaTarget(0); item.fx = null; item.fy = null; }));
  mounted.set(element, { destroy: () => simulation.stop() });
}

async function mountThree(module, element, target) {
  const THREE = await import("three");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, target.clientWidth / target.clientHeight, .1, 100);
  camera.position.z = 8;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(target.clientWidth, target.clientHeight);
  target.append(renderer.domElement);
  const group = new THREE.Group();
  scene.add(group);
  (module.data.nodes || []).forEach((node, index) => {
    const material = new THREE.MeshBasicMaterial({ color: index ? 0x74d8d1 : 0xe46f42, wireframe: index !== 0 });
    const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(index ? .25 + node.weight / 350 : .65, 2), material);
    const angle = index / Math.max(1, module.data.nodes.length - 1) * Math.PI * 2;
    sphere.position.set(index ? Math.cos(angle) * 2.6 : 0, index ? Math.sin(angle) * 2.1 : 0, index ? Math.sin(angle * 2) : 0);
    group.add(sphere);
  });
  let frame;
  const animate = () => { group.rotation.y += .0025; renderer.render(scene, camera); frame = requestAnimationFrame(animate); };
  animate();
  mounted.set(element, { destroy: () => { cancelAnimationFrame(frame); renderer.dispose(); } });
}

function destroyMounted(module, element) {
  mounted.get(element)?.destroy?.();
  mounted.delete(element);
}

function manifest(id, engine, variants, render, mount, destroy, optionsSchema = {}) {
  return {
    id, engine, variants, optionsSchema,
    editableFields: Object.keys(optionsSchema || {}),
    displayMode: "read",
    controlCapabilities: inferControlCapabilities(optionsSchema),
    sourceCredits: [],
    render, mount, update: null, destroy,
    loadingStrategy: mount ? "engine" : "reveal",
    captureMode: "clean",
    accessibleFallback: true
  };
}

function inferControlCapabilities(schema = {}) {
  const values = Object.values(schema);
  const usesRange = values.some((definition) => definition.type === "range" || definition.type === "multiRange");
  return { rangeTheme: usesRange };
}

function richTextSchema() {
  return {
    fontFamily: { type: "font", label: "Police" },
    fontWeight: { type: "range", label: "Graisse", min: 200, max: 900, step: 50 },
    fontScale: { type: "range", label: "Échelle", min: 70, max: 160, step: 5 },
    lineHeight: { type: "range", label: "Interligne", min: 80, max: 180, step: 5 },
    maxWidth: { type: "range", label: "Largeur de lecture", min: 420, max: 1500, step: 10 },
    align: { type: "choice", label: "Composition", options: ["left", "center", "right"] }
  };
}

function listSchema(name) {
  return { [name]: { type: "list", label: "Éléments" }, variant: { type: "variant", label: "Composition" } };
}

function assessmentSchema() {
  return { dimensions: { type: "list", label: "Dimensions" }, questions: { type: "list", label: "Questions" }, feedback: { type: "list", label: "Restitutions" } };
}

function safeHttps(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

export { escapeHtml, gardnerDimensions };
