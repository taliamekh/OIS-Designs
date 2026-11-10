/* Real pointer/browser verification, with read-only development state probes. */
const {
  chromium,
} = require("C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
let browser, page;
const checks = [],
  errors = [];
(async () => {
  browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-webgl"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const read = () => page.evaluate(() => globalThis.__oisReadLibrary());
  const current = async () => {
    const l = await read();
    return l.projects.find((h) => h.present.id === l.activeId);
  };
  const drag = async (x, y, dx, dy) => {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 10 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(200);
  };
  const target = async (id) => {
    const probe = await page.evaluate(() => globalThis.__oisSceneProbe());
    const t = probe.items.find((i) => i.id === id);
    assert.ok(t, "rendered item projection exists");
    const box = await page.locator("canvas").boundingBox();
    return { x: box.x + t.x, y: box.y + t.y, probe };
  };
  await page.goto(((process.env.OIS_QA_BASE_URL || "http://localhost:8081") + ''), {
    timeout: 120000,
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("button", { name: "Open Maple House", exact: true })
    .click();
  await page.waitForFunction(
    () => globalThis.__oisSceneProbe?.().items.length >= 3,
    { timeout: 90000 },
  );
  let h = await current();
  const table = h.present.floors[0].items.find((i) =>
    i.assetId.includes("coffee"),
  );
  assert.ok(table);
  let t = await target(table.id),
    before = h;
  await drag(t.x, t.y, 12, 0);
  h = await current();
  let item = h.present.floors[0].items.find((i) => i.id === table.id);
  assert.notDeepEqual(
    [item.x, item.z],
    [table.x, table.z],
    "3D drag must move the object",
  );
  assert.equal(h.past.length, before.past.length + 1);
  const camera = await page.evaluate(() => globalThis.__oisSceneProbe().camera);
  assert.deepEqual(
    camera,
    t.probe.camera,
    "object drag must suspend camera orbit",
  );
  checks.push("3D quick move owns gesture and creates one undo command");
  await page
    .getByRole("button", { name: "Lock selected furniture", exact: true })
    .click();
  h = await current();
  item = h.present.floors[0].items.find((i) => i.id === table.id);
  assert.equal(item.locked, true);
  t = await target(table.id);
  const locked = JSON.stringify(h.present);
  await drag(t.x, t.y, 20, 5);
  assert.equal(
    JSON.stringify((await current()).present),
    locked,
    "locked canvas drag cannot edit geometry",
  );
  checks.push("locked 3D object resists direct drag");
  await page
    .getByRole("button", { name: "Unlock selected furniture", exact: true })
    .click();
  const yawBefore = (await current()).present.floors[0].items.find(
    (i) => i.id === table.id,
  ).yaw;
  const handle = await page
    .getByLabel("Drag rotation handle", { exact: true })
    .boundingBox();
  await drag(handle.x + 22, handle.y + 22, 20, 0);
  assert.notEqual(
    (await current()).present.floors[0].items.find((i) => i.id === table.id)
      .yaw,
    yawBefore,
  );
  checks.push("deliberate rotation handle commits rotation");
  await page.getByRole("button", { name: "View 2D", exact: true }).click();
  await page.waitForTimeout(250);
  h = await current();
  item = h.present.floors[0].items.find((i) => i.id === table.id);
  const room = h.present.floors[0].rooms[0],
    xs = room.polygon.map((p) => p.x),
    zs = room.polygon.map((p) => p.z),
    minX = Math.min(...xs),
    minZ = Math.min(...zs),
    w = Math.max(...xs) - minX,
    d = Math.max(...zs) - minZ;
  const plan = await page.getByTestId("plan-canvas").boundingBox();
  const scale = Math.min((390 - 55) / w, (780 - 240) / d),
    planY = plan.y;
  await drag(
    28 + (item.x - minX) * scale,
    planY + 128 + (item.z - minZ) * scale,
    8,
    8,
  );
  const moved = (await current()).present.floors[0].items.find(
    (i) => i.id === table.id,
  );
  console.log(
    JSON.stringify({
      plan: await page.evaluate(() => globalThis.__oisPlanProbe()),
      before: item,
      after: moved,
    }),
  );
  assert.notDeepEqual(
    [moved.x, moved.z],
    [item.x, item.z],
    "2D drag must change position",
  );
  checks.push("2D direct drag commits through the same domain");
  await page.getByRole("button", { name: "View Walk", exact: true }).click();
  await page.waitForTimeout(300);
  const walkBefore = JSON.stringify((await current()).present);
  await drag(320, 320, 24, 12);
  await drag(100, 430, 0, -20);
  assert.equal(JSON.stringify((await current()).present), walkBefore);
  assert.equal(
    await page.getByRole("button", { name: "Furnish", exact: true }).count(),
    0,
  );
  checks.push(
    "Walk camera gestures preserve full project bytes and hide editing actions",
  );
  await page.getByRole("button", { name: "View 3D", exact: true }).click();
  await page.getByRole("button", { name: "Surfaces", exact: true }).click();
  await page.getByRole("button", { name: "Walls", exact: true }).click();
  h = await current();
  const f = h.present.floors[0],
    walls = f.walls.filter((w) =>
      w.faces.some((face) => face.roomId === room.id),
    ),
    shared = walls.findIndex((w) => w.faces.length === 2);
  assert.ok(shared >= 0);
  await page
    .getByRole("button", { name: `Wall ${shared + 1}`, exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "HEX colour", exact: true })
    .fill("#4b667d");
  const other = f.rooms.find((r) => r.id !== room.id),
    otherBefore = JSON.stringify(other.wallFaces);
  await page
    .getByRole("button", { name: "Paint selected wall", exact: true })
    .click();
  h = await current();
  assert.equal(
    h.present.floors[0].rooms[0].wallFaces[walls[shared].id].colour,
    "#4b667d",
  );
  assert.equal(
    JSON.stringify(
      h.present.floors[0].rooms.find((r) => r.id === other.id).wallFaces,
    ),
    otherBefore,
  );
  await page
    .getByRole("button", { name: "Apply to room", exact: true })
    .click();
  h = await current();
  assert.equal(
    Object.keys(h.present.floors[0].rooms[0].wallFaces).length,
    walls.length,
  );
  assert.equal(
    JSON.stringify(
      h.present.floors[0].rooms.find((r) => r.id === other.id).wallFaces,
    ),
    otherBefore,
  );
  checks.push(
    "shared wall painting and whole-room apply isolate the opposite room",
  );
  assert.deepEqual(errors, []);
  const out = path.resolve(
    __dirname,
    "../../docs/build/interaction-result.json",
  );
  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        checks,
        errors,
        physicalNativeValidated: false,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ checks, errors }));
  await browser.close();
})().catch(async (e) => {
  console.error(e);
  if (page)
    console.log(
      JSON.stringify({
        body: await page.locator("body").innerText(),
        probe: await page.evaluate(() => globalThis.__oisPlanProbe?.()),
      }),
    );
  if (page)
    await page.screenshot({
      path: path.resolve(__dirname, "../../docs/build/interaction-failure.png"),
    });
  fs.writeFileSync(
    path.resolve(__dirname, "../../docs/build/interaction-failure.json"),
    JSON.stringify(
      { at: new Date().toISOString(), checks, errors, error: String(e) },
      null,
      2,
    ),
  );
  if (browser) await browser.close();
  process.exitCode = 1;
});
