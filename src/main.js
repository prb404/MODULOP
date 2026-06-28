import "gridstack/dist/gridstack.min.css";
import "./styles.css";
import { createModule, generateProfileName, moduleCatalog } from "./core/profile.js";
import { ProfileStore, db, normalizeProfile, resolveAsset, saveAsset } from "./core/store.js";
import { exportFragmentPackage, exportJsonProfile, exportZipProfile, importFragmentPackage, importProfile } from "./core/portable.js";
import { classifyFileInput, classifyTextInput, createMediaModule, createModuleFromTextClassification } from "./core/ingest.js";
import { renderModuleContent, mountModule, destroyModule, escapeHtml } from "./renderers/index.js";
import { editorBody, mountEditor, destroyEditor, assessmentBody, mountAssessment, appearanceBody, mountAppearanceEditor } from "./editors/index.js";
import { icon, iconButton } from "./ui/icons.js";
import { bindTooltips } from "./ui/tooltip.js";
import { PanelManager } from "./ui/panel-manager.js";
import { confirmAt } from "./ui/confirm.js";
import { activateCustomAtmosphere, activeAtmosphere, applyAtmosphere, contrastRatio, createDefaultAtmospheres } from "./core/atmospheres.js";
import { listFonts, loadFonts } from "./core/fonts.js";
import { GridStackManager } from "./ui/gridstack-manager.js";
import { overlays } from "./ui/overlay-manager.js";
import { remoteResources } from "./core/remote-resources.js";
import { visualPickerField, bindVisualPickers, visualPreview } from "./ui/visual-picker.js";
import { ControlRegistry, choiceCards, consentControl, disclosure, switchControl } from "./ui/controls.js";
import { renderField } from "./fields/index.js";
import { MorphologyEngine, lockMorphologySection } from "./core/morphology.js";
import { creditsMarkdown } from "./core/component-sources.js";
import { initialsAvatar } from "./core/visuals.js";
import { appVersion } from "./core/version.js";
import { RealtimeController, realtimeBadge, realtimePanelBody } from "./realtime/controller.js";
import DOMPurify from "dompurify";
import { marked } from "marked";

const appRoot = document.querySelector("#app");
const store = new ProfileStore();
const morphologyEngine = new MorphologyEngine();

class ModulopApp {
  constructor(root, state) {
    this.root = root;
    this.store = state;
    this.panel = null;
    this.selectedId = null;
    this.menuFor = null;
    this.toastTimer = null;
    this.renderedModules = new Map();
    this.panelManager = null;
    this.gridManager = null;
    this.pendingInsertion = null;
    this.insertionModeId = null;
    this.longPressTimer = null;
    this.longPressOrigin = null;
    this.suppressActivationClickId = null;
    this.menuCleanup = null;
    this.hasHydratedGrid = false;
    this.identityEditing = false;
    this.realtime = new RealtimeController({
      getProfile: () => this.store.profile,
      importModule: (module, message) => this.insertModule(module, message),
      persistTrace: (kind, detail) => this.persistRealtimeTrace(kind, detail),
      announce: (message) => this.announce(message)
    });
    this.realtimeState = this.realtime.snapshot();
    const params = new URLSearchParams(location.search);
    this.homeVisible = params.has("home") || (!params.has("template") && !params.has("profile"));
    this.consentFilter = "active";
    this.lastScrollY = 0;
    this.resizeTimer = null;
    this.dragDepth = 0;
    this.homeIntent = "";
    this.store.addEventListener("status", (event) => this.updateSaveState(event.detail));
    this.store.addEventListener("change", () => this.realtime.syncProfile());
    this.realtime.addEventListener("change", (event) => {
      this.realtimeState = event.detail;
      this.renderRealtimeSurfaces();
      if (this.panel === "live") this.renderPanel();
    });
  }

  async init() {
    this.root.innerHTML = `
      <div class="grain" aria-hidden="true"></div>
      <header class="profile-header" data-profile-header>
        <button class="profile-header__identity" type="button" data-action="open-menu" aria-label="Modifier l’identité du profil">
          <span class="profile-avatar" data-profile-avatar></span>
          <strong data-profile-name></strong>
        </button>
        <button class="profile-header__live" type="button" data-action="open-live" data-live-badge aria-label="Ouvrir les présences"></button>
        <button class="profile-header__menu" type="button" data-action="open-menu" data-tooltip="Ouvrir le menu" aria-label="Ouvrir le menu">${icon("Menu")}</button>
      </header>
      <main class="workspace">
        <section class="welcome-screen" data-home hidden></section>
        <section class="workspace-presence-strip" data-presence-strip hidden></section>
        <section class="blank-workspace" data-blank-workspace hidden></section>
        <section class="module-grid" id="module-grid"></section>
        <button class="workspace-add-fragment" type="button" data-action="open-library" data-workspace-add hidden>${icon("Plus", 18)}<span>Ajouter un fragment</span></button>
      </main>
      <footer class="footer"><span>MODULOP ${appVersion.display}</span><button type="button" data-action="open-about">À propos</button></footer>
      <nav class="mobile-tabbar" aria-label="Navigation mobile">
        <button type="button" data-action="show-home">${icon("Compass", 19)}<span>Explorer</span></button>
        <button type="button" data-action="open-library">${icon("LayoutGrid", 19)}<span>Fragments</span></button>
        <button type="button" data-action="open-live">${icon("Share2", 19)}<span>Partager</span></button>
      </nav>
      <div id="panel-host"></div>
      <div id="global-tooltip" class="tooltip" role="tooltip" hidden></div>
      <div class="toast" role="status" aria-live="polite"></div>
      <div class="drop-overlay" data-drop-overlay hidden><div>${icon("FileArchive", 34)}<strong>Déposez un contenu</strong><span>Image, texte, URL, .json, .zip, .modulop.zip ou fragment autonome</span></div></div>
      <div class="sr-only" data-grid-announcer aria-live="assertive"></div>
      <input id="import-input" type="file" accept=".json,.zip,.modulop.zip,.modulop-fragment.zip,application/json,application/zip" hidden>`;
    this.panelManager = new PanelManager({
      host: this.root.querySelector("#panel-host"),
      getPreferences: (type) => this.store.profile.uiPreferences.panels[type] || {},
      savePreferences: (type, values, rerender = true) => {
        this.store.mutate((profile) => Object.assign(profile.uiPreferences.panels[type] ||= {}, values), { history: false });
        if (rerender) this.renderPanel();
      },
      onClose: () => this.closePanel()
    });
    this.bindGlobal();
    this.bindStickyHeader();
    await this.realtime.init();
    this.gridManager = new GridStackManager({
      element: this.root.querySelector("#module-grid"),
      onLayout: (layouts) => this.saveGridLayout(layouts),
      announce: (message) => this.announce(message)
    });
    await this.gridManager.init();
    await this.applyTemplateFromUrl();
    await this.renderWorkspace();
    this.renderRealtimeSurfaces();
  }

  async applyTemplateFromUrl() {
    const params = new URLSearchParams(location.search);
    const template = params.get("template");
    const profileId = params.get("profile");
    if (profileId) {
      await this.store.openSpace(profileId);
      this.resetRenderedGrid();
    } else if (template) {
      await this.store.createSpace(template);
      this.resetRenderedGrid();
    }
  }

