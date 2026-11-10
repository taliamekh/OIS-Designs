/* Reuse the independent geometry probes without overwriting their QA evidence. */
const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module");
const name = process.argv[2];
if (
  ![
    "concave-trim-real-model",
    "trim-collision-coverage",
    "wall-clearance-audit",
    "door-leaf-clearance-audit",
    "boundary-repair-regression",
    "opening-corner-physical",
    "boundary-insertion-legacy",
  ].includes(name)
)
  throw Error("Choose a known boundary probe");
const source = path.resolve(__dirname, "../../docs/qa/design", name + ".cjs");
const output = path.resolve(__dirname, "../../docs/build/boundary-adoption");
fs.mkdirSync(output, { recursive: true });
const local = Module.createRequire(source),
  probe = new Module(source);
probe.filename = source;
probe.paths = Module._nodeModulePaths(path.dirname(source));
probe.require = (id) =>
  id === "node:fs"
    ? {
        ...fs,
        writeFileSync(file, ...args) {
          if (path.extname(file) !== ".json")
            throw Error("Unexpected probe write");
          return fs.writeFileSync(
            path.join(output, path.basename(file)),
            ...args,
          );
        },
      }
    : local(id);
probe._compile(fs.readFileSync(source, "utf8"), source);
