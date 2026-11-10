const { chromium } = require('C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs'), path = require('node:path');
const {createLoader}=require('./source-loader.cjs'),{appFrozenUI}=require('./app-frozen-context.cjs');
let p,g,s,ownedUI;
const { readLibrary, oracleInfo } = require('./web-storage.cjs');
const report = { timestamp: new Date().toISOString(), baseURL: process.env.OIS_QA_URL || 'http://localhost:8081', evidence: 'Actual partial shared-wall annotations on four sides, metric/imperial and two phone sizes. Isolated validated synthetic projects; no native claim.', storageOracle: oracleInfo, runs: [] };
const sides = {
  right: { x: 6, z: 1, width: 4, depth: 3 },
  left: { x: -4, z: 1, width: 4, depth: 3 },
  top: { x: 1, z: -3, width: 4, depth: 3 },
  bottom: { x: 1, z: 6, width: 4, depth: 3 },
};
async function main() {
  const ui=ownedUI=await appFrozenUI(),{load}=createLoader(ui.project);p=load('src/domain/project.ts');g=load('src/domain/geometry.ts');s=load('src/domain/persistence.ts');report.baseURL=ui.url;report.ui={kind:ui.kind,id:ui.id,url:ui.url,sourceHash:ui.sourceHash,sourceMapPass:ui.sourceMapPass,compiledSourceMatchCount:ui.compiledSourceMatchCount,plan:ui.sources['src/scene/Plan.tsx']};if(ui.sources['src/storage/indexedStore.ts'].sha256!==oracleInfo.sha256)throw Error('Selected adapter differs from reader');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    matrix: for (const width of [390, 320]) for (const unit of ['m', 'ft']) for (const [side, a] of Object.entries(sides)) {
      if (process.env.OIS_QA_CASE && process.env.OIS_QA_CASE !== `${side}-${unit}-${width}`) continue;
      const viewport = { width, height: width === 390 ? 844 : 568 };
      const project = p.makeProject('living', 6, 6); project.name = `QA dimensions ${side} ${unit} ${width}`;
      const f = project.floors[0];
      f.rooms.push(p.makeRoom('kitchen', 'Kitchen', g.shapePolygon('rectangle', a.width, a.depth, { x: a.x, z: a.z })));
      f.walls = g.rebuildWalls(f.rooms);
      const wall = f.walls.find(w => w.faces.length === 2);
      const opening = { id: 'qa-opening', wallId: wall.id, type: 'single', offset: .65, width: .9, height: 2.1, sill: 0, hinge: 'left', flip: false };
      f.openings.push(opening);
      const library = { version: 1, projects: [{ past: [], present: project, future: [] }], activeId: project.id, favourites: [], recent: [], settings: { unit, grid: true, quickMove: true, appearance: 'system' }, lastDoor: { type: 'single', width: .9, height: 2.1, hinge: 'left', flip: false, repeat: true } };
      const raw = s.encode(library); s.decode(raw);
      const run = { side, unit, viewport, checks: [], errors: [], consoleErrors: [] }; report.runs.push(run);
      const check = (id, pass, observed) => run.checks.push({ id, pass: !!pass, observed });
      const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
      await context.addInitScript(raw => { if (localStorage.getItem('ois.library.v1') === null) localStorage.setItem('ois.library.v1', raw); }, raw);
      const page = await context.newPage(); page.setDefaultTimeout(7000);
      page.on('pageerror', e => run.errors.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') run.consoleErrors.push(m.text().slice(0, 1300)); });
      try {
        const response = await page.goto(report.baseURL, { waitUntil: 'domcontentloaded', timeout: 45000 });
        if (response.status() >= 500) throw Error('Preview HTTP' + response.status());
        await page.getByRole('button', { name: 'Open ' + project.name, exact: true }).click({ timeout: 45000 });
        await page.getByRole('button', { name: 'View 2D', exact: true }).click();
        const along = (opening.offset + opening.width / 2) / g.distance(wall.a, wall.b); const physical = { x: wall.a.x + (wall.b.x - wall.a.x) * along, z: wall.a.z + (wall.b.z - wall.a.z) * along };
        const tap = await page.locator('svg').evaluateAll((svgs, physical) => {
          const svg = [...svgs].sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0];
          const box = svg.getBoundingClientRect(), v = svg.querySelector('polygon').getAttribute('points').trim().split(/[ ,]+/).map(Number);
          const scale = (v[2] - v[0]) / 6;
          return { x: box.x + v[0] + physical.x * scale, y: box.y + v[1] + physical.z * scale };
        }, physical);
        await page.touchscreen.tap(tap.x, tap.y);
        await page.getByRole('button', { name: 'Close Opening', exact: true }).click();
        const actual = await page.locator('svg').evaluateAll(svgs => {
          const svg = [...svgs].sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0];
          const b = svg.getBoundingClientRect(), v = svg.querySelector('polygon').getAttribute('points').trim().split(/[ ,]+/).map(Number), scale = (v[2] - v[0]) / 6, rows = [];
          for (const group of svg.querySelectorAll('g')) {
            const texts = [...group.children].filter(el => el.tagName.toLowerCase() === 'text');
            if (texts.length !== 4) continue;
            const line = [...group.children].find(el => el.tagName.toLowerCase() === 'line');
            rows.push({ name: texts[3].textContent.split(' · ')[0].trim(), caption: texts[3].textContent, values: texts.slice(0, 3).map(el => el.textContent), chainLengthMetres: line?.getTotalLength() / scale,
              boxes: texts.map(el => { const r = el.getBoundingClientRect(); return { text: el.textContent, x: r.x, y: r.y, width: r.width, height: r.height, inside: r.left >= b.left - 1 && r.right <= Math.min(b.right, innerWidth) + 1 && r.top >= b.top - 1 && r.bottom <= Math.min(b.bottom, innerHeight) + 1 }; }) });
          }
          const annotations = new Set();
          for (const group of svg.querySelectorAll('g')) {
            const direct = [...group.children].filter(el => el.tagName.toLowerCase() === 'text');
            if (direct.length === 4) direct.forEach(el => annotations.add(el));
          }
          const overlaps = [];
          for (const el of annotations) for (const other of svg.querySelectorAll('text')) {
            if (el === other || annotations.has(other)) continue;
            const r = el.getBoundingClientRect(), q = other.getBoundingClientRect();
            const area = Math.max(0, Math.min(r.right, q.right) - Math.max(r.left, q.left)) * Math.max(0, Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top));
            const fraction = area / Math.min(r.width * r.height, q.width * q.height);
            if (area > 3 && fraction > .25) overlaps.push({ annotation: el.textContent, ordinaryLabel: other.textContent, intersectionPixels: area, fractionOfSmaller: fraction, annotationBox: { x: r.x, y: r.y, width: r.width, height: r.height }, ordinaryBox: { x: q.x, y: q.y, width: q.width, height: q.height } });
          }
          return { scale, rows, overlaps };
        });
        run.actual = actual;
        // Analytic fixture oracle: the six-metre living edge begins at0;
        // its shared sub-edge begins at1; finished corners are inset6cm. Kitchen's edge is3m (sides) or4m
        // (top/bottom). This stays independent of the production span helper.
        const kitchenLength = side === 'right' || side === 'left' ? 3 : 4;
        const expected = [
          { name: 'Living room', before: 1.59, after: 3.39 },
          { name: 'Kitchen', before: .59, after: kitchenLength - .65 - .9 - .06 },
        ]; run.expected = expected;
        for (const chain of expected) {
          const row = actual.rows.find(r => r.name === chain.name), values = [g.measure(chain.before, unit), g.measure(opening.width, unit), g.measure(chain.after, unit)].sort();
          check('physical-corner-values-' + chain.name, !!row && JSON.stringify([...row.values].sort()) === JSON.stringify(values), { expected: values, actual: row?.values });
          check('chain-reaches-real-corners-' + chain.name, !!row && Math.abs(row.chainLengthMetres - chain.before - opening.width - chain.after) < 1e-4, { expectedMetres: chain.before + opening.width + chain.after, actualMetres: row?.chainLengthMetres });
          check('all-labels-fit-' + chain.name, !!row && row.boxes.every(b => b.inside), row?.boxes);
        }
        check('annotations-do-not-overlap-ordinary-plan-labels', actual.overlaps.length === 0, actual.overlaps);
        check('inspection-preserves-project', JSON.stringify((await readLibrary(page)).projects[0].present) === JSON.stringify(project));
        const screenshot = `door-matrix-${side}-${unit}-${width}.png`; await page.screenshot({ path: path.join(__dirname, screenshot) }); run.screenshot = screenshot; run.completed = true;
      } catch (e) {
        run.failure = String(e); run.body = (await page.locator('body').innerText().catch(() => '')).slice(-2800);
      } finally { await context.close(); }
      if (run.failure?.includes('Preview HTTP500')) { report.aborted = 'Preview boot failed; remaining layouts were not attempted.'; break matrix; }
    }
  } finally { await browser.close(); await ownedUI.close(); ownedUI=null; }
  report.passed = report.runs.flatMap(r => r.checks).filter(c => c.pass).length;
  report.failed = report.runs.flatMap(r => r.checks).filter(c => !c.pass).length;
  fs.writeFileSync(path.join(__dirname, process.argv[2] || 'door-dimension-matrix.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ ...report, runs: report.runs.map(r => ({ ...r, actual: undefined, expected: undefined, checks: r.checks.filter(c => !c.pass) })) }, null, 2) + '\n');
}
main().catch(async e => { if(ownedUI) await ownedUI.close(); report.harnessError = String(e); fs.writeFileSync(path.join(__dirname, 'door-dimension-matrix.json'), JSON.stringify(report, null, 2) + '\n'); process.stderr.write(e.stack + '\n'); process.exitCode = 1; });
