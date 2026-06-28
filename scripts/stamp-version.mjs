import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const now = new Date();
const pad = (value) => String(value).padStart(2, "0");
const iteration = [
  now.getFullYear(),
  pad(now.getMonth() + 1),
  pad(now.getDate()),
  pad(now.getHours()),
  pad(now.getMinutes()),
  pad(now.getSeconds())
].join("");
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const majorMinorPatch = packageJson.version;

await writeFile(resolve(root, "src/core/version.js"), `export const appVersion = {
  majorMinorPatch: "${majorMinorPatch}",
  iteration: "${iteration}",
  display: "${majorMinorPatch}+${iteration}"
};
`);

console.log(`MODULOP ${majorMinorPatch}+${iteration}`);
