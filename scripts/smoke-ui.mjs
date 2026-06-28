import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";

const root = resolve(".");
const qaDir = join(root, "mockups", "qa", "smoke-ui");
const edgePath = process.env.MODULOP_BROWSER || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const port = Number(process.env.MODULOP_SMOKE_UI_PORT || 4199);
const baseUrl = `http://127.0.0.1:${port}/`;

await mkdir(qaDir, { recursive: true });

const viteBin = join(root, "node_modules", "vite", "bin", "vite.js");
const server = spawn(process.execPath, [viteBin, "--host", "127.0.0.1", "--port", String(port)], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"]
});

const logs = [];
server.stdout.on("data", (chunk) => logs.push(chunk.toString()));
server.stderr.on("data", (chunk) => logs.push(chunk.toString()));

try {
  await waitForServer(baseUrl);
  const browser = await chromium.launch({ executablePath: edgePath, headless: true });
  try {
    await smokeDesktop(browser);
    await smokeMobile(browser);
  } finally {
    await browser.close();
  }
  console.log(`Smoke UI OK. Captures: ${qaDir}`);
} catch (error) {
  await writeFile(join(qaDir, "smoke-ui-error.log"), `${error.stack || error}\n\n${logs.join("")}`);
  console.error(error.stack || error);
  process.exitCode = 1;
} finally {
  server.kill();
}

async function smokeDesktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  attachDiagnostics(page, "desktop");
  await page.goto(`${baseUrl}?home=1`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await assertVisualHealth(page, "desktop-home");
  await page.screenshot({ path: join(qaDir, "desktop-home.png"), fullPage: true });

  await page.getByRole("button", { name: /Espace vierge/i }).click();
  await page.waitForSelector(".blank-workspace:not([hidden])", { timeout: 12000 });
  await page.locator(".blank-workspace [data-action='open-library']").click();
  await page.locator(".catalog-card[data-type='rich-text']").click();
  await page.waitForSelector(".module[data-load-state='ready']", { timeout: 14000 });
  await assertVisualHealth(page, "desktop-module");

  await exerciseToolbarOverflow(page);
  await clickCommandAction(page, "open-live");
  await page.waitForSelector(".panel--live", { timeout: 10000 });
  for (const width of [360, 520, 900]) {
    await setPanelWidth(page, width);
    await assertVisualHealth(page, `presence-${width}`);
    await page.screenshot({ path: join(qaDir, `presence-${width}.png`), fullPage: true });
  }

  await clickCommandAction(page, "open-library");
  await page.locator("[data-action='library-filter'][data-library-kind='apps']").click();
  await assertVisualHealth(page, "library-apps");
  await page.screenshot({ path: join(qaDir, "library-apps.png"), fullPage: true });
  await context.close();
}

async function smokeMobile(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  attachDiagnostics(page, "mobile");
  await page.goto(`${baseUrl}?home=1`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await assertVisualHealth(page, "mobile-home");
  await page.locator(".mobile-tabbar [data-action='open-live']").click();
  await page.waitForSelector(".panel--live", { timeout: 10000 });
  await assertVisualHealth(page, "mobile-live");
  await page.screenshot({ path: join(qaDir, "mobile-live.png"), fullPage: true });
  await page.locator(".mobile-tabbar [data-action='open-library']").click();
  await assertVisualHealth(page, "mobile-library");
  await page.screenshot({ path: join(qaDir, "mobile-library.png"), fullPage: true });
  await context.close();
}

async function exerciseToolbarOverflow(page) {
  const handle = page.locator(".command-toolbar__resize--s").first();
  const box = await handle.boundingBox();
  if (!box) throw new Error("Poignée de toolbar absente");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y - 260, { steps: 8 });
  await page.mouse.up();
  await page.waitForSelector(".command-toolbar__overflow-toggle", { timeout: 5000 });
}

async function clickCommandAction(page, action) {
  const visible = page.locator(`[data-action='${action}']:visible`).first();
  if (await visible.count()) {
    await visible.click();
    return;
  }
  const overflow = page.locator(".command-toolbar__overflow-toggle:visible").first();
  if (await overflow.count()) {
    await overflow.click();
    await page.locator(`.command-toolbar__overflow [data-action='${action}']`).click();
    return;
  }
  await page.evaluate((name) => document.querySelector(`[data-action='${name}']`)?.click(), action);
}

async function setPanelWidth(page, width) {
  await page.evaluate((value) => {
    const panel = document.querySelector(".panel--live");
    if (!panel) return;
    panel.style.width = `${value}px`;
    panel.style.maxWidth = `${value}px`;
  }, width);
  await page.waitForTimeout(150);
}

async function assertVisualHealth(page, label) {
  const state = await page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const stripCount = document.querySelectorAll(".workspace-presence-strip").length;
    const badControls = [...document.querySelectorAll("button, input, select")].filter((node) => {
      if (node.matches("input[type='checkbox'], .panel-resize, .command-toolbar__resize")) return false;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 && (rect.width < 24 || rect.height < 24);
    }).slice(0, 12).map((node) => node.outerHTML.slice(0, 140));
    const clippedText = [...document.querySelectorAll(".module h2,.module h3,.catalog-card strong,.system-app-card strong,.presence-card strong,.live-peer__main strong,.notification__content p")].filter((node) => {
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return false;
      const cutsText = ["hidden", "clip"].includes(style.overflowX) || style.whiteSpace === "nowrap";
      if (!cutsText) return false;
      return node.scrollWidth > node.clientWidth + 3 && node.clientWidth > 0;
    }).slice(0, 12).map((node) => node.textContent.trim());
    const loadErrors = [...document.querySelectorAll("[data-load-state='error']")].map((node) => node.textContent.trim().slice(0, 120));
    return { overflow, stripCount, badControls, clippedText, loadErrors };
  });
  if (state.stripCount) throw new Error(`${label}: workspace-presence-strip encore présente`);
  if (state.overflow > 4) throw new Error(`${label}: débordement horizontal ${state.overflow}px`);
  if (state.badControls.length) throw new Error(`${label}: contrôles trop petits\n${JSON.stringify(state.badControls, null, 2)}`);
  if (state.clippedText.length) throw new Error(`${label}: textes coupés\n${JSON.stringify(state.clippedText, null, 2)}`);
  if (state.loadErrors.length) throw new Error(`${label}: fragments en erreur\n${JSON.stringify(state.loadErrors, null, 2)}`);
}

function attachDiagnostics(page, label) {
  page.on("console", (message) => logs.push(`[${label}:console:${message.type()}] ${message.text()}\n`));
  page.on("pageerror", (error) => logs.push(`[${label}:pageerror] ${error.stack || error.message}\n`));
}

async function waitForServer(url) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error(`Serveur Vite indisponible: ${url}`);
}