  bindGlobal() {
    this.root.addEventListener("click", (event) => this.handleAction(event));
    this.root.addEventListener("click", (event) => this.handleModuleActivation(event));
    this.root.addEventListener("dblclick", (event) => this.handlePrimaryDoubleClick(event));
    this.root.addEventListener("pointerdown", (event) => this.beginLongPress(event));
    this.root.addEventListener("pointermove", (event) => this.trackLongPress(event));
    this.root.addEventListener("pointerup", () => this.cancelLongPress());
    this.root.addEventListener("pointercancel", () => this.cancelLongPress());
    this.root.querySelector("#import-input").addEventListener("change", (event) => this.handleImport(event));
    this.bindGlobalDrop();
    window.addEventListener("resize", () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.syncResponsiveLayout(), 120);
    }, { passive: true });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && event.target.matches?.(".module") && !event.target.closest("button,a,input,textarea,select,[contenteditable]")) {
        event.preventDefault();
        this.setInsertionMode(event.target.dataset.moduleId);
      }
      if (event.key === "Escape" && this.insertionModeId) {
        event.preventDefault();
        this.setInsertionMode(null);
      }
      if (event.key === "Escape" && this.menuFor) {
        this.menuFor = null;
        this.syncOverflowMenus();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.shiftKey ? this.store.redo() : this.store.undo();
        this.renderWorkspace();
      }
    });
    document.addEventListener("pointerdown", (event) => {
      if (!this.menuFor || event.target.closest(".module-overflow, [data-action='module-menu']")) return;
      this.menuFor = null;
      this.syncOverflowMenus();
    }, true);
    document.addEventListener("paste", (event) => this.handlePaste(event));
  }

  bindGlobalDrop() {
    const overlay = () => this.root.querySelector("[data-drop-overlay]");
    const valid = (event) => Array.from(event.dataTransfer?.items || []).some((item) => item.kind === "file" || item.kind === "string");
    window.addEventListener("dragenter", (event) => {
      if (!valid(event)) return;
      this.dragDepth += 1;
      overlay().hidden = false;
    });
    window.addEventListener("dragover", (event) => {
      if (!valid(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    });
    window.addEventListener("dragleave", () => {
      this.dragDepth = Math.max(0, this.dragDepth - 1);
      if (!this.dragDepth) overlay().hidden = true;
    });
    window.addEventListener("drop", async (event) => {
      const files = Array.from(event.dataTransfer?.files || []);
      const text = event.dataTransfer?.getData("text/plain") || event.dataTransfer?.getData("text/uri-list") || "";
      if (!files.length && !text.trim()) return;
      event.preventDefault();
      this.dragDepth = 0;
      overlay().hidden = true;
      await this.ingestDroppedContent({ files, text, anchor: overlay() });
    });
  }

  bindStickyHeader() {
    const sync = () => {
      const atmosphere = activeAtmosphere(this.store.profile);
      const mode = atmosphere?.header?.mode || "reveal";
      const y = window.scrollY;
      const expanded = mode === "always" || (mode === "reveal" && y > 120);
      const header = this.root.querySelector("[data-profile-header]");
      header?.classList.toggle("is-expanded", expanded);
      header?.classList.toggle("is-compact", !expanded);
      this.lastScrollY = y;
    };
    window.addEventListener("scroll", sync, { passive: true });
    sync();
  }

  handleModuleActivation(event) {
    if (event.target.closest("[data-action],a,button,input,textarea,select,[contenteditable],.ui-resizable-handle")) return;
    const module = event.target.closest(".module");
    if (module) {
      if (this.suppressActivationClickId === module.dataset.moduleId) {
        this.suppressActivationClickId = null;
        return;
      }
      this.setInsertionMode(module.dataset.moduleId);
      return;
    }
    if (!event.target.closest(".grid-insertions")) this.setInsertionMode(null);
  }

  beginLongPress(event) {
    if (event.pointerType === "mouse" || event.target.closest("[data-action],a,button,input,textarea,select,[contenteditable],.ui-resizable-handle")) return;
    const module = event.target.closest(".module");
    if (!module) return;
    this.cancelLongPress();
    this.longPressOrigin = { x: event.clientX, y: event.clientY };
    this.longPressTimer = setTimeout(() => {
      this.suppressActivationClickId = module.dataset.moduleId;
      this.setInsertionMode(module.dataset.moduleId);
      navigator.vibrate?.(12);
      this.longPressTimer = null;
    }, 460);
  }

  trackLongPress(event) {
    if (!this.longPressTimer || !this.longPressOrigin) return;
    if (Math.hypot(event.clientX - this.longPressOrigin.x, event.clientY - this.longPressOrigin.y) > 10) this.cancelLongPress();
  }

  cancelLongPress() {
    clearTimeout(this.longPressTimer);
    this.longPressTimer = null;
    this.longPressOrigin = null;
  }

  setInsertionMode(id) {
    const next = id && this.insertionModeId !== id ? id : null;
    this.insertionModeId = next;
    this.realtime.setSelectedModule(next);
    for (const [moduleId, record] of this.renderedModules) {
      const active = moduleId === next;
      record.widget.classList.toggle("is-insertion-active", active);
      record.element.setAttribute("aria-expanded", String(active));
    }
    if (next) this.announce("Mode ajout activé. Choisissez une direction autour du fragment.");
  }

  syncResponsiveLayout() {
    for (const module of this.store.profile.modules) {
      this.gridManager?.updateWidget(this.renderedModules.get(module.id)?.widget, module.layout);
    }
  }

  async renderWorkspace() {
    await applyAtmosphere(this.store.profile);
    await this.renderHome();
    this.renderBlankWorkspace();
    const identity = this.store.profile.identity;
    this.root.querySelector("[data-profile-name]").textContent = identity.name;
    this.root.querySelector("[data-profile-avatar]").innerHTML = visualPreview(identity.avatar);
    await this.resolveAssets(this.root.querySelector("[data-profile-avatar]"));
    const grid = this.root.querySelector("#module-grid");
    for (const [id, record] of this.renderedModules) {
      const next = this.store.profile.modules.find((item) => item.id === id);
      if (!next) {
        destroyModule(record.module, record.element);
        this.gridManager.removeWidget(record.widget);
        this.renderedModules.delete(id);
      }
    }
    if (!this.homeVisible && this.store.profile.modules.length) {
      this.gridManager.beginBatch();
      for (const module of this.store.profile.modules) await this.upsertModule(module, grid);
      this.gridManager.endBatch();
      this.hasHydratedGrid = true;
    }
    const workspaceAdd = this.root.querySelector("[data-workspace-add]");
    if (workspaceAdd) workspaceAdd.hidden = this.homeVisible || !this.store.profile.modules.length;
    this.bindContentInteractions();
    bindTooltips(this.root);
    this.renderRealtimeSurfaces();
  }

  async renderHome() {
    const home = this.root.querySelector("[data-home]");
    const grid = this.root.querySelector("#module-grid");
    if (!home) return;
    home.hidden = !this.homeVisible;
    grid.hidden = this.homeVisible || !this.store.profile.modules?.length;
    if (!this.homeVisible) return;
    const spaces = await this.store.profiles();
    home.innerHTML = `<section class="welcome-hero welcome-hero--compact welcome-hero--immersive">
      <h1>Vos espaces modulaires.</h1>
      <p>Ouvrez un espace, importez un paquet ou démarrez depuis un modèle. Chaque espace reste local, transportable et recomposable fragment par fragment.</p>
      <div class="welcome-intake welcome-intake--minimal">
        <button type="button" data-action="paste-clipboard">${icon("ClipboardPaste", 17)} Coller</button>
        <button type="button" data-action="import">${icon("FileUp", 17)} Importer</button>
        <button type="button" data-action="open-library">${icon("Plus", 17)} Bibliothèque</button>
      </div>
    </section>
    <section class="welcome-section welcome-section--spaces">
      <h2>Espaces locaux</h2>
      <div class="space-list">${spaces.map((space) => renderSpaceCard(space)).join("") || `<p class="empty-spaces">Aucun espace local pour le moment.</p>`}</div>
    </section>
    <section class="welcome-import" data-action="import">
      <span>${icon("FileUp", 24)}</span><strong>Importer un profil, paquet ou fragment</strong><small>Glissez-déposez un .json, .zip, .modulop.zip ou .modulop-fragment.zip, ou cliquez pour sélectionner un fichier.</small>
    </section>
    <section class="welcome-section">
      <h2>Nouveau départ</h2>
      <div class="template-grid">${profileTemplates().map((template) => `<button type="button" data-action="create-space" data-template="${template.id}">
        <span>${icon(template.icon, 20)}</span><strong>${template.label}</strong><small>${template.description}</small>
      </button>`).join("")}</div>
    </section>`;
    await this.resolveAssets(home);
  }

  renderBlankWorkspace() {
    const blank = this.root.querySelector("[data-blank-workspace]");
    const grid = this.root.querySelector("#module-grid");
    if (!blank) return;
    const visible = !this.homeVisible && !this.store.profile.modules?.length;
    blank.hidden = !visible;
    if (grid) grid.hidden = this.homeVisible || visible;
    if (!visible) return;
    blank.innerHTML = `<div class="blank-workspace__drop">
      <span>${icon("Sparkles", 34)}</span>
      <strong>Espace vierge</strong>
      <p>Déposez une image, collez une URL, importez un fragment autonome ou ouvrez la bibliothèque. Le premier contenu devient le premier fragment de la grille.</p>
      <div class="blank-workspace__actions">
        <button type="button" data-action="paste-clipboard">${icon("ClipboardPaste", 17)} Coller</button>
        <button type="button" data-action="import">${icon("FileUp", 17)} Importer</button>
        <button type="button" data-action="open-library">${icon("Plus", 17)} Bibliothèque</button>
      </div>
    </div>`;
  }

  async upsertModule(module, grid) {
    const old = this.renderedModules.get(module.id);
    if (old) destroyModule(old.module, old.element);
    const element = old?.element || document.createElement("article");
    const widget = old?.widget || document.createElement("div");
    if (!old) {
      widget.className = "grid-stack-item";
      widget.dataset.moduleId = module.id;
      widget.dataset.moduleType = module.type;
      const content = document.createElement("div");
      content.className = "grid-stack-item-content";
      content.append(element);
      widget.append(content);
      widget.append(createInsertionControls(module));
      this.gridManager.addWidget(widget, module.layout);
    }
    element.className = `module module--${module.type}`;
    element.dataset.moduleId = module.id;
    element.tabIndex = 0;
    applyModulePresentation(element, module.presentation?.options || {});
    const definition = moduleCatalog.find((item) => item.type === module.type);
    const quickActions = moduleQuickActions(module, this.store.profile.uiPreferences?.moduleActions?.visibleShortcuts ?? 1);
    element.innerHTML = `
      ${module.type === "rich-text" ? "" : `<header class="module__header" title="Maintenir et déplacer"><span>${icon(definition?.icon || "Box", 16)}</span><h2>${escapeHtml(module.title)}</h2></header>`}
      <div class="module__content">${renderModuleContent(module)}</div>
      <div class="module-tools" aria-label="Actions pour ${escapeHtml(module.title)}">
        ${quickActions.map((action) => iconButton({ ...action, id: module.id })).join("")}
        ${iconButton({ icon: "Ellipsis", label: "Plus d’actions", action: "module-menu", id: module.id })}
        <div class="module-overflow" data-menu-for="${module.id}" hidden>
          ${isAssessmentModule(module) ? `<button type="button" data-action="take-assessment" data-id="${module.id}">${icon("ListChecks", 16)} Passer</button>` : ""}
          <button type="button" data-action="edit-module" data-id="${module.id}">${icon("FilePenLine", 16)} Modifier le contenu</button>
          <button type="button" data-action="customize-module" data-id="${module.id}">${icon("Palette", 16)} Personnaliser le rendu</button>
          <button type="button" data-action="copy-module" data-id="${module.id}">${icon("Copy", 16)} Copier comme image</button>
          <button type="button" data-action="export-fragment" data-id="${module.id}">${icon("PackageOpen", 16)} Exporter le fragment</button>
          <button type="button" data-action="unlock-module" data-id="${module.id}">${icon("Unlock", 16)} Déverrouiller</button>
          <button type="button" data-action="delete-module" data-id="${module.id}">${icon("Trash2", 16)} Supprimer</button>
        </div>
      </div>
      </div>`;
    const insertions = widget.querySelector(".grid-insertions");
    insertions?.setAttribute("aria-label", `Ajouter près de ${module.title}`);
    this.renderedModules.set(module.id, { module: structuredClone(module), element, widget });
    element.dataset.loadState = "loading";
    setModuleProgress(element, 12);
    try {
      await nextFrame();
      setModuleProgress(element, 42);
      await mountModule(module, element);
      setModuleProgress(element, 78);
      await this.resolveAssets(element);
      requestAnimationFrame(() => {
        setModuleProgress(element, 100);
        element.dataset.loadState = "ready";
      });
    } catch (error) {
      console.error(`Échec du renderer ${module.type}`, error);
      element.dataset.loadState = "error";
      element.querySelector(".module__content")?.insertAdjacentHTML("beforeend", `<div class="module-error">Le moteur n’a pas pu terminer le rendu.</div>`);
    }
  }

  async resolveAssets(root) {
    const placeholders = [...root.querySelectorAll("[data-asset]")].map(async (target) => {
      const url = await resolveAsset(target.dataset.asset);
      if (url) target.innerHTML = `<img src="${url}" alt="">`;
    });
    const markdownImages = [...root.querySelectorAll('img[src^="asset://"]')].map(async (image) => {
      const url = await resolveAsset(image.getAttribute("src"));
      if (url) image.src = url;
    });
    await Promise.all([...placeholders, ...markdownImages]);
  }

  async patchModule(id, mutator, rerenderPanel = false) {
    this.store.mutate((profile) => {
      const module = profile.modules.find((item) => item.id === id);
      if (module) {
        const presentationBefore = JSON.stringify(module.presentation);
        const variantBefore = module.variant;
        mutator(module);
        if (presentationBefore !== JSON.stringify(module.presentation)) lockMorphologySection(profile, id, "presentation");
        if (variantBefore !== module.variant) lockMorphologySection(profile, id, "variant");
      }
    });
    const module = this.store.profile.modules.find((item) => item.id === id);
    if (module) {
      await loadFonts([module.presentation?.options?.fontFamily].filter(Boolean));
      await this.upsertModule(module, this.root.querySelector("#module-grid"));
    }
    if (rerenderPanel) this.renderPanel();
    this.updateSaveState("saving");
  }

  async handleAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === "open-menu") this.openPanel("menu");
    if (action === "open-live") this.openPanel("live");
    if (action === "open-about") this.openPanel("about");
    if (action === "open-consents") {
      this.consentFilter = button.dataset.filter || this.consentFilter || "active";
      this.openPanel("consents");
    }
    if (action === "show-home") {
      this.homeVisible = true;
      this.closePanel();
      await this.renderWorkspace();
      history.pushState(null, "", `${location.pathname}?home=1`);
    }
    if (action === "create-space") {
      const profile = await this.store.createSpace(button.dataset.template || "blank");
      this.homeVisible = false;
      this.resetRenderedGrid();
      await this.renderWorkspace();
      history.pushState(null, "", `${location.pathname}?profile=${encodeURIComponent(profile.id)}`);
      this.announce("Nouvel espace créé");
    }
    if (action === "paste-clipboard") await this.pasteFromClipboard(button);
    if (action === "create-intent") {
      const value = this.currentIntentValue();
      if (!value) {
        this.announce("Écrivez une intention à transformer en fragment");
        return;
      }
      await this.ingestText(value, { message: "Intention transformée en fragment" });
    }
    if (action === "open-space") {
      const profile = await this.store.openSpace(button.dataset.profileId);
      this.homeVisible = false;
      this.resetRenderedGrid();
      await this.renderWorkspace();
      if (profile) history.pushState(null, "", `${location.pathname}?profile=${encodeURIComponent(profile.id)}`);
    }
    if (action === "rename-space") await this.renameSpace(button, button.dataset.profileId);
    if (action === "export-space-json") await this.exportSpace(button.dataset.profileId, "json");
    if (action === "export-space-zip") await this.exportSpace(button.dataset.profileId, "zip");
    if (action === "delete-space") await this.deleteSpace(button, button.dataset.profileId);
    if (action === "open-library") {
      this.pendingInsertion = button.dataset.anchorId
        ? { anchorId: button.dataset.anchorId, direction: button.dataset.direction || "after" }
        : null;
      this.setInsertionMode(null);
      this.openPanel("library");
      requestAnimationFrame(() => this.root.querySelector(".catalog-search input")?.focus());
    }
    if (action === "edit-module") {
      this.selectedId = id;
      this.openPanel("editor");
    }
    if (action === "take-assessment") {
      this.selectedId = id;
      this.openPanel("assessment");
    }
    if (action === "customize-module") {
      this.selectedId = id;
      this.openPanel("appearance");
    }
    if (action === "module-menu") {
      event.preventDefault();
      event.stopPropagation();
      this.menuFor = this.menuFor === id ? null : id;
      this.syncOverflowMenus();
    }
    if (action === "copy-module") await this.copyModule(button, id);
    if (action === "export-fragment") await this.exportFragment(button, id);
    if (action === "delete-module") {
      event.preventDefault();
      event.stopPropagation();
      await this.deleteModule(button, id);
    }
    if (action === "surprise-module") await this.surpriseModule(button, id);
    if (action === "unlock-module") {
      this.store.mutate((profile) => { profile.morphology.locks.modules[id] = {}; }, { immediate: true });
      this.renderPanel();
      this.announce("Personnalisation du fragment déverrouillée");
    }
    if (action === "add-module") {
      const created = createModule(button.dataset.type);
      await this.insertModule(created, "Fragment ajouté");
    }
    if (action === "duplicate-neighbor") {
      const source = this.store.profile.modules.find((item) => item.id === button.dataset.sourceId);
      if (source) await this.insertModule(duplicateModule(source, this.effectiveLayout(source)), `${source.title} dupliqué`);
    }
    if (action === "set-atmosphere") {
      this.store.mutate((profile) => { profile.activeAtmosphereId = button.dataset.atmosphere; });
      await this.renderWorkspace();
      this.renderPanel();
    }
    if (action === "open-atmosphere") this.openPanel("atmosphere");
    if (action === "reset-atmosphere") await this.resetAtmosphere(button);
    if (action === "regenerate-name") {
      this.store.mutate((profile) => {
        profile.identity.name = generateProfileName();
        profile.identity.source = "generated";
        if (profile.identity.avatar?.kind === "initials") profile.identity.avatar = initialsAvatar(profile.identity.name, crypto.randomUUID());
      });
      await this.renderWorkspace();
      this.renderPanel();
    }
    if (action === "regenerate-avatar") {
      this.store.mutate((profile) => { profile.identity.avatar = initialsAvatar(profile.identity.name, crypto.randomUUID()); }, { immediate: true });
      await this.renderWorkspace();
      this.renderPanel();
    }
    if (action === "edit-identity") {
      this.identityEditing = true;
      this.renderPanel();
    }
    if (action === "cancel-identity") {
      this.identityEditing = false;
      this.renderPanel();
    }
    if (action === "save-identity") {
      const input = this.root.querySelector("[data-identity-name]");
      const name = input?.value.trim();
      if (name) this.store.mutate((profile) => {
        profile.identity.name = name;
        profile.identity.source = "custom";
      }, { immediate: true });
      this.identityEditing = false;
      await this.renderWorkspace();
      this.renderPanel();
    }
    if (action === "export-json") this.announce(await exportJsonProfile(this.store.profile));
    if (action === "export-zip") this.announce(await exportZipProfile(this.store.profile));
    if (action === "export-pdf") this.exportPdf();
    if (action === "import") this.root.querySelector("#import-input").click();
    if (action === "live-join") await this.realtime.connect(this.root.querySelector("[data-live-room]")?.value);
    if (action === "live-private-room") {
      await this.realtime.createPrivateRoom();
      this.renderPanel();
    }
    if (action === "live-copy-invite") await this.realtime.copyInviteLink();
    if (action === "live-ping") await this.realtime.sendPing(`Ping ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`);
    if (action === "live-offer-fragment") await this.realtime.offerModule(this.store.profile.modules.find((item) => item.id === id));
    if (action === "live-accept-offer") await this.realtime.acceptOffer(button.dataset.offerId);
    if (action === "live-decline-offer") await this.realtime.declineOffer(button.dataset.offerId);
    if (action === "live-import-received") await this.realtime.importReceived(button.dataset.offerId);
    if (action === "live-discard-received") this.realtime.discardReceived(button.dataset.offerId);
    if (action === "live-block-peer") this.realtime.blockPeer(button.dataset.peerId);
    if (action === "live-unblock-peer") this.realtime.unblockPeer(button.dataset.peerId);
    if (action === "live-react") await this.realtime.toggleReaction({
      moduleId: button.dataset.moduleId,
      targetId: button.dataset.targetId,
      emoji: button.dataset.emoji,
      annotation: button.dataset.annotation
    });
    if (action === "reset-profile") await this.resetProfile(button);
    if (action === "allow-remote") {
      let hostname = "ce domaine";
      try { hostname = new URL(button.dataset.url).hostname; } catch {}
      const allowed = await confirmAt(button, {
        title: "Autoriser cette ressource distante ?",
        message: `${hostname} pourra recevoir une requête depuis ce navigateur.`,
        confirmLabel: "Autoriser"
      });
      if (!allowed) return;
      remoteResources.allow(button.dataset.url, button.dataset.resourceType || "embed");
      const module = this.store.profile.modules.find((item) => item.id === id);
      if (module) await this.upsertModule(module, this.root.querySelector("#module-grid"));
      else {
        await this.renderWorkspace();
        this.renderPanel();
      }
      this.announce("Domaine autorisé localement");
    }
    if (action === "revoke-remote") {
      remoteResources.revoke(button.dataset.url, button.dataset.resourceType || "generic");
      await this.renderWorkspace();
      this.renderPanel();
      this.announce("Autorisation révoquée");
    }
    if (action === "allow-all-consents") {
      remoteResources.allowAll();
      await this.renderWorkspace();
      this.renderPanel();
      this.announce("Consentements activés localement");
    }
    if (action === "disable-all-consents") {
      remoteResources.revokeAll();
      await this.renderWorkspace();
      this.renderPanel();
      this.announce("Consentements désactivés");
    }
    if (action === "surprise-profile") {
      this.store.mutate((profile) => morphologyEngine.generateProfile(profile, crypto.randomUUID()), { immediate: true });
      await this.renderWorkspace();
      for (const module of this.store.profile.modules) {
        this.gridManager.updateWidget(this.renderedModules.get(module.id)?.widget, module.layout);
      }
      this.gridManager.commitLayout();
      this.renderPanel();
      this.announce("Nouvelle morphologie générée");
    }
    if (action === "toggle-morphology") {
      this.store.mutate((profile) => { profile.morphology.enabled = !profile.morphology.enabled; }, { immediate: true });
      this.renderPanel();
    }
    if (action === "unlock-morphology") {
      this.store.mutate((profile) => {
        profile.morphology.locks = { atmosphere: {}, modules: {} };
      }, { immediate: true });
      this.renderPanel();
    }
    if (action === "allow-fonts") {
      remoteResources.allow("https://fonts.bunny.net");
      await applyAtmosphere(this.store.profile);
      this.announce("Catalogue Bunny Fonts autorisé");
    }
  }

  async handlePrimaryDoubleClick(event) {
    if (event.target.closest("[data-action],a,button,input,textarea,select,[contenteditable],.ui-resizable-handle")) return;
    const space = event.target.closest(".space-card");
    if (space?.dataset.spaceId) {
      const profile = await this.store.openSpace(space.dataset.spaceId);
      this.homeVisible = false;
      this.resetRenderedGrid();
      await this.renderWorkspace();
      if (profile) history.pushState(null, "", `${location.pathname}?profile=${encodeURIComponent(profile.id)}`);
      return;
    }
    const module = event.target.closest(".module");
    if (module?.dataset.moduleId) {
      event.preventDefault();
      this.openPrimaryAction(module.dataset.moduleId);
    }
  }

  openPrimaryAction(id) {
    const module = this.store.profile.modules.find((item) => item.id === id);
    if (!module) return;
    this.selectedId = id;
    this.realtime.setSelectedModule(id);
    this.openPanel(isAssessmentModule(module) ? "assessment" : "editor");
  }

  syncOverflowMenus() {
    this.menuCleanup?.();
    this.menuCleanup = null;
    this.root.querySelectorAll("[data-menu-for]").forEach((menu) => {
      menu.hidden = menu.dataset.menuFor !== this.menuFor;
    });
    if (!this.menuFor) return;
    const menu = this.root.querySelector(`[data-menu-for="${CSS.escape(this.menuFor)}"]`);
    const anchor = this.root.querySelector(`[data-action="module-menu"][data-id="${CSS.escape(this.menuFor)}"]`);
    if (menu && anchor) this.menuCleanup = overlays.position(anchor, menu, { placement: "bottom-end", distance: 7 });
  }

  openPanel(type) {
    this.panel = type;
    this.renderPanel();
  }

  closePanel() {
    destroyEditor();
    this.panel = null;
    this.selectedId = null;
    this.realtime.setSelectedModule(null);
    this.root.querySelector("#panel-host").replaceChildren();
  }

  renderPanel() {
    destroyEditor();
    if (!this.panel) return;
    const panelScroll = this.root.querySelector(".panel__body")?.scrollTop || 0;
    const module = this.store.profile.modules.find((item) => item.id === this.selectedId);
    if (this.panel === "menu") this.panelManager.render({ type: "menu", title: "Réglages", eyebrow: "Profil local", body: this.menuBody(), className: "panel--menu" });
    if (this.panel === "live") {
      this.panelManager.render({ type: "live", title: "Présences", eyebrow: "Traces éphémères", body: realtimePanelBody(this.realtimeState, this.store.profile.modules), className: "panel--live" });
      this.bindRealtimePanel();
    }
    if (this.panel === "library") this.panelManager.render({ type: "library", title: "Bibliothèque", eyebrow: "Ajouter un fragment", body: this.libraryBody(), className: "panel--library" });
    if (this.panel === "about") this.panelManager.render({ type: "about", title: "À propos", eyebrow: "Crédits", body: this.aboutBody(), className: "panel--about" });
    if (this.panel === "consents") this.panelManager.render({ type: "consents", title: "Consentements", eyebrow: "Ressources distantes", body: this.consentsBody(), className: "panel--consents" });
    if (this.panel === "atmosphere") {
      this.panelManager.render({ type: "atmosphere", title: "Atmosphère", eyebrow: "Personnalisation", body: this.atmosphereBody(), className: "panel--atmosphere" });
      this.bindAtmosphereEditor();
    }
    if (this.panel === "assessment" && module) {
      this.panelManager.render({ type: "assessment", title: module.title, eyebrow: "Passation", body: assessmentBody(module), className: `panel--${module.type} panel--assessment` });
      mountAssessment({
        module,
        root: this.root.querySelector(".panel__body"),
        patch: (mutator, rerender = false) => this.patchModule(module.id, mutator, rerender)
      });
    }
    if (this.panel === "appearance" && module) {
      this.panelManager.render({ type: "appearance", title: "Apparence", eyebrow: module.title, body: appearanceBody(module), className: `panel--${module.type} panel--appearance` });
      mountAppearanceEditor({
        root: this.root.querySelector(".panel__body"),
        patch: (mutator, rerender = false) => this.patchModule(module.id, mutator, rerender)
      });
    }
    if (this.panel === "editor" && module) {
      this.panelManager.render({ type: this.panel, title: module.type === "rich-text" ? "Texte riche" : module.title, eyebrow: moduleCatalog.find((item) => item.type === module.type)?.category || "Fragment", body: editorBody(module), className: `panel--${module.type}` });
      mountEditor({
        module,
        root: this.root.querySelector(".panel__body"),
        patch: (mutator, rerender = false) => this.patchModule(module.id, mutator, rerender),
        announce: (message) => this.announce(message)
      });
    }
    if (this.panel === "menu") {
      bindVisualPickers(this.root.querySelector(".panel__body"), (mutator, rerender) => {
        this.store.mutate((profile) => mutator(profile), { immediate: Boolean(rerender) });
        this.renderWorkspace();
        if (rerender) this.renderPanel();
      }, (message) => this.announce(message));
    }
    bindTooltips(this.root.querySelector("#panel-host"));
    this.resolveAssets(this.root.querySelector("#panel-host"));
    this.restorePanelScroll(panelScroll);
  }

  restorePanelScroll(value) {
    if (!value) return;
    requestAnimationFrame(() => {
      const body = this.root.querySelector(".panel__body");
      if (body) body.scrollTop = value;
    });
  }

  renderRealtimeSurfaces() {
    const badge = this.root.querySelector("[data-live-badge]");
    if (badge) badge.innerHTML = realtimeBadge(this.realtimeState);
    this.renderPresenceStrip();
    const selfId = this.realtimeState?.identity?.peerId;
    const byModule = new Map();
    for (const peer of this.realtimeState?.presence || []) {
      if (!peer.selectedModuleId || peer.peerId === selfId) continue;
      const peers = byModule.get(peer.selectedModuleId) || [];
      peers.push(peer);
      byModule.set(peer.selectedModuleId, peers);
    }
    for (const [moduleId, record] of this.renderedModules) {
      const peers = byModule.get(moduleId) || [];
      let marker = record.element.querySelector("[data-live-module-presence]");
      const relation = moduleRelationSummary(moduleId, this.realtimeState);
      let relationMarker = record.element.querySelector("[data-module-relations]");
      if (!peers.length) {
        marker?.remove();
        record.element.removeAttribute("data-live-count");
      } else {
        if (!marker) {
          marker = document.createElement("div");
          marker.className = "live-module-presence";
          marker.dataset.liveModulePresence = "";
          record.element.append(marker);
        }
        record.element.dataset.liveCount = String(peers.length);
        marker.innerHTML = peers.slice(0, 4).map((peer) => `<span title="${escapeAttribute(peer.displayName || peer.nickname || "Présence")}">${visualPreview(peer.avatar)}</span>`).join("")
          + (peers.length > 4 ? `<strong>+${peers.length - 4}</strong>` : "");
      }
      if (!relation.items.length) {
        relationMarker?.remove();
        record.element.removeAttribute("data-trace-count");
        continue;
      }
      if (!relationMarker) {
        relationMarker = document.createElement("div");
        relationMarker.className = "module-relation-indicators";
        relationMarker.dataset.moduleRelations = "";
        record.element.append(relationMarker);
      }
      record.element.dataset.traceCount = String(relation.traceCount);
      relationMarker.innerHTML = relation.items.map((item) => `<span class="${item.tone}">${icon(item.icon, 12)}${escapeHtml(item.label)}</span>`).join("");
    }
  }

  renderPresenceStrip() {
    const strip = this.root.querySelector("[data-presence-strip]");
    if (!strip) return;
    const modules = this.store.profile.modules || [];
    strip.hidden = this.homeVisible || !modules.length;
    if (strip.hidden) return;
    const online = this.realtimeState?.status === "p2p";
    const peers = this.realtimeState?.presence || [];
    const remotePeers = peers.filter((peer) => peer.peerId !== this.realtimeState?.identity?.peerId);
    const comments = this.realtimeState?.comments?.length || 0;
    const reactions = this.realtimeState?.reactions?.length || 0;
    const offers = (this.realtimeState?.offers?.length || 0) + (this.realtimeState?.receivedFragments?.length || 0);
    strip.innerHTML = `
      <button class="presence-strip__status" type="button" data-action="open-live">
        <span class="live-dot ${online ? "is-online" : ""}"></span>
        <strong>${online ? "Présences actives" : "Espace local"}</strong>
        <small>${online ? `${Math.max(1, peers.length)} présent${peers.length > 1 ? "s" : ""}` : "verrouillé"}</small>
      </button>
      <button class="presence-strip__avatars" type="button" data-action="open-live" aria-label="Voir les présences">
        ${(remotePeers.length ? remotePeers : peers).slice(0, 5).map((peer) => `<span title="${escapeAttribute(peer.displayName || peer.nickname || "Présence")}">${visualPreview(peer.avatar)}</span>`).join("") || `<span>${icon("UserRound", 14)}</span>`}
      </button>
      <button class="presence-strip__metric" type="button" data-action="open-live">${icon("MessageCircle", 14)}<span>${comments} trace${comments > 1 ? "s" : ""}</span></button>
      <button class="presence-strip__metric" type="button" data-action="open-live">${icon("Smile", 14)}<span>${reactions}</span></button>
      <button class="presence-strip__metric" type="button" data-action="open-live">${icon("PackageOpen", 14)}<span>${offers}</span></button>
      <button class="presence-strip__invite" type="button" data-action="live-private-room">${icon("Link", 14)}<span>Lien privé</span></button>`;
  }

  bindRealtimePanel() {
    const body = this.root.querySelector(".panel__body");
    body?.querySelector("[data-live-enabled]")?.addEventListener("change", async (event) => {
      if (event.target.checked) await this.realtime.connect(body.querySelector("[data-live-room]")?.value);
      else await this.realtime.disconnect();
    });
    body?.querySelector("[data-live-room]")?.addEventListener("change", (event) => this.realtime.setRoom(event.target.value));
    body?.querySelector("[data-live-chat-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = event.currentTarget.elements.message;
      const value = input.value.trim();
      if (!value) return;
      await this.realtime.sendChat(value);
      input.value = "";
    });
    body?.querySelectorAll("[data-live-comment-form]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const input = event.currentTarget.elements.comment;
        const value = input.value.trim();
        if (!value) return;
        await this.realtime.addComment(event.currentTarget.dataset.moduleId, value);
        input.value = "";
      });
    });
  }

  menuBody() {
    const identity = this.store.profile.identity;
    return `
      <section class="menu-section menu-section--first"><h3>Espaces</h3><div class="menu-list">
        <button type="button" data-action="show-home">${icon("PanelTopOpen", 18)}<span><strong>Accueil et modèles</strong><small>Créer ou ouvrir un espace local</small></span></button>
      </div>${renderSpaceCard({ ...this.store.profile, moduleCount: this.store.profile.modules?.length || 0, assetCount: 0, template: this.store.profile.template || "custom" }, { compact: true, current: true })}</section>
      <section class="profile-card"><span>Identité du profil</span>
        ${this.identityEditing ? `<label class="field"><span>Nom affiché</span><input data-identity-name value="${escapeAttribute(identity.name)}" autofocus></label>
          <div class="inline-actions"><button type="button" class="soft-button" data-action="cancel-identity">Annuler</button><button type="button" class="soft-button is-primary" data-action="save-identity">Enregistrer</button></div>`
          : `<div class="identity-summary"><span class="profile-avatar profile-avatar--large">${visualPreview(identity.avatar)}</span><strong>${escapeHtml(identity.name)}</strong></div>
          <div class="inline-actions"><button type="button" data-action="edit-identity">${icon("Pencil", 16)} Modifier</button><button type="button" data-action="regenerate-name">${icon("RefreshCw", 16)} Régénérer le nom</button><button type="button" data-action="regenerate-avatar">${icon("Sparkles", 16)} Régénérer le visuel</button></div>`}
        ${visualPickerField(identity.avatar, "identity.avatar", "Avatar ou visuel")}
      </section>
      <section class="menu-section"><div class="section-heading"><h3>Atmosphère</h3><button type="button" data-action="open-atmosphere">${icon("SlidersHorizontal", 15)} Personnaliser</button></div><div class="theme-grid">${this.store.profile.atmospheres.map((atmosphere) => `<button type="button" data-action="set-atmosphere" data-atmosphere="${atmosphere.id}" class="${this.store.profile.activeAtmosphereId === atmosphere.id ? "is-active" : ""}"><i class="theme-swatch" style="--swatch-bg:${atmosphere.colors.bg};--swatch-accent:${atmosphere.colors.accent}"></i>${escapeHtml(atmosphere.name)}</button>`).join("")}</div></section>
      <section class="menu-section"><h3>Vie privée</h3><div class="menu-list">
        <button type="button" data-action="open-consents">${icon("ShieldCheck", 18)}<span><strong>Consentements</strong><small>Services distants, embeds, images et métadonnées</small></span></button>
        <button type="button" data-action="open-live">${icon("Radar", 18)}<span><strong>Présences</strong><small>Traces, commentaires et fragments proposés</small></span></button>
      </div></section>
      <section class="menu-section"><h3>Données</h3><div class="data-actions">
        <button type="button" data-action="import">${fileBadge("IMPORT")}${icon("Upload", 18)}<span><strong>Importer</strong><small>Profil ou fragment MODULOP</small></span></button>
        <button type="button" data-action="export-json">${fileBadge(".JSON")}${icon("FileJson", 18)}<span><strong>Exporter JSON</strong><small>Profil sans médias</small></span></button>
        <button type="button" data-action="export-zip">${fileBadge(".ZIP")}${icon("FileArchive", 18)}<span><strong>Exporter ZIP</strong><small>Profil autonome</small></span></button>
        <button type="button" data-action="export-pdf">${fileBadge(".PDF")}${icon("FileText", 18)}<span><strong>Exporter PDF</strong><small>Impression statique</small></span></button>
        <button type="button" data-action="reset-profile" class="danger-row">${fileBadge("RESET")}${icon("RotateCcw", 18)}<span><strong>Réinitialiser l’application</strong><small>Supprime espaces, médias et consentements</small></span></button>
      </div></section>`;
  }

  aboutBody() {
    return `<article class="about-markdown markdown-content">${DOMPurify.sanitize(marked.parse(creditsMarkdown(appVersion)))}</article>`;
  }

  consentsBody() {
    const services = remoteResources.catalog();
    const active = services.filter((service) => service.status === "allowed");
    const inactive = services.filter((service) => service.status !== "allowed");
    const current = this.consentFilter === "inactive" ? inactive : active;
    const renderList = current.length ? current.map((service) => `
      <article class="consent-row" data-search="${`${service.label} ${service.domain} ${service.type}`.toLowerCase()}">
        ${consentControl({ url: service.url, type: service.type, label: service.label, status: service.status, description: `${service.domain} · ${service.description}` })}
      </article>`).join("") : `<p class="empty-spaces">Aucun consentement dans cet onglet.</p>`;
    return `<section class="consent-center">
      <div class="consent-actions">
        <label class="field"><span>Rechercher</span><input type="search" placeholder="Domaine, service, type…" oninput="this.closest('.consent-center').querySelectorAll('[data-search]').forEach(row=>row.hidden=!row.dataset.search.includes(this.value.toLowerCase()))"></label>
        <div class="inline-actions">
          <button type="button" class="soft-button" data-action="allow-all-consents">${icon("ShieldCheck", 16)} Tout autoriser</button>
          <button type="button" class="soft-button" data-action="disable-all-consents">${icon("ShieldOff", 16)} Tout désactiver</button>
        </div>
      </div>
      <div class="consent-tabs" role="tablist" aria-label="Filtrer les consentements">
        <button type="button" data-action="open-consents" data-filter="active" class="${this.consentFilter === "active" ? "is-active" : ""}" aria-pressed="${this.consentFilter === "active"}">Actifs <small>${active.length}</small></button>
        <button type="button" data-action="open-consents" data-filter="inactive" class="${this.consentFilter === "inactive" ? "is-active" : ""}" aria-pressed="${this.consentFilter === "inactive"}">Inactifs <small>${inactive.length}</small></button>
      </div>
      <div class="consent-list">${renderList}</div>
    </section>`;
  }

  libraryBody() {
    const categories = [...new Set(moduleCatalog.map((item) => item.category))];
    const neighbors = this.insertionNeighbors();
    const featured = moduleCatalog.find((item) => item.type === "gardner") || moduleCatalog[0];
    const context = this.pendingInsertion
      ? `<div class="insertion-context">${icon(directionIcon(this.pendingInsertion.direction), 17)}<span>Insertion ${insertionLabel(this.pendingInsertion.direction)}</span></div>`
      : "";
    return `<section class="library-studio">
      <header class="library-hero">
        <div>
          <span class="eyebrow">Fragments locaux</span>
          <h3>Bibliothèque de fragments</h3>
          <p>Composer l’espace avec des modules installés localement. Chaque ajout devient un fragment autonome, partageable ensuite si vous le choisissez.</p>
        </div>
        <span class="library-availability"><i></i>Disponible hors ligne</span>
      </header>
      <label class="field catalog-search"><span>Rechercher</span><input type="search" placeholder="Texte, constellation, questionnaire…" oninput="this.closest('.panel__body').querySelectorAll('.catalog-card,.neighbor-card').forEach(card=>card.hidden=!card.dataset.search.includes(this.value.toLowerCase()))"></label>
      <nav class="catalog-filters" aria-label="Catégories de fragments">
        <button type="button" class="is-active" onclick="this.closest('.panel__body').querySelector('.catalog-search input').value='';this.closest('.panel__body').querySelectorAll('.catalog-card,.neighbor-card').forEach(card=>card.hidden=false)">Tous</button>
        ${categories.map((category) => `<button type="button" onclick="const root=this.closest('.panel__body');root.querySelectorAll('.catalog-card').forEach(card=>card.hidden=card.dataset.category!==this.dataset.category);root.querySelectorAll('.neighbor-card').forEach(card=>card.hidden=true)" data-category="${escapeAttribute(category)}">${escapeHtml(categoryLabel(category))}</button>`).join("")}
      </nav>
      ${context}
      <div class="library-layout">
        <div class="library-catalog">
          ${neighbors.length ? `<section class="catalog-section neighbor-section"><h3>Dupliquer rapidement</h3><p>Reprendre le contenu et les dimensions d’un fragment voisin.</p><div class="neighbor-catalog">${neighbors.map((module) => {
        const definition = moduleCatalog.find((item) => item.type === module.type);
        const layout = this.effectiveLayout(module);
        return `<button class="neighbor-card" type="button" data-action="duplicate-neighbor" data-source-id="${module.id}" data-search="${`${module.title} ${definition?.label || ""}`.toLowerCase()}">
          <span>${icon(definition?.icon || "CopyPlus", 18)}</span><strong>${escapeHtml(module.title)}</strong>
          <small>${layout.w} × ${layout.h}</small>${icon("CopyPlus", 15)}
        </button>`;
      }).join("")}</div></section>` : ""}
          ${categories.map((category) => `<section class="catalog-section"><h3>${category}</h3><div class="catalog">${moduleCatalog.filter((item) => item.category === category).map((item) => `
            <button class="catalog-card" type="button" data-action="add-module" data-type="${item.type}" data-category="${escapeAttribute(category)}" data-search="${`${item.label} ${category} ${moduleLibraryDescription(item)}`.toLowerCase()}">
              <span class="catalog-card__icon">${icon(item.icon, 20)}</span>
              <strong>${item.label}</strong>
              <small>${escapeHtml(moduleLibraryDescription(item))}</small>
              <em>${escapeHtml(categoryLabel(category))}</em>
              <b>${item.layout?.[0] || 4}×${item.layout?.[1] || 4}</b>
              ${icon("Plus", 15)}
            </button>`).join("")}</div></section>`).join("")}
        </div>
        <aside class="library-detail">
          <span class="library-detail__badge">${escapeHtml(categoryLabel(featured.category))}</span>
          <div class="library-detail__preview">${icon(featured.icon, 42)}<i></i><i></i><i></i></div>
          <h3>${escapeHtml(featured.label)}</h3>
          <p>${escapeHtml(moduleLibraryLongDescription(featured))}</p>
          <dl>
            <div><dt>Données</dt><dd>Stockées dans le profil local</dd></div>
            <div><dt>Rendus</dt><dd>Carte, grille, détail, export</dd></div>
            <div><dt>Partage</dt><dd>Fragment proposé explicitement</dd></div>
          </dl>
          <button type="button" class="soft-button is-primary" data-action="add-module" data-type="${featured.type}">${icon("Plus", 16)} Ajouter au profil</button>
        </aside>
      </div>
    </section>`;
  }

  insertionNeighbors() {
    if (!this.pendingInsertion) return [];
    const anchor = this.store.profile.modules.find((item) => item.id === this.pendingInsertion.anchorId);
    if (!anchor) return [];
    const center = layoutCenter(this.effectiveLayout(anchor));
    const directional = this.store.profile.modules
      .filter((module) => module.id !== anchor.id)
      .map((module) => {
        const candidate = layoutCenter(this.effectiveLayout(module));
        return {
          module,
          distance: layoutDistance(center, candidate),
          aligned: isInDirection(center, candidate, this.pendingInsertion.direction)
        };
      })
      .sort((a, b) => Number(b.aligned) - Number(a.aligned) || a.distance - b.distance)
      .slice(0, 2)
      .map(({ module }) => module);
    return [anchor, ...directional];
  }

  async insertModule(created, message) {
    const insertion = this.pendingInsertion ? { ...this.pendingInsertion } : null;
    this.store.mutate((profile) => profile.modules.push(created), { immediate: true });
    this.homeVisible = false;
    this.closePanel();
    await this.renderWorkspace();
    if (insertion) {
      const anchor = this.store.profile.modules.find((item) => item.id === insertion.anchorId);
      const record = this.renderedModules.get(created.id);
      if (anchor && record) this.gridManager.positionNear(record.widget, this.effectiveLayout(anchor), insertion.direction, created.layout);
    }
    this.pendingInsertion = null;
    history.pushState(null, "", `${location.pathname}?profile=${encodeURIComponent(this.store.profile.id)}`);
    this.announce(message);
  }

  async handlePaste(event) {
    if (event.target.closest("input,textarea,[contenteditable]")) return;
    const files = Array.from(event.clipboardData?.files || []);
    const text = event.clipboardData?.getData("text/plain") || "";
    if (!files.length && !text.trim()) return;
    event.preventDefault();
    await this.ingestDroppedContent({ files, text, anchor: this.root });
  }

  async pasteFromClipboard(anchor) {
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        const imageItem = items.find((item) => item.types.some((type) => type.startsWith("image/")));
        if (imageItem) {
          const type = imageItem.types.find((itemType) => itemType.startsWith("image/"));
          await this.ingestImageBlob(await imageItem.getType(type), "image-collée", "Image collée");
          return;
        }
      }
      const text = await navigator.clipboard?.readText?.();
      if (text?.trim()) {
        await this.ingestText(text, { message: "Presse-papier transformé en fragment" });
        return;
      }
    } catch {}
    this.announce("Presse-papier inaccessible depuis ce navigateur");
    anchor?.focus?.();
  }

  currentIntentValue() {
    const fields = [...this.root.querySelectorAll("[data-home-intent]")];
    const visible = fields.find((field) => !field.closest("[hidden]") && field.getClientRects().length);
    return (visible || fields.at(-1))?.value.trim() || "";
  }

  async ingestDroppedContent({ files = [], text = "", anchor = null } = {}) {
    for (const file of files) {
      const classification = classifyFileInput(file);
      if (classification.kind === "portable-file") {
        await this.importFile(file, { anchor, fromDrop: true });
        return;
      }
      if (classification.kind === "image") {
        await this.ingestImageBlob(file, file.name, "Image déposée");
        continue;
      }
      if (classification.kind === "text-file") {
        await this.ingestText(await file.text(), { message: "Fichier texte transformé en fragment" });
        continue;
      }
      this.announce(`${file.name || "Fichier"} n’est pas encore pris en charge`);
    }
    if (text.trim()) await this.ingestText(text, { message: "Contenu transformé en fragment" });
  }

  async ingestImageBlob(blob, name, message) {
    const asset = await saveAsset(blob, name || "image");
    const module = createMediaModule({ asset, name, type: blob.type }, createModule);
    await this.insertModule(module, message);
  }

  async ingestText(text, { message = "Fragment ajouté" } = {}) {
    const classification = classifyTextInput(text);
    if (classification.kind === "portable-json") {
      const confirmed = await confirmAt(this.root, {
        title: "Importer ce profil JSON ?",
        message: "Le texte collé ressemble à un profil MODULOP. Il sera ajouté comme nouvel espace local.",
        confirmLabel: "Importer"
      });
      if (!confirmed) return;
      const file = new File([classification.text], "profil.modulop.json", { type: "application/json" });
      await this.importFile(file, { anchor: this.root });
      return;
    }
    const module = createModuleFromTextClassification(classification, createModule);
    if (!module) {
      this.announce("Aucun contenu exploitable à ajouter");
      return;
    }
    await this.insertModule(module, message);
  }

  effectiveLayout(module) {
    const node = this.renderedModules.get(module.id)?.widget?.gridstackNode;
    const definition = moduleCatalog.find((item) => item.type === module.type);
    return {
      ...module.layout,
      x: node?.x ?? module.layout.x ?? 0,
      y: node?.y ?? module.layout.y ?? 0,
      w: node?.w ?? module.layout.w ?? definition?.layout?.[0] ?? 4,
      h: node?.h ?? module.layout.h ?? definition?.layout?.[1] ?? 4
    };
  }

  atmosphereBody() {
    const atmosphere = activeAtmosphere(this.store.profile);
    const ratio = contrastRatio(atmosphere.colors.text, atmosphere.colors.bg);
    const locks = this.store.profile.morphology.locks.atmosphere;
    const actionShortcuts = this.store.profile.uiPreferences?.moduleActions?.visibleShortcuts ?? 1;
    const state = (section) => locks[section] ? "Verrouillé" : this.store.profile.morphology.enabled ? "Aléatoire" : "Manuel";
    const colorFields = [["bg", "Fond"], ["surface", "Surface"], ["text", "Texte"], ["accent", "Accent"], ["aqua", "Interaction"], ["acid", "Signal"]];
    const fontOptions = (category) => listFonts(category).map((font) => `<option value="${font.id}">${font.label}</option>`).join("");
    return `
      <div class="save-state" data-save-state><i></i><span>Enregistré localement</span></div>
      <section class="atmosphere-studio">
        <header class="studio-hero">
          <div class="studio-hero__scene" style="--scene-bg:${atmosphere.colors.bg};--scene-surface:${atmosphere.colors.surface};--scene-accent:${atmosphere.colors.accent}">
            <i></i><strong>${escapeHtml(this.store.profile.identity.name)}</strong><span></span>
          </div>
          <div><span class="eyebrow">Studio morphique</span><h3>${escapeHtml(atmosphere.name)}</h3><p>Chaque scène est manipulable et peut rester aléatoire ou être verrouillée.</p></div>
          <button class="soft-button is-primary" type="button" data-action="surprise-profile">${icon("Sparkles", 16)} Surprenez-moi</button>
        </header>
        <label class="morph-input"><span>Nom de l’atmosphère</span><input data-atmosphere-path="name" data-morph-section="identity" value="${escapeAttribute(atmosphere.name)}"></label>
        <div class="atmosphere-actions">
          <button class="soft-button is-primary" type="button" data-action="surprise-profile">${icon("Sparkles", 16)} Surprenez-moi</button>
          <button class="soft-button" type="button" data-action="reset-atmosphere">${icon("RotateCcw", 16)} Réinitialiser Custom</button>
        </div>
        ${disclosure("Palette", `<div class="morph-color-grid morph-color-grid--wide">${colorFields.map(([key,label]) => `<label class="morph-color morph-color--wide"><i style="--control-color:${atmosphere.colors[key]}"></i><span>${label}</span><output>${atmosphere.colors[key]}</output><input type="color" data-atmosphere-path="colors.${key}" data-morph-section="palette" value="${atmosphere.colors[key]}"></label>`).join("")}</div><p class="contrast-status ${ratio < 4.5 ? "is-warning" : ""}">${ratio < 4.5 ? icon("TriangleAlert",16) : icon("BadgeCheck",16)} Contraste ${ratio.toFixed(1)}:1</p>`, { open:true, state:state("palette") })}
        ${disclosure("Arrière-plan", `${choiceCards("background.mode","Composition",[
          {value:"solid",label:"Uni",preview:"preview-solid"},{value:"gradient",label:"Linéaire",preview:"preview-gradient"},{value:"radial",label:"Radial",preview:"preview-radial"},{value:"conic",label:"Conique",preview:"preview-conic"},{value:"mesh",label:"Mesh",preview:"preview-mesh"},{value:"image",label:"Image",preview:"preview-image"}
        ],atmosphere.background.mode)}
          ${renderField("range",{label:"Angle",name:"background.angle",value:atmosphere.background.angle,min:0,max:360,unit:"°",theme:atmosphere.controls.rangeTheme})}
          ${renderField("range",{label:"Texture",name:"background.texture",value:atmosphere.background.texture,min:0,max:18,unit:"%",theme:atmosphere.controls.rangeTheme})}
          ${switchControl("background.animated","Dégradé vivant",atmosphere.background.animated,"Animation respectant la réduction de mouvement")}
        `,{open:true,state:state("background")})}
        ${disclosure("Typographie", `<div class="catalog-fields">${searchSelect("typography.sans", "Texte courant", listFonts("sans-serif"), atmosphere.typography.sans)}${searchSelect("typography.serif", "Titres", listFonts("serif"), atmosphere.typography.serif)}</div>${renderField("range",{label:"Échelle",name:"typography.scale",value:atmosphere.typography.scale,min:85,max:120,unit:"%",theme:atmosphere.controls.rangeTheme})}${consentControl({url:"https://fonts.bunny.net",type:"font",label:"Bunny Fonts",status:remoteResources.status("https://fonts.bunny.net","font"),description:"Catalogue typographique distant facultatif"})}`,{state:state("typography")})}
        ${disclosure("Formes, mouvement et actions", `${renderField("range",{label:"Rayons",name:"shape.radius",value:atmosphere.shape.radius,min:0,max:40,unit:" px",theme:atmosphere.controls.rangeTheme})}${renderField("range",{label:"Bordures",name:"shape.borderOpacity",value:atmosphere.shape.borderOpacity,min:4,max:35,unit:"%",theme:atmosphere.controls.rangeTheme})}${renderField("range",{label:"Ombres",name:"shape.shadow",value:atmosphere.shape.shadow,min:0,max:70,unit:"%",theme:atmosphere.controls.rangeTheme})}${renderField("range",{label:"Mouvement",name:"motion.intensity",value:atmosphere.motion.intensity,min:0,max:140,unit:"%",theme:atmosphere.controls.rangeTheme})}${renderField("range",{label:"Raccourcis visibles",name:"uiPreferences.moduleActions.visibleShortcuts",value:actionShortcuts,min:1,max:3,unit:"",theme:atmosphere.controls.rangeTheme})}`,{state:state("shape")})}
        ${disclosure("Style des curseurs", `<div class="slider-theme-grid">${rangeThemeCatalog().map(({ id, label }) => `<article class="slider-theme-card ${atmosphere.controls.rangeTheme===id?"is-active":""}">${renderField("range",{label,name:`preview-${id}`,value:58,min:0,max:100,theme:id})}<button type="button" data-atmosphere-choice="controls.rangeTheme" data-value="${id}" aria-pressed="${atmosphere.controls.rangeTheme===id}">Utiliser ce style</button></article>`).join("")}</div>`,{open:true,state:state("controls")})}
        ${disclosure("Header morphique", `${choiceCards("header.mode","Comportement",[{value:"off",label:"Compact",preview:"preview-header-compact"},{value:"reveal",label:"Révélé",preview:"preview-header-reveal"},{value:"always",label:"Permanent",preview:"preview-header-always"}],atmosphere.header.mode)}${choiceCards("header.effect","Transition",[{value:"glide",label:"Glissement"},{value:"fade",label:"Fondu"},{value:"scale",label:"Échelle"}],atmosphere.header.effect)}${renderField("range",{label:"Échelle du titre",name:"header.typeScale",value:atmosphere.header.typeScale,min:75,max:140,unit:"%",theme:atmosphere.controls.rangeTheme})}`,{open:true,state:state("header")})}
      </section>`;
  }

  bindAtmosphereEditor() {
    const root = this.root.querySelector(".panel__body");
    root.querySelectorAll("[data-atmosphere-path]").forEach((input) => input.addEventListener("input", async () => {
      this.store.mutate((profile) => {
        const target = activateCustomAtmosphere(profile);
        setNested(target, input.dataset.atmospherePath, input.type === "range" ? Number(input.value) : input.type === "checkbox" ? input.checked : input.value);
        lockMorphologySection(profile, "atmosphere", input.dataset.morphSection || sectionForPath(input.dataset.atmospherePath));
      });
      input.closest("label")?.querySelector("output")?.replaceChildren(input.type === "color" ? input.value : `${input.value}${input.dataset.suffix || ""}`);
      await applyAtmosphere(this.store.profile);
      this.updateAtmospherePreview();
    }));
    root.querySelectorAll("[data-atmosphere-choice]").forEach((button) => button.addEventListener("click", async () => {
      this.store.mutate((profile) => {
        setNested(activateCustomAtmosphere(profile), button.dataset.atmosphereChoice, button.dataset.value);
        lockMorphologySection(profile, "atmosphere", sectionForPath(button.dataset.atmosphereChoice));
      });
      await applyAtmosphere(this.store.profile);
      this.renderPanel();
    }));
    ControlRegistry.bind(root, async (path, value, input) => {
      if (path.startsWith("preview-")) return;
      if (path.startsWith("uiPreferences.")) {
        this.store.mutate((profile) => setNested(profile, path, value), { immediate: true });
        await this.renderWorkspace();
      } else {
        this.store.mutate((profile) => {
          setNested(activateCustomAtmosphere(profile), path, value);
          lockMorphologySection(profile, "atmosphere", sectionForPath(path));
        });
        await applyAtmosphere(this.store.profile);
      }
      if (input?.matches("button,[type='checkbox']")) this.renderPanel();
      else {
        input?.closest(".meta-range")?.querySelector("output")?.replaceChildren(String(value));
        this.updateAtmospherePreview();
      }
    });
    root.querySelectorAll("[data-search-choice]").forEach((button) => button.addEventListener("click", async () => {
      this.store.mutate((profile) => {
        setNested(activateCustomAtmosphere(profile), button.dataset.searchChoice, button.dataset.value);
        lockMorphologySection(profile, "atmosphere", sectionForPath(button.dataset.searchChoice));
      }, { immediate: true });
      await applyAtmosphere(this.store.profile);
      this.renderPanel();
    }));
    root.querySelectorAll("[data-search-filter]").forEach((input) => input.addEventListener("input", () => {
      const query = input.value.toLowerCase();
      input.closest(".search-select")?.querySelectorAll("[data-search-choice]").forEach((button) => {
        button.hidden = !button.dataset.search.includes(query);
      });
    }));
  }

  updateAtmospherePreview() {
    const root = this.root.querySelector(".panel__body");
    const atmosphere = activeAtmosphere(this.store.profile);
    const ratio = contrastRatio(atmosphere.colors.text, atmosphere.colors.bg);
    const status = root.querySelector(".contrast-status");
    if (status) {
      status.classList.toggle("is-warning", ratio < 4.5);
      status.innerHTML = `${ratio < 4.5 ? icon("TriangleAlert", 16) : icon("BadgeCheck", 16)} Contraste principal ${ratio.toFixed(1)}:1 ${ratio < 4.5 ? "— à surveiller" : "— lisible"}`;
    }
  }

  async resetAtmosphere(anchor) {
    const confirmed = await confirmAt(anchor, { title: "Réinitialiser Custom ?", message: "Les réglages personnalisés seront remplacés par l’atmosphère active de référence.", confirmLabel: "Réinitialiser" });
    if (!confirmed) return;
    const base = createDefaultAtmospheres()[0];
    this.store.mutate((profile) => {
      const index = profile.atmospheres.findIndex((item) => item.id === "custom");
      profile.atmospheres[index] = { ...base, id: "custom", name: "Custom", custom: true };
      profile.activeAtmosphereId = "custom";
    });
    await this.renderWorkspace();
    this.renderPanel();
  }

  async copyModule(anchor, id) {
    const element = this.renderedModules.get(id)?.element;
    if (!element) return;
    element.classList.add("is-capturing");
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(element, { pixelRatio: 2, cacheBust: true, backgroundColor: getComputedStyle(document.body).getPropertyValue("--bg").trim() });
      if (!blob) throw new Error();
      if (navigator.clipboard?.write && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        this.announce("Image du fragment copiée");
      } else {
        this.downloadBlob(blob, `${id}.png`);
        this.announce("Image téléchargée");
      }
    } catch {
      try {
        const { toBlob } = await import("html-to-image");
        const blob = await toBlob(element, { pixelRatio: 2 });
        if (blob) this.downloadBlob(blob, `${id}.png`);
        this.announce("Presse-papier indisponible, image téléchargée");
      } catch {
        this.announce("La capture de ce fragment a échoué");
      }
    } finally {
      element.classList.remove("is-capturing");
    }
  }

  downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement("a"), { href: url, download: name });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async deleteModule(anchor, id) {
    const module = this.store.profile.modules.find((item) => item.id === id);
    if (!module) return;
    const confirmAnchor = this.renderedModules.get(id)?.element || anchor;
    this.menuFor = null;
    this.syncOverflowMenus();
    const confirmed = await confirmAt(confirmAnchor, { title: "Supprimer ce fragment ?", message: `"${module.title}" sera retiré du profil.`, confirmLabel: "Supprimer" });
    if (!confirmed) return;
    this.store.mutate((profile) => { profile.modules = profile.modules.filter((item) => item.id !== id); }, { immediate: true });
    await this.renderWorkspace();
    this.announce("Fragment supprimé");
  }

  async renameSpace(anchor, id) {
    if (!id) return;
    const profile = await db.profiles.get(id);
    if (!profile) return;
    const name = prompt("Nouveau nom de l’espace", profile.identity?.name || "Espace MODULOP")?.trim();
    if (!name) return;
    profile.identity ||= {};
    profile.identity.name = name;
    profile.identity.source = "custom";
    profile.updatedAt = new Date().toISOString();
    await db.profiles.put(profile);
    if (this.store.profile.id === id) this.store.profile = profile;
    await this.renderWorkspace();
    this.renderPanel();
    anchor?.focus?.();
    this.announce("Espace renommé");
  }

  async exportSpace(id, format) {
    const profile = id === this.store.profile.id ? this.store.profile : await db.profiles.get(id);
    if (!profile) return;
    this.announce(format === "json" ? await exportJsonProfile(profile) : await exportZipProfile(profile));
  }

  async deleteSpace(anchor, id) {
    if (!id) return;
    const confirmed = await confirmAt(anchor, { title: "Supprimer cet espace ?", message: "Cet espace local sera retiré de ce navigateur.", confirmLabel: "Supprimer" });
    if (!confirmed) return;
    await this.store.deleteSpace(id);
    this.resetRenderedGrid();
    await this.renderWorkspace();
    this.announce("Espace supprimé");
  }

  async surpriseModule(anchor, id) {
    const module = this.store.profile.modules.find((item) => item.id === id);
    if (!module) return;
    this.store.mutate((profile) => {
      const target = profile.modules.find((item) => item.id === id);
      profile.morphology.locks.modules[id] ||= {};
      morphologyEngine.generateModule(target, seededFrom(id, crypto.randomUUID()), profile.morphology.locks.modules[id]);
    }, { immediate: true });
    await this.renderWorkspace();
    this.gridManager.updateWidget(this.renderedModules.get(id)?.widget, module.layout);
    this.announce("Présentation du fragment régénérée");
  }

  async resetProfile(anchor) {
    const stats = await this.store.stats();
    const confirmed = await confirmAt(anchor, {
      title: "Réinitialiser l’application ?",
      message: `${stats.profiles} espace(s), ${stats.assets} média(s), ${stats.consents} autorisation(s) distante(s) et les préférences locales seront supprimés. Les caches et cookies accessibles de ce domaine seront aussi nettoyés.`,
      confirmLabel: "Réinitialiser"
    });
    if (!confirmed) return;
    await this.store.resetAllLocalData();
    this.homeVisible = true;
    this.resetRenderedGrid();
    this.closePanel();
    await this.renderWorkspace();
    history.replaceState(null, "", `${location.pathname}?home=1`);
    this.announce("Application réinitialisée");
  }

  async handleImport(event) {
    const [file] = event.target.files;
    if (!file) return;
    await this.importFile(file, { anchor: this.root.querySelector("[data-action='import']") });
    event.target.value = "";
  }

  async importFile(file, { anchor, fromDrop = false } = {}) {
    try {
      if (!isPortableFile(file)) throw new Error();
      if (isFragmentFile(file)) {
        await this.importFragment(file, { anchor, fromDrop });
        return;
      }
      const confirmed = await confirmAt(anchor || null, {
        title: "Importer ce fichier ?",
        message: `${file.name} sera ajouté comme espace local et deviendra l’espace actif.`,
        confirmLabel: "Importer"
      });
      if (!confirmed) return;
      const profile = await importProfile(file);
      if (profile.schemaVersion !== 1 || !Array.isArray(profile.modules)) throw new Error();
      normalizeProfile(profile);
      const existing = profile.id ? await db.profiles.get(profile.id) : null;
      if (!profile.id || existing) profile.id = crypto.randomUUID();
      profile.updatedAt = new Date().toISOString();
      profile.template ||= "import";
      await db.profiles.put(profile);
      await db.preferences.put({ key: "activeProfileId", value: profile.id });
      this.store.profile = profile;
      this.homeVisible = false;
      this.resetRenderedGrid();
      await this.renderWorkspace();
      history.pushState(null, "", `${location.pathname}?profile=${encodeURIComponent(profile.id)}`);
      this.announce(fromDrop ? "Fichier importé depuis le dépôt" : "Fichier MODULOP importé");
    } catch {
      this.announce("Fichier MODULOP invalide");
    }
  }

  async exportFragment(anchor, id) {
    const module = this.store.profile.modules.find((item) => item.id === id);
    if (!module) return;
    this.menuFor = null;
    this.syncOverflowMenus();
    this.announce(await exportFragmentPackage(module));
    anchor?.focus?.();
  }

  async importFragment(file, { anchor, fromDrop = false } = {}) {
    const confirmed = await confirmAt(anchor || null, {
      title: "Importer ce fragment ?",
      message: `${file.name} sera ajouté à l’espace actuel sans remplacer vos autres fragments.`,
      confirmLabel: "Importer"
    });
    if (!confirmed) return;
    const module = await importFragmentPackage(file);
    await this.insertModule(module, fromDrop ? "Fragment importé depuis le dépôt" : "Fragment importé");
  }

  exportPdf() {
    document.body.classList.add("is-printing");
    this.announce("Préparation de l’export PDF");
    requestAnimationFrame(() => {
      window.print();
      setTimeout(() => document.body.classList.remove("is-printing"), 500);
    });
  }

  bindContentInteractions() {
    this.root.querySelectorAll(".object-card").forEach((card) => card.addEventListener("click", () => {
      const module = this.store.profile.modules.find((item) => item.id === card.closest(".module").dataset.moduleId);
      const item = module?.data.items?.[Number(card.dataset.objectIndex)];
      if (item) this.announce(`${item.label} — ${item.note}`);
    }));
  }

  saveGridLayout(layouts) {
    this.store.mutate((profile) => {
      const byId = new Map(layouts.map((layout) => [layout.id, layout]));
      profile.modules.forEach((module) => {
        const layout = byId.get(module.id);
        if (layout) module.layout = layout;
      });
    }, { history: false, immediate: true });
  }

  updateSaveState(status) {
    this.root.querySelectorAll("[data-save-state]").forEach((element) => {
      element.dataset.status = status;
      element.querySelector("span").textContent = status === "saved" ? "Enregistré localement" : status === "saving" ? "Enregistrement…" : "Modifié";
    });
  }

  persistRealtimeTrace(kind, detail = {}) {
    this.store.mutate((profile) => {
      profile.realtimeTraces ||= { comments: [], reactions: [] };
      profile.realtimeTraces.comments ||= [];
      profile.realtimeTraces.reactions ||= [];
      if (kind === "comment" && detail.id) {
        if (!profile.realtimeTraces.comments.some((comment) => comment.id === detail.id)) {
          profile.realtimeTraces.comments = [cleanRealtimeTrace(detail), ...profile.realtimeTraces.comments].slice(0, 240);
        }
      }
      if (kind === "reaction") {
        const key = realtimeReactionKey(detail);
        const existing = profile.realtimeTraces.reactions.findIndex((reaction) => realtimeReactionKey(reaction) === key);
        if (existing >= 0) profile.realtimeTraces.reactions.splice(existing, 1);
        else profile.realtimeTraces.reactions = [cleanRealtimeTrace(detail), ...profile.realtimeTraces.reactions].slice(0, 400);
      }
    }, { history: false });
  }

  announce(message) {
    const toast = this.root.querySelector(".toast");
    clearTimeout(this.toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    this.toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2400);
  }

  resetRenderedGrid() {
    for (const record of this.renderedModules.values()) destroyModule(record.module, record.element);
    this.renderedModules.clear();
    this.gridManager?.clear();
    this.hasHydratedGrid = false;
    this.selectedId = null;
    this.menuFor = null;
    this.pendingInsertion = null;
    this.insertionModeId = null;
  }
}

