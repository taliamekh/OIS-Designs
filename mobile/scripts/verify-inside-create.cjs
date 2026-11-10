/* Typed room sizes across templates/custom outlines, using an independent
 * intersection of the known12cm physical walls' inside face planes. */
const {
  chromium,
} = require("C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const out = path.resolve(__dirname, "../../docs/build"),
  runs = [],
  errors = [];
function physicalSpans(room) {
  const p = room.polygon,
    area = p.reduce((sum, a, i) => {
      const b = p[(i + 1) % p.length];
      return sum + a.x * b.z - b.x * a.z;
    }, 0),
    sign = area < 0 ? -1 : 1;
  const lines = p.map((a, i) => {
    const b = p[(i + 1) % p.length],
      dx = b.x - a.x,
      dz = b.z - a.z,
      length = Math.hypot(dx, dz);
    return {
      a: {
        x: a.x - ((sign * dz) / length) * 0.06,
        z: a.z + ((sign * dx) / length) * 0.06,
      },
      d: { x: dx, z: dz },
    };
  });
  const corners = lines.map((line, i) => {
    const previous = lines[(i + lines.length - 1) % lines.length],
      cross = (a, b) => a.x * b.z - a.z * b.x,
      denominator = cross(previous.d, line.d);
    assert.ok(Math.abs(denominator) > 1e-8);
    const t =
      cross(
        { x: line.a.x - previous.a.x, z: line.a.z - previous.a.z },
        line.d,
      ) / denominator;
    return {
      x: previous.a.x + t * previous.d.x,
      z: previous.a.z + t * previous.d.z,
    };
  });
  return {
    width:
      Math.max(...corners.map((p) => p.x)) -
      Math.min(...corners.map((p) => p.x)),
    depth:
      Math.max(...corners.map((p) => p.z)) -
      Math.min(...corners.map((p) => p.z)),
    corners,
  };
}
const cases = [
  {
    name: "Draw walls",
    label: "crossed-outline",
    unit: "m",
    invalid: true,
    points: [
      [0.15, 0.15],
      [0.8, 0.8],
      [0.8, 0.15],
      [0.15, 0.8],
    ],
  },
  { name: "Rectangle", unit: "m" },
  { name: "L-shape", unit: "m" },
  {
    name: "Draw walls",
    label: "custom-rectangle",
    unit: "m",
    points: [
      [0.15, 0.15],
      [0.8, 0.15],
      [0.8, 0.8],
      [0.15, 0.8],
    ],
  },
  {
    name: "Draw walls",
    label: "custom-concave",
    unit: "m",
    points: [
      [0.1, 0.1],
      [0.8, 0.1],
      [0.8, 0.4],
      [0.45, 0.4],
      [0.45, 0.8],
      [0.1, 0.8],
    ],
  },
  {
    name: "Draw walls",
    label: "custom-slanted",
    unit: "m",
    points: [
      [0.1, 0.15],
      [0.85, 0.25],
      [0.75, 0.8],
      [0.2, 0.8],
    ],
  },
  {
    name: "Draw walls",
    label: "custom-feet",
    unit: "ft",
    points: [
      [0.15, 0.15],
      [0.8, 0.15],
      [0.8, 0.8],
      [0.15, 0.8],
    ],
  },
];
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    for (const fixture of cases) {
      const context = await browser.newContext({
          viewport: { width: 390, height: 844 },
          isMobile: true,
          hasTouch: true,
        }),
        page = await context.newPage();
      page.setDefaultTimeout(12000);
      page.on("pageerror", (error) => errors.push(String(error)));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      const click = (name) =>
        page.getByRole("button", { name, exact: true }).click();
      await page.goto(process.env.OIS_QA_BASE_URL || "http://localhost:8081", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      if (fixture.unit === "ft") {
        await click("Settings");
        await click("ft");
        await click("Back");
      }
      await click("Create room or floor plan");
      await click("Living room");
      await click(fixture.name);
      const input = (value) =>
        (fixture.unit === "m" ? value : value / 0.3048).toFixed(6);
      for (const [name, value] of [
        ["Width", 4],
        ["Depth", 3],
        ["Ceiling height", 3.1],
      ])
        await page
          .getByRole("textbox", {
            name: `${name} (${fixture.unit})`,
            exact: true,
          })
          .fill(input(value));
      if (fixture.points) {
        const grid = page.getByLabel("Draw room outline", { exact: true });
        await grid.scrollIntoViewIfNeeded();
        const box = await grid.boundingBox();
        for (const [x, y] of fixture.points)
          await page.touchscreen.tap(
            box.x + box.width * x,
            box.y + box.height * y,
          );
      }
      const beforeCreate = await page.evaluate(() =>
        JSON.stringify(globalThis.__oisReadLibrary()),
      );
      await click("Create room");
      if (fixture.invalid) {
        await page
          .getByText(
            "Draw a closed outline with distinct corners and no crossing walls.",
            { exact: true },
          )
          .waitFor();
        assert.equal(
          await page.evaluate(() =>
            JSON.stringify(globalThis.__oisReadLibrary()),
          ),
          beforeCreate,
        );
        runs.push({ fixture, rejectedWithoutMutation: true });
        await context.close();
        continue;
      }
      await page.getByRole("button", { name: "Build", exact: true }).waitFor();
      const read = () =>
        page.evaluate(() => {
          const l = globalThis.__oisReadLibrary();
          return l.projects.find((h) => h.present.id === l.activeId);
        });
      const history = await read(),
        floor = history.present.floors[0],
        room = floor.rooms[0],
        physical = physicalSpans(room);
      assert.ok(floor.walls.every((w) => w.thickness === 0.12));
      assert.ok(
        Math.abs(physical.width - 4) < 1e-6 &&
          Math.abs(physical.depth - 3) < 1e-6,
        JSON.stringify({ fixture, physical }),
      );
      assert.ok(Math.abs(floor.ceiling - 3.1) < 1e-6);
      assert.equal(history.past.length, 0);
      await click("Build");
      await click("Room dimensions");
      const width = Number(
          await page
            .getByRole("textbox", {
              name: `Width (${fixture.unit})`,
              exact: true,
            })
            .inputValue(),
        ),
        depth = Number(
          await page
            .getByRole("textbox", {
              name: `Depth (${fixture.unit})`,
              exact: true,
            })
            .inputValue(),
        );
      assert.ok(
        Math.abs(width * (fixture.unit === "m" ? 1 : 0.3048) - 4) < 0.0002 &&
          Math.abs(depth * (fixture.unit === "m" ? 1 : 0.3048) - 3) < 0.0002,
      );
      await click("Apply dimensions");
      assert.deepEqual(
        (await read()).present.floors[0].rooms[0].polygon,
        room.polygon,
      );
      await page.screenshot({
        path: path.join(
          out,
          "screens/inside-create-" + (fixture.label || fixture.name) + ".png",
        ),
      });
      runs.push({
        fixture,
        physical,
        fields: { width, depth },
        emptyInitialHistory: true,
        untouchedApplyExact: true,
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  assert.deepEqual(errors, []);
})()
  .then(() => {
    fs.writeFileSync(
      path.join(out, "inside-create-ui.json"),
      JSON.stringify(
        { at: new Date().toISOString(), runs, errors, nativeValidation: false },
        null,
        2,
      ),
    );
    console.log(JSON.stringify({ cases: runs.length, errors }));
  })
  .catch((error) => {
    fs.writeFileSync(
      path.join(out, "inside-create-ui.json"),
      JSON.stringify(
        { at: new Date().toISOString(), runs, errors, failure: error.stack },
        null,
        2,
      ),
    );
    console.error(error);
    process.exitCode = 1;
  });
