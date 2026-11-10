// Isolated browser context: no source edits, no user/browser storage, no Metro process control.
const { chromium } = require('C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const report = { timestamp: new Date().toISOString(), kind: 'Isolated web preview smoke; never native/physical-device evidence', errors: [], consoleErrors: [], requestsFailed: [], observations: {} };
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', isMobile: true, hasTouch: true });
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push(m.text().slice(0, 1500)); });
    page.on('requestfailed', r => report.requestsFailed.push({ url: r.url(), reason: r.failure()?.errorText }));
    try {
      const response = await page.goto('http://localhost:8081', { timeout: 45000, waitUntil: 'domcontentloaded' });
      report.httpStatus = response?.status();
      await page.getByText('Projects', { exact: true }).waitFor({ timeout: 45000 });
      await page.getByRole('button', { name: 'Create room or floor plan', exact: true }).waitFor({ timeout: 30000 });
      await page.getByRole('button', { name: 'Scan Room', exact: true }).waitFor({ timeout: 30000 });
      await page.waitForFunction(() => document.body.innerText.includes('Projects') && document.body.innerText.includes('Upload floor plan'), { timeout: 30000 });
      report.observations.home = await page.locator('body').innerText();
      report.observations.pageOverflow = await page.evaluate(() => ({ width: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth }));
      await page.screenshot({ path: path.join(__dirname, 'preview-home-390.png') });
      const badges = page.getByText('Coming soon', { exact: true });
      report.observations.badges = await badges.evaluateAll(list => list.map(el => { const s = getComputedStyle(el); return { text: el.textContent, colour: s.color, font: s.fontSize, box: el.getBoundingClientRect().toJSON() }; }));
      report.observations.homeLoaded = report.observations.home.includes('Projects') && report.observations.badges.length === 2;
      if (!report.observations.homeLoaded) throw Error('Readiness became unstable during capture; this is not a passing home-screen probe.');
    } catch (e) {
      report.failure = String(e);
      report.observations.body = (await page.locator('body').innerText().catch(() => '')).slice(0, 5000);
      await page.screenshot({ path: path.join(__dirname, 'preview-failure-390.png') }).catch(() => {});
    }
    await context.close();
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(__dirname, 'preview-smoke.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
})().catch(e => { report.harnessError = String(e); fs.writeFileSync(path.join(__dirname, 'preview-smoke.json'), JSON.stringify(report, null, 2) + '\n'); process.stderr.write(String(e) + '\n'); process.exitCode = 1; });
