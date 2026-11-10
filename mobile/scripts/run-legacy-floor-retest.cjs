/* Execute runtime QA's exact immutable fixture/retest, keeping its evidence intact. */
const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module");
const source = path.resolve(
    __dirname,
    "../../docs/qa/runtime/retest-legacy-floor-settings.cjs",
  ),
  output = path.resolve(__dirname, "../../docs/build/legacy-floor-settings");
fs.mkdirSync(output, { recursive: true });
const local = Module.createRequire(source),
  probe = new Module(source);
probe.filename = source;
probe.paths = Module._nodeModulePaths(path.dirname(source));
probe.require = (id) =>
  id === "node:fs"
    ? {
        ...fs,
        mkdirSync: () => fs.mkdirSync(output, { recursive: true }),
        writeFileSync: (file, ...args) =>
          fs.writeFileSync(path.join(output, path.basename(file)), ...args),
      }
    : local(id);
probe._compile(fs.readFileSync(source, "utf8"), source);