async function bootstrap() {
  await store.init();
  await new ModulopApp(appRoot, store).init();
}

bootstrap().catch((error) => {
  console.error(error);
  appRoot.innerHTML = `<main class="fatal-error"><h1>MODULOP n’a pas pu démarrer.</h1><p>Rechargez la page ou effacez les données locales du site.</p></main>`;
});

function rangeField(label, path, value, min, max, suffix) {
  return `<label class="kinetic-range"><span>${label}<output>${value}${suffix}</output></span><input type="range" min="${min}" max="${max}" value="${value}" data-atmosphere-path="${path}" data-suffix="${suffix}"></label>`;
}

function profileTemplates() {
  return [
    { id: "blank", label: "Profil vierge", icon: "FilePlus2", description: "Une page minimale pour construire librement." },
    { id: "starter", label: "Starter personnel", icon: "Shapes", description: "Objets, portrait et mode d’emploi." },
    { id: "tests", label: "Tests & questionnaires", icon: "ListChecks", description: "SEC, SIC, TPACK, IPIP et passations." },
    { id: "portfolio", label: "Portfolio narratif", icon: "Milestone", description: "Chronique, ressources et récit." },
    { id: "research-sicsia", label: "Recherche/SICsIA", icon: "Network", description: "Fragments centrés intelligence collective." },
    { id: "media", label: "Web & médias", icon: "PanelsTopLeft", description: "Liens enrichis, embeds et collections." }
  ];
}

