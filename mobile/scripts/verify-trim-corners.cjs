/* Compare actual trim end vertices after the production WallFace transforms. */
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const ts = require("typescript");
const mobile = path.resolve(__dirname, "..");
require.extensions[".ts"] = (mod, file) =>
  mod._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    file,
  );
const load = (file) => require(path.join(mobile, file)),
  THREE = require("three");
const P = load("src/domain/project.ts"),
  G = load("src/domain/geometry.ts"),
  M = load("src/scene/meshes.ts");
const files = [
    "src/scene/meshes.ts",
    "src/scene/RoomScene.tsx",
    "src/domain/project.ts",
  ],
  sha = (b) => crypto.createHash("sha256").update(b).digest("hex"),
  snapshot = () =>
    Object.fromEntries(
      files.map((f) => [f, sha(fs.readFileSync(path.join(mobile, f)))]),
    ),
  before = snapshot();
const eq = (a, b) => G.distance(a, b) < 1e-5;
const cases = [];
const polygons = {
  square: [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 4, z: 4 },
    { x: 0, z: 4 },
  ],
  trapezoid: [
    { x: 0, z: 0 },
    { x: 5, z: 0 },
    { x: 4, z: 3 },
    { x: 0, z: 3 },
  ],
  L: G.shapePolygon("l", 6, 6),
};
for (const profile of ["flat", "bevel", "ogee", "stepped"])
  for (const mixedProjection of [false, true])
    for (const [name, points] of Object.entries(polygons))
      for (const reversed of [false, true])
        for (const thickness of [0.12, 0.15, 0.3]) {
          let p = P.makeProject(
              "living",
              6,
              6,
              2.7,
              "draw",
              reversed ? [...points].reverse() : points,
            ),
            floor = p.floors[0],
            room = floor.rooms[0];
          room.trim.profile = profile;
          if (mixedProjection)
            for (const [index, wall] of floor.walls.entries())
              room.trimOverrides[wall.id] = {
                ...room.trim,
                projection: index % 2 ? 0.025 : 0.012,
              };
          const editedWall = floor.walls[0],
            command = {
              type: "wall-thickness",
              floorId: floor.id,
              wallId: editedWall.id,
              thickness,
            };
          const applied = P.execute(
            { past: [], present: p, future: [] },
            command,
            "3d",
            [],
          );
          if (applied.error)
            throw Error("Fixture thickness rejected: " + applied.error);
          p = applied.history.present;
          floor = p.floors[0];
          room = floor.rooms[0];
          const ends = [];
          for (const wall of floor.walls) {
            const sign = wall.faces.find((f) => f.roomId === room.id).reversed
                ? -1
                : 1,
              len = G.distance(wall.a, wall.b),
              angle = -Math.atan2(wall.b.z - wall.a.z, wall.b.x - wall.a.x),
              start = sign === 1 ? wall.a : wall.b,
              end = sign === 1 ? wall.b : wall.a;
            const trim = room.trimOverrides[wall.id] ?? room.trim,
              geometry = M.trimGeometry(
                trim,
                len,
                M.trimCornerMiter(floor, room, wall, true),
                M.trimCornerMiter(floor, room, wall, false),
                wall.thickness / 2,
              ),
              n = M.trimProfile(trim).length;
            const parent = new THREE.Matrix4().makeRotationY(angle);
            parent.setPosition(wall.a.x, 0, wall.a.z);
            const child = new THREE.Matrix4().makeRotationY(
              sign === 1 ? 0 : Math.PI,
            );
            child.setPosition(
              sign === 1 ? 0 : len,
              0,
              (sign * wall.thickness) / 2,
            );
            const matrix = parent.multiply(child),
              positions = geometry.attributes.position;
            for (const [endpoint, offset] of [
              [start, 0],
              [end, n],
            ])
              ends.push({
                point: endpoint,
                wallId: wall.id,
                thickness: wall.thickness,
                vertices: Array.from({ length: n }, (_, i) =>
                  new THREE.Vector3()
                    .fromBufferAttribute(positions, offset + i)
                    .applyMatrix4(matrix),
                ),
              });
            geometry.dispose();
          }
          const corners = room.polygon.map((point) => {
            const matching = ends.filter((e) => eq(e.point, point));
            if (matching.length !== 2)
              throw Error("Expected two meeting trim ends");
            const gaps = matching[0].vertices.map((v, i) =>
              v.distanceTo(matching[1].vertices[i]),
            );
            return {
              point,
              wallThicknesses: matching.map((e) => e.thickness),
              maxEndpointGapMetres: Math.max(...gaps),
              gaps,
            };
          });
          cases.push({
            name,
            profile,
            mixedProjection,
            reversed,
            editedThickness: thickness,
            commandAccepted: true,
            maxEndpointGapMetres: Math.max(
              ...corners.map((c) => c.maxEndpointGapMetres),
            ),
            pass: corners.every((c) => c.maxEndpointGapMetres < 1e-5),
            corners,
          });
        }
const after = snapshot(),
  result = {
    checkedAtUtc: new Date().toISOString(),
    before,
    after,
    stableSource: JSON.stringify(before) === JSON.stringify(after),
    passed: cases.filter((c) => c.pass).length,
    failed: cases.filter((c) => !c.pass).length,
    cases,
    limits:
      "Actual trimGeometry/cornerMiter and accepted wall-thickness command, with source-matched WallFace matrices. CPU world-space endpoint comparison; not a browser/native screenshot, GPU or device run.",
  };
const out = path.resolve(__dirname, "../../docs/build/trim-corners");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, "result.json"),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    { ...result, cases: cases.map(({ corners, ...row }) => row) },
    null,
    2,
  ),
);
process.exitCode = result.stableSource && !result.failed ? 0 : 1;
