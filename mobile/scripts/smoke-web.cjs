/* Browser evidence only. This does not validate native GL or physical touch. */
const fs = require("node:fs"),
  path = require("node:path");
const {
  chromium,
} = require("C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
let browser;
(async () => {
  const out = path.resolve(__dirname, "../../docs/build/screens");
  fs.mkdirSync(out, { recursive: true });
  browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-webgl"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(((process.env.OIS_QA_BASE_URL || "http://localhost:8081") + ''), {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page
    .getByRole("button", { name: "Create room or floor plan", exact: true })
    .waitFor({ timeout: 90000 });
  await page.screenshot({ path: path.join(out, "projects-light.png") });
  await page
    .getByRole("button", { name: "Open Maple House", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Furnish", exact: true })
    .waitFor({ timeout: 90000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(out, "editor-light.png") });
  await page.getByRole("button", { name: "Furnish", exact: true }).click();
  await page.getByRole("textbox", { name: "Search furniture" }).waitFor();
  await page.screenshot({ path: path.join(out, "catalogue-sheet.png") });
  await page
    .getByRole("button", { name: "Close Furniture", exact: true })
    .click();
  await page.getByRole("button", { name: "View 2D", exact: true }).click();
  await page.screenshot({ path: path.join(out, "plan-light.png") });
  await page.getByRole("button", { name: "View Walk", exact: true }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(out, "walk-light.png") });
  const result = {
    at: new Date().toISOString(),
    errors,
    url: page.url(),
    nativeValidation: false,
  };
  fs.writeFileSync(
    path.join(out, "smoke-result.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch(async (e) => {
  if (browser) await browser.close();
  console.error(e);
  process.exitCode = 1;
});
