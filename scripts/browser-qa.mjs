import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";

const root = resolve(".");
const qaDir = join(root, "mockups", "qa");
const edgePath = process.env.MODULOP_BROWSER || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const port = Number(process.env.MODULOP_QA_PORT || 4177);
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
    await runDesktopQa(browser);
    await runMobileQa(browser);
  } finally {
    await browser.close();
  }
  console.log(`QA navigateur OK. Captures: ${qaDir}`);
} catch (error) {
  await writeFile(join(qaDir, "browser-qa-error.log"), `${error.stack || error}\n\n${logs.join("")}`);
  console.error(error.stack || error);
  process.exitCode = 1;
} finally {
  server.kill();
}

async function runDesktopQa(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  attachDiagnostics(page, "desktop");
  await page.goto(`${baseUrl}?home=1`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await assertVisible(page, ".welcome-hero", "accueil");
  await assertAbsent(page, ".workspace-presence-strip", "strip présence supprimée");
  await assertVisible(page, ".command-toolbar--adaptive", "toolbar adaptative");
  await exerciseToolbar(page);
  await page.screenshot({ path: join(qaDir, "home-desktop.png"), fullPage: true });

  await page.getByRole("button", { name: /Espace vierge/i }).click();
  await page.waitForSelector(".blank-workspace:not([hidden])");
  await assertVisible(page, ".blank-workspace__drop", "onboarding espace vierge");
  await page.screenshot({ path: join(qaDir, "blank-desktop.png"), fullPage: true });

  await page.locator(".blank-workspace [data-action='open-library']").click();
  await assertVisible(page, ".panel--library", "bibliothèque espace vierge");
  await page.locator("[data-action='library-filter'][data-library-kind='apps']").click();
  await assertVisible(page, ".system-app-card[data-app-id='presence']", "catalogue apps système");
  await page.locator("[data-action='library-filter'][data-library-kind='fragments']").click();
  await page.locator(".catalog-card[data-type='rich-text']").click();
  await page.waitForSelector(".module[data-load-state='ready']", { timeout: 12000 });
  await assertNoOverlap(page);
  await page.screenshot({ path: join(qaDir, "module-ready-desktop.png"), fullPage: true });

  const module = page.locator(".module").first();
  await module.dblclick();
  await assertVisible(page, ".panel--rich-text", "panneau d’action principale");
  await page.locator(".panel--rich-text [data-action='close-panel']").click();

  await clickToolbarAction(page, "open-menu");
  await assertVisible(page, ".panel--menu", "menu profil");
  await page.getByRole("button", { name: /Espaces et modèles/i }).click();
  await assertVisible(page, ".welcome-section--spaces", "liste des espaces");
  await page.screenshot({ path: join(qaDir, "spaces-desktop.png"), fullPage: true });

  await context.close();
}

async function runMobileQa(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  attachDiagnostics(page, "mobile");
  await page.goto(`${baseUrl}?home=1`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await assertVisible(page, ".welcome-hero", "accueil mobile");
  await assertAbsent(page, ".workspace-presence-strip", "strip présence supprimée mobile");
  await page.screenshot({ path: join(qaDir, "home-mobile.png"), fullPage: true });

  await page.getByRole("button", { name: /Web & médias/i }).click();
  await page.waitForSelector(".module[data-load-state='ready']", { timeout: 14000 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: join(qaDir, "media-mobile.png"), fullPage: true });
  await context.close();
}

async function exerciseToolbar(page) {
  const toolbar = page.locator(".command-toolbar--adaptive").first();
  await assertVisible(page, ".command-toolbar__resize--s", "poignée toolbar");
  const source = toolbar.locator("[data-toolbar-tool-id='presence']");
  const target = toolbar.locator("[data-toolbar-tool-id='spaces']");
  await source.dragTo(target).catch(() => null);
  const handle = page.locator(".command-toolbar__resize--s").first();
  const box = await handle.boundingBox();
  if (!box) throw new Error("Poignée basse toolbar introuvable");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y - 260, { steps: 8 });
  await page.mouse.up();
  await assertVisible(page, ".command-toolbar__overflow-toggle", "overflow toolbar");
  await page.locator(".command-toolbar__overflow-toggle").click();
  await assertVisible(page, ".command-toolbar__overflow.is-open", "menu overflow toolbar");
}

async function clickToolbarAction(page, action) {
  const visibleButton = page.locator(`.command-toolbar [data-action='${action}']:visible`).first();
  if (await visibleButton.count()) {
    await visibleButton.click();
    return;
  }
  await page.locator(".command-toolbar__overflow-toggle").click();
  await page.locator(`.command-toolbar__overflow [data-action='${action}']`).click();
}

async function assertVisible(page, selector, label) {
  const visible = await page.locator(selector).first().evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return rect.width > 8 && rect.height > 8 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0;
  }).catch(() => false);
  if (!visible) {
    await page.screenshot({ path: join(qaDir, `${label.replaceAll(" ", "-")}-failed.png`), fullPage: true });
    const state = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      bodyClass: document.body.className,
      appText: document.querySelector("#app")?.innerText?.slice(0, 500),
      appHtml: document.querySelector("#app")?.innerHTML?.slice(0, 1000)
    }));
    throw new Error(`${label} introuvable ou masqué: ${selector}\n${JSON.stringify(state, null, 2)}`);
  }
}

async function assertAbsent(page, selector, label) {
  const count = await page.locator(selector).count();
  if (count) throw new Error(`${label}: ${selector} ne devrait plus être dans le DOM`);
}

function attachDiagnostics(page, label) {
  page.on("console", (message) => logs.push(`[${label}:console:${message.type()}] ${message.text()}\n`));
  page.on("pageerror", (error) => logs.push(`[${label}:pageerror] ${error.stack || error.message}\n`));
}

async function assertNoOverlap(page) {
  const issues = await page.evaluate(() => {
    const viewport = { width: innerWidth, height: innerHeight };
    return [...document.querySelectorAll(".module")].map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        id: node.dataset.moduleId,
        badSize: rect.width < 120 || rect.height < 120,
        offscreen: rect.right < 0 || rect.bottom < 0 || rect.left > viewport.width || rect.top > document.body.scrollHeight
      };
    }).filter((item) => item.badSize || item.offscreen);
  });
  if (issues.length) throw new Error(`Modules mal positionnés: ${JSON.stringify(issues)}`);
}

async function assertNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 4) throw new Error(`Débordement horizontal mobile: ${overflow}px`);
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