function rangeThemeCatalog() {
  return [
    { id: "expressive", label: "Élastique" },
    { id: "segmented", label: "Sémantique" },
    { id: "bubble", label: "Bulle" },
    { id: "bands", label: "Bandes" },
    { id: "magnetic", label: "Magnétique" },
    { id: "ribbon", label: "Ruban" },
    { id: "pulse", label: "Pulse" },
    { id: "minimal", label: "Minimal" }
  ];
}

function searchSelect(path, label, options, value) {
  return `<section class="search-select"><label><span>${escapeHtml(label)}</span><input type="search" data-search-filter placeholder="Filtrer une police…"></label>
    <div>${options.map((font) => `<button type="button" data-search-choice="${path}" data-value="${font.id}" data-search="${`${font.label} ${font.category} ${font.provider || ""}`.toLowerCase()}" class="${font.id === value ? "is-active" : ""}">
      <strong>${escapeHtml(font.label)}</strong><small>${escapeHtml(font.provider || "système")} · ${escapeHtml(font.category || "")}</small>
    </button>`).join("")}</div></section>`;
}

function renderSpaceCard(space, { compact = false, current = false } = {}) {
  const modules = Array.isArray(space.modules) ? space.modules : [];
  const name = space.identity?.name || "Espace MODULOP";
  const count = space.moduleCount ?? modules.length;
  const icons = modules.slice(0, compact ? 5 : 8).map((module) => {
    const definition = moduleCatalog.find((item) => item.type === module.type);
    return `<span title="${escapeAttribute(module.title || definition?.label || "Fragment")}">${icon(definition?.icon || "PanelTop", compact ? 13 : 15)}</span>`;
  }).join("");
  const overflow = modules.length > (compact ? 5 : 8) ? `<em>+${modules.length - (compact ? 5 : 8)}</em>` : "";
  const template = space.template || "custom";
  const updated = space.updatedAt ? new Date(space.updatedAt).toLocaleDateString("fr-FR") : "Aujourd’hui";
  return `<article class="space-card ${compact ? "space-card--compact" : ""} ${current ? "is-current" : ""}" data-space-id="${space.id}">
    <button type="button" class="space-card__main" data-action="open-space" data-profile-id="${space.id}">
      <span class="space-card__avatar">${visualPreview(space.identity?.avatar)}</span>
      <span class="space-card__copy">
        <strong>${escapeHtml(name)}</strong>
        <small>${escapeHtml(template)} · ${count} fragment${count > 1 ? "s" : ""} · ${updated}</small>
      </span>
      <span class="space-card__meter" aria-hidden="true"><i style="width:${Math.min(100, Math.max(6, count * 9))}%"></i></span>
      <span class="space-card__fragments" aria-label="Fragments">${icons || `<span>${icon("PanelTop", 14)}</span>`}${overflow}</span>
    </button>
    <div class="space-card__actions" aria-label="Actions rapides pour ${escapeAttribute(name)}">
      <button type="button" data-action="rename-space" data-profile-id="${space.id}" data-tooltip="Renommer">${icon("Pencil", 15)}</button>
      <button type="button" data-action="export-space-zip" data-profile-id="${space.id}" data-tooltip="Exporter ZIP">${icon("FileArchive", 15)}</button>
      <button type="button" data-action="export-space-json" data-profile-id="${space.id}" data-tooltip="Exporter JSON">${icon("FileJson", 15)}</button>
      <button type="button" data-action="delete-space" data-profile-id="${space.id}" data-tooltip="Supprimer" aria-label="Supprimer cet espace">${icon("Trash2", 15)}</button>
    </div>
  </article>`;
}

