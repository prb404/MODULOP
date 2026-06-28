import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";

const root = resolve(".");
const qaDir = join(root, "mockups", "qa", "realtime");
const edgePath = process.env.MODULOP_BROWSER || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const port = Number(process.env.MODULOP_REALTIME_QA_PORT || 4188);
const baseUrl = `http://127.0.0.1:${port}/`;
const roomId = `qa-${Date.now().toString(36)}`;

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
    await runRealtimeQa(browser);
  } finally {
    await browser.close();
  }
  console.log(`QA temps reel OK. Captures: ${qaDir}`);
} catch (error) {
  await writeFile(join(qaDir, "realtime-qa-error.log"), `${error.stack || error}\n\n${logs.join("")}`);
  console.error(error.stack || error);
  process.exitCode = 1;
} finally {
  server.kill();
}

async function runRealtimeQa(browser) {
  const alpha = await createClient(browser, "alpha");
  const beta = await createClient(browser, "beta");
  try {
    await setupWorkspace(alpha.page, "alpha");
    await setupWorkspace(beta.page, "beta");

    await openLivePanel(alpha.page);
    await openLivePanel(beta.page);
    await joinRoom(alpha.page, roomId);
    await joinRoom(beta.page, roomId);

    await alpha.page.locator("[data-action='live-ping']").click();
    await sendChat(alpha.page, "Message QA P2P alpha");
    await addFragmentComment(alpha.page, "Commentaire QA fragment");
    await alpha.page.locator("[data-action='live-offer-fragment']").first().click();
    await acceptAndImportOfferedFragment(beta.page);
    await openLivePanel(beta.page);
    await alpha.page.locator("[data-action='live-offer-fragment']").first().click();
    await declineOfferedFragment(beta.page);

    await assertVisible(alpha.page, ".live-peer-graph", "constellation alpha");
    await assertVisible(alpha.page, ".live-peer-card", "carte pair alpha");
    await assertVisible(alpha.page, ".live-message", "message alpha");
    await assertVisible(alpha.page, ".live-comment", "commentaire local alpha");
    await assertVisible(alpha.page, ".toast.is-visible", "toast offre alpha");
    await assertLiveHealthy(alpha.page, "alpha");
    await assertLiveHealthy(beta.page, "beta");

    const peerSeen = await waitForPeerDiscovery(alpha.page, beta.page);
    const peerReport = peerSeen ? "Pairs detectes entre les deux contextes." : "Aucun pair distant detecte pendant la fenetre QA; UI et transport local verifies.";
    await writeFile(join(qaDir, "peer-discovery.txt"), `${peerReport}\nroom=${roomId}\n`);

    await alpha.page.screenshot({ path: join(qaDir, "alpha-live.png"), fullPage: true });
    await beta.page.screenshot({ path: join(qaDir, "beta-live.png"), fullPage: true });

    await alpha.page.locator("[data-action='live-private-room']").click();
    await assertVisible(alpha.page, ".live-invite-link input", "lien invitation privee");
    const invite = await alpha.page.locator(".live-invite-link input").inputValue();
    if (!/#room=.+&key=/.test(invite)) throw new Error(`Lien prive invalide: ${invite}`);
    await alpha.page.screenshot({ path: join(qaDir, "alpha-private-room.png"), fullPage: true });
  } finally {
    await alpha.context.close();
    await beta.context.close();
  }
}

async function createClient(browser, label) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  attachDiagnostics(page, label);
  return { context, page };
}

