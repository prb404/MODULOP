export const SYSTEM_APP_RENDER_MODES = ["toolbar", "panel", "sheet", "space-fragment", "toast"];

export const systemApps = [
  {
    id: "presence",
    label: "Présences",
    icon: "Radar",
    category: "Coprésence",
    description: "Activer sa présence, lire le cercle, échanger des traces et importer des fragments proposés.",
    renderModes: ["toolbar", "panel", "sheet", "space-fragment", "toast"],
    defaultAction: "open-live"
  },
  {
    id: "library",
    label: "Bibliothèque",
    icon: "LayoutGrid",
    category: "Composition",
    description: "Parcourir les fragments installés et les apps système disponibles dans cet espace.",
    renderModes: ["toolbar", "panel", "sheet"],
    defaultAction: "open-library"
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: "MessageSquareText",
    category: "Système",
    description: "Suivre les activités récentes et traiter les propositions de fragments sans bloquer l'espace.",
    renderModes: ["toast", "panel"],
    defaultAction: "open-notifications"
  }
];

export function systemAppCatalog() {
  return systemApps.map((app) => ({ ...app, renderModes: [...app.renderModes] }));
}

export function systemAppById(id) {
  return systemApps.find((app) => app.id === id) || null;
}

export function validateSystemApps(apps = systemApps) {
  const ids = new Set();
  const errors = [];
  apps.forEach((app) => {
    if (!app?.id) errors.push("App sans id");
    if (ids.has(app.id)) errors.push(`Id dupliqué: ${app.id}`);
    ids.add(app.id);
    if (!app.label) errors.push(`App ${app.id} sans libellé`);
    if (!app.icon) errors.push(`App ${app.id} sans icône`);
    if (!Array.isArray(app.renderModes) || !app.renderModes.length) errors.push(`App ${app.id} sans mode de rendu`);
    (app.renderModes || []).forEach((mode) => {
      if (!SYSTEM_APP_RENDER_MODES.includes(mode)) errors.push(`Mode inconnu ${mode} pour ${app.id}`);
    });
  });
  return errors;
}