function seededFrom(...parts) {
  let value = parts.join(":").split("").reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
  return () => ((value = Math.imul(value ^ value >>> 15, 1 | value) + 0x6D2B79F5 | 0) >>> 0) / 4294967296;
}

function createInsertionControls(module) {
  const controls = document.createElement("nav");
  controls.className = "grid-insertions";
  controls.setAttribute("aria-label", `Ajouter près de ${module.title}`);
  controls.innerHTML = ["before", "right", "after", "left"].map((direction) => `
    <button type="button" data-action="open-library" data-anchor-id="${module.id}" data-direction="${direction}"
      aria-label="Ajouter un fragment ${insertionLabel(direction)} ${escapeAttribute(module.title)}">
      <span aria-hidden="true">${icon("Plus", 14)}</span>
      <em>${directionShortLabel(direction)}</em>
    </button>`).join("");
  return controls;
}

function moduleQuickActions(module, count = 1) {
  const actions = isAssessmentModule(module)
    ? [
        { icon: "ListChecks", label: `Passer ${module.title}`, action: "take-assessment" },
        { icon: "FilePenLine", label: `Modifier le contenu de ${module.title}`, action: "edit-module" },
        { icon: "Palette", label: `Personnaliser le rendu de ${module.title}`, action: "customize-module" }
      ]
    : [
        { icon: "FilePenLine", label: `Modifier le contenu de ${module.title}`, action: "edit-module" },
        { icon: "Palette", label: `Personnaliser le rendu de ${module.title}`, action: "customize-module" },
        { icon: "Copy", label: `Copier ${module.title} comme image`, action: "copy-module" }
      ];
  return actions.slice(0, Math.max(1, Math.min(3, Number(count) || 1)));
}