async function setupWorkspace(page, label) {
  await page.goto(`${baseUrl}?home=1`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await assertVisible(page, ".welcome-hero", `accueil ${label}`);
  await page.getByRole("button", { name: /Profil vierge/i }).click();
  await page.waitForSelector(".blank-workspace:not([hidden])", { timeout: 12000 });
  await page.locator(".blank-workspace [data-action='open-library']").click();
  await page.locator(".catalog-card[data-type='rich-text']").click();
  await page.waitForSelector(".module[data-load-state='ready']", { timeout: 14000 });
}

async function openLivePanel(page) {
  await page.locator("[data-action='open-live']").first().click();
  await assertVisible(page, ".live-panel", "panneau live");
}

async function joinRoom(page, room) {
  await page.locator("[data-live-room]").fill(room);
  await page.locator("[data-action='live-join']").evaluate((button) => button.click());
  try {
    await page.waitForFunction(() => document.querySelector(".profile-header__live")?.innerText.includes("Live P2P"), null, { timeout: 12000 });
    await page.waitForSelector(".live-peer", { timeout: 12000 });
  } catch (error) {
    const state = await page.evaluate(() => ({
      badge: document.querySelector("[data-live-badge]")?.innerText || "",
      panel: document.querySelector(".live-panel")?.innerText || "",
      checked: document.querySelector("[data-live-enabled]")?.checked ?? null,
      room: document.querySelector("[data-live-room]")?.value || "",
      toast: document.querySelector(".toast")?.innerText || ""
    }));
    throw new Error(`Join Live incomplet\n${JSON.stringify(state, null, 2)}\n${error.stack || error}`);
  }
}

async function sendChat(page, text) {
  await page.locator("[data-live-chat-form] input[name='message']").fill(text);
  await page.locator("[data-live-chat-form]").evaluate((form) => form.requestSubmit());
}

async function addFragmentComment(page, text) {
  const form = page.locator("[data-live-comment-form]").first();
  await form.locator("input[name='comment']").fill(text);
  await form.evaluate((node) => node.requestSubmit());
  const created = await page.locator(".live-comment").first().waitFor({ state: "visible", timeout: 2500 }).then(() => true).catch(() => false);
  if (created) return;
  const retry = page.locator("[data-live-comment-form]").first();
  await retry.locator("input[name='comment']").fill(text);
  await retry.evaluate((node) => node.requestSubmit());
}

async function acceptAndImportOfferedFragment(page) {
  await page.locator("[data-action='live-accept-offer']").first().waitFor({ state: "visible", timeout: 18000 });
  const before = await page.locator(".module[data-load-state='ready']").count();
  await page.locator("[data-action='live-accept-offer']").first().click();
  await page.locator("[data-action='live-import-received']").first().waitFor({ state: "visible", timeout: 18000 });
  await page.locator("[data-action='live-import-received']").first().click();
  await page.waitForFunction((count) => document.querySelectorAll(".module[data-load-state='ready']").length > count, before, { timeout: 18000 });
}

async function declineOfferedFragment(page) {
  await page.locator("[data-action='live-decline-offer']").first().waitFor({ state: "visible", timeout: 18000 });
  await page.locator("[data-action='live-decline-offer']").first().click();
  await page.waitForFunction(() => !document.querySelector("[data-action='live-decline-offer']"), null, { timeout: 8000 });
}

async function waitForPeerDiscovery(...pages) {
  const deadline = Date.now() + 14000;
  while (Date.now() < deadline) {
    const counts = await Promise.all(pages.map((page) => page.locator(".live-peer").count().catch(() => 0)));
    if (counts.some((count) => count > 1)) return true;
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  return false;
}

async function assertLiveHealthy(page, label) {
  const state = await page.evaluate(() => ({
    status: document.querySelector("[data-live-badge]")?.innerText || "",
    panel: document.querySelector(".live-panel")?.innerText || "",
    moduleCount: document.querySelectorAll(".module[data-load-state='ready']").length,
    livePeers: document.querySelectorAll(".live-peer").length,
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));
  if (!state.status.includes("Live P2P")) throw new Error(`${label}: badge P2P absent\n${JSON.stringify(state, null, 2)}`);
  if (!state.panel.includes(roomId)) throw new Error(`${label}: room absente du panneau Live\n${JSON.stringify(state, null, 2)}`);
  if (state.moduleCount < 1) throw new Error(`${label}: aucun fragment pret\n${JSON.stringify(state, null, 2)}`);
  if (state.livePeers < 1) throw new Error(`${label}: presence locale absente\n${JSON.stringify(state, null, 2)}`);
  if (state.horizontalOverflow > 4) throw new Error(`${label}: debordement horizontal ${state.horizontalOverflow}px`);
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
      appText: document.querySelector("#app")?.innerText?.slice(0, 800)
    }));
    throw new Error(`${label} introuvable ou masque: ${selector}\n${JSON.stringify(state, null, 2)}`);
  }
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
