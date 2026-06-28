import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { hasIcon, icon } from "../src/ui/icons.js";

describe("registre d’icônes", () => {
  it("réserve l’icône d’aide aux usages explicites", () => {
    expect(hasIcon("CircleHelp")).toBe(true);
    expect(hasIcon("IconeInconnue")).toBe(false);
    expect(icon("IconeInconnue")).not.toContain("circle-help");
  });

  it("déclare toutes les icônes nommées statiquement", () => {
    const names = new Set();
    for (const file of sourceFiles(join(process.cwd(), "src"))) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/icon\("([A-Za-z0-9]+)"/g)) names.add(match[1]);
      for (const match of source.matchAll(/icon:\s*"([A-Za-z0-9]+)"/g)) names.add(match[1]);
      for (const match of source.matchAll(/kind:\s*"icon",\s*name:\s*"([A-Za-z0-9]+)"/g)) names.add(match[1]);
    }
    const missing = [...names].filter((name) => !hasIcon(name));
    expect(missing).toEqual([]);
  });
});

function sourceFiles(root) {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith(".js") ? [path] : [];
  });
}
