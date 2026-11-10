/* Export an isolated QA copy. Only three read-only dev probes and the copy's
 * Metro blockList differ; production sources/configuration remain untouched. */
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  { spawn } = require("node:child_process");
const root = path.resolve(__dirname, ".."),
  reportDir = path.resolve(root, "../docs/build"),
  stamp = new Date().toISOString().replace(/[:.]/g, "-"),
  copy = path.join(root, ".tools", "qa-web-" + stamp);
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const records = [],
  patches = [];
function duplicate(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const e of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, e.name),
      to = path.join(destination, e.name);
    if (e.isDirectory()) duplicate(from, to);
    else {
      fs.copyFileSync(from, to);
      records.push({
        file: path.relative(root, from).replaceAll("\\", "/"),
        sha256: hash(fs.readFileSync(from)),
      });
    }
  }
}
async function main() {
  duplicate(path.join(root, "src"), path.join(copy, "src"));
  for (const name of [
    "package.json",
    "package-lock.json",
    "app.json",
    "metro.config.js",
    "tsconfig.json",
  ]) {
    fs.copyFileSync(path.join(root, name), path.join(copy, name));
    records.push({
      file: name,
      sha256: hash(fs.readFileSync(path.join(root, name))),
    });
  }
  // Junctions share read-only dependencies/assets; the output is an independent export.
  for (const name of ["node_modules", "assets"])
    fs.symlinkSync(path.join(root, name), path.join(copy, name), "junction");
  for (const name of [
    "src/state/Studio.tsx",
    "src/scene/Plan.tsx",
    "src/scene/Viewport.tsx",
  ]) {
    const file = path.join(copy, name),
      source = fs.readFileSync(file, "utf8");
    if (source.split("if (!__DEV__) return;").length !== 2)
      throw Error("Unexpected probe guard: " + name);
    fs.writeFileSync(
      file,
      source.replace(
        "if (!__DEV__) return;",
        "// QA COPY: enable the read-only diagnostic probe.",
      ),
    );
    patches.push({
      file: name,
      purpose: "Enable existing read-only dev diagnostic",
      sha256: hash(fs.readFileSync(file)),
    });
  }
  const metro = path.join(copy, "metro.config.js");
  fs.appendFileSync(
    metro,
    "\n// Isolate every QA graph and transform cache.\nmodule.exports.resolver.blockList = [];\nmodule.exports.cacheVersion = __dirname;\nmodule.exports.cacheStores = ({ FileStore }) => [new FileStore({root: require('node:path').join(__dirname, '.transform-cache')})];\nmodule.exports.fileMapCacheDirectory = require('node:path').join(__dirname, '.file-map-cache');\n",
  );
  patches.push({
    file: "metro.config.js",
    purpose: "Allow isolated .tools source and isolate graph/transform caches",
    sha256: hash(fs.readFileSync(metro)),
  });
  const fd = fs.openSync(path.join(reportDir, "frozen-web-export.log"), "w");
  const exit = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        path.join(copy, "node_modules/expo/bin/cli"),
        "export",
        "--platform",
        "web",
        "--source-maps",
        "--clear",
        "--output-dir",
        "web",
      ],
      {
        cwd: copy,
        env: { ...process.env, CI: "1" },
        stdio: ["ignore", fd, fd],
      },
    );
    child.on("error", reject);
    child.on("exit", resolve);
  });
  fs.closeSync(fd);
  const compiled = new Map();
  const inspectMap = (map) => {
    (map.sources || []).forEach((source, i) => {
      if (!source.startsWith("/src/")) return;
      const file = path.join(copy, source.slice(1));
      if (fs.existsSync(file) && fs.statSync(file).isFile())
        compiled.set(source.slice(1), {
          file: source.slice(1),
          matches: fs.readFileSync(file, "utf8") === map.sourcesContent?.[i],
        });
    });
    (map.sections || []).forEach((section) => inspectMap(section.map));
  };
  const inspectDirectory = (directory) => {
    for (const e of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, e.name);
      if (e.isDirectory()) inspectDirectory(file);
      else if (e.name.endsWith(".map"))
        inspectMap(JSON.parse(fs.readFileSync(file, "utf8")));
    }
  };
  if (exit === 0) inspectDirectory(path.join(copy, "web"));
  const compiledSources = [...compiled.values()];
  const stable = records.every(
    (r) => hash(fs.readFileSync(path.join(root, r.file))) === r.sha256,
  );
  const report = {
    at: new Date().toISOString(),
    exit,
    stable,
    accepted:
      exit === 0 &&
      stable &&
      compiledSources.length > 0 &&
      compiledSources.every((s) => s.matches),
    sourceFiles: records,
    patches,
    compiledSources,
    compiledMatches: compiledSources.filter((s) => s.matches).length,
    directory: copy,
    webRoot: path.join(copy, "web"),
    physicalNativeValidation: false,
  };
  fs.writeFileSync(
    path.join(reportDir, "frozen-web-export.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      exit,
      stable,
      sourceFiles: records.length,
      patches: patches.length,
      webRoot: report.webRoot,
    }),
  );
  if (
    exit !== 0 ||
    !stable ||
    !compiledSources.length ||
    compiledSources.some((s) => !s.matches)
  )
    process.exitCode = 1;
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
