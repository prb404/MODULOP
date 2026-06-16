export const iconProviderRegistry = {
  lucide: {
    id: "lucide",
    label: "Lucide",
    capabilities: { weight: true, fill: false, rounded: true }
  },
  tabler: {
    id: "tabler",
    label: "Tabler",
    capabilities: { weight: true, fill: true, rounded: true },
    lazy: () => import("@tabler/icons")
  },
  material: {
    id: "material",
    label: "Material Symbols",
    capabilities: { weight: true, fill: true, rounded: true },
    lazy: () => import("material-symbols")
  }
};

export function listIconProviders() {
  return Object.values(iconProviderRegistry).map(({ lazy, ...provider }) => provider);
}