function duplicateModule(source, layout) {
  const copy = structuredClone(source);
  copy.id = crypto.randomUUID();
  copy.title = `${source.title} — copie`;
  copy.layout = { ...layout, x: undefined, y: undefined };
  return copy;
}

function setModuleProgress(element, value) {
  const progress = Math.max(0, Math.min(100, Math.round(value)));
  element.dataset.loadProgress = String(progress);
  element.style.setProperty("--load-progress", String(progress));
  element.style.setProperty("--load-ratio", String(progress / 100));
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function insertionLabel(direction) {
  return {
    before: "au-dessus de",
    after: "en dessous de",
    left: "à gauche de",
    right: "à droite de"
  }[direction];
}

function directionShortLabel(direction) {
  return { before: "Au-dessus", after: "En dessous", left: "À gauche", right: "À droite" }[direction];
}

function directionIcon(direction) {
  return { before: "ArrowUp", after: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }[direction];
}

function layoutCenter(layout) {
  return { x: (layout.x || 0) + (layout.w || 1) / 2, y: (layout.y || 0) + (layout.h || 1) / 2 };
}

function layoutDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isInDirection(anchor, candidate, direction) {
  if (direction === "before") return candidate.y < anchor.y;
  if (direction === "after") return candidate.y > anchor.y;
  if (direction === "left") return candidate.x < anchor.x;
  return candidate.x > anchor.x;
}

function isPortableFile(file) {
  return Boolean(file?.name && /\.(json|zip|modulop\.zip|modulop-fragment\.zip)$/i.test(file.name));
}

function isFragmentFile(file) {
  return Boolean(file?.name && /\.(modulop-fragment\.zip)$/i.test(file.name));
}

function cleanRealtimeTrace(detail = {}) {
  return Object.fromEntries(Object.entries(detail).filter(([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value)));
}

function realtimeReactionKey(reaction = {}) {
  return `${reaction.from || "local"}:${reaction.targetId || ""}:${reaction.emoji || ""}`;
}

function moduleRelationSummary(moduleId, state = {}) {
  const comments = (state.comments || []).filter((comment) => comment.moduleId === moduleId);
  const reactions = (state.reactions || []).filter((reaction) => reaction.moduleId === moduleId);
  const offers = (state.offers || []).filter((offer) => offer.moduleId === moduleId);
  const received = (state.receivedFragments || []).filter((fragment) => fragment.moduleId === moduleId);
  const activePeers = (state.presence || []).filter((peer) => peer.selectedModuleId === moduleId && peer.peerId !== state.identity?.peerId);
  const items = [];
  if (comments.length) items.push({ icon: "MessageCircle", label: String(comments.length), tone: "is-trace" });
  if (reactions.length) items.push({ icon: "Smile", label: String(reactions.length), tone: "is-reaction" });
  if (activePeers.length) items.push({ icon: "UsersRound", label: String(activePeers.length), tone: "is-presence" });
  if (offers.length || received.length) items.push({ icon: "PackageOpen", label: String(offers.length + received.length), tone: "is-fragment" });
  return { traceCount: comments.length + reactions.length, items };
}

function categoryLabel(category = "") {
  if (category.includes("questionnaires")) return "Questionnaire";
  if (category.includes("Collections")) return "Collection";
  if (category.includes("Personnalisation")) return "Profil";
  if (category.includes("médias")) return "Média";
  if (category.includes("Parcours")) return "Parcours";
  if (category.includes("Jeux")) return "Défi";
  return "Contenu";
}

function moduleLibraryDescription(item = {}) {
  const descriptions = {
    "rich-text": "Écrire, annoter, publier",
    "starter-pack": "Objets, symboles, collections",
    constellation: "Cartographier des liens",
    "portrait-chinois": "Révélateur créatif",
    values: "Clarifier des arbitrages",
    manual: "Mode d’emploi relationnel",
    timeline: "Chronique personnelle",
    "self-efficacy": "Confiance à agir",
    "learner-efficacy": "Confiance à apprendre",
    "collective-efficacy": "Confiance collective",
    "collective-intelligence": "Dynamiques de groupe",
    "sic-compact": "SICsIA synthétique",
    "sic-long": "SICsIA recherche",
    tpack: "Technologie, pédagogie, contenu",
    personality: "Traits déclarés",
    gardner: "Domaines d’engagement",
    cognitive: "Logique et vitesse",
    media: "Image ou média local",
    "link-card": "Lien enrichi",
    embed: "Outil externe embarqué"
  };
  return descriptions[item.type] || item.category || "Fragment local";
}

function moduleLibraryLongDescription(item = {}) {
  if (item.type === "gardner") return "Ce module cartographie des affinités déclarées et des modes d’engagement. Il éclaire des fonctionnements sans produire de diagnostic.";
  if (item.type === "rich-text") return "Un fragment d’écriture libre, idéal pour accueillir notes, intentions, récits et contenus éditoriaux exportables.";
  if (item.type === "constellation") return "Une scène relationnelle pour relier objets, personnes, idées et traces dans une carte manipulable.";
  return `${moduleLibraryDescription(item)}. Le fragment reste local tant que vous ne le proposez pas aux présences.`;
}

function fileBadge(label) {
  return `<b class="file-badge">${escapeHtml(label)}</b>`;
}

function selectValue(options, value) {
  return options.replace(`value="${value}"`, `value="${value}" selected`);
}

function setNested(target, path, value) {
  const parts = path.split(".");
  const key = parts.pop();
  const owner = parts.reduce((current, part) => {
    current[part] ||= {};
    return current[part];
  }, target);
  owner[key] = value;
}

function escapeAttribute(value = "") {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function sectionForPath(path = "") {
  const root = path.split(".")[0];
  return ({ colors: "palette", background: "background", typography: "typography", shape: "shape", motion: "motion", icons: "icons", header: "header", controls: "controls" })[root] || root;
}

function applyModulePresentation(element, options) {
  const properties = {
    "--module-surface": options.surface || "",
    "--module-text": options.text || "",
    "--module-accent": options.accent || "",
    "--module-radius": options.radius ? `${options.radius}px` : "",
    "--module-density": options.density ? options.density / 100 : "",
    "--module-motion": options.motion ? options.motion / 100 : ""
  };
  Object.entries(properties).forEach(([key, value]) => value === "" ? element.style.removeProperty(key) : element.style.setProperty(key, value));
}

function isAssessmentModule(module) {
  return ["gardner", "self-efficacy", "learner-efficacy", "collective-efficacy", "collective-intelligence", "sic-compact", "sic-long", "tpack", "personality", "cognitive"].includes(module?.type);
}
