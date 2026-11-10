/* Native JS/Hermes export with a before/after production input fingerprint. */
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  { spawn } = require("node:child_process");
const { sourceProvenance } = require("./source-provenance.cjs");
const mobile = path.resolve(__dirname, ".."),
  out = path.resolve(mobile, "../docs/build"),
  platform = process.argv[2];
if (!["ios", "android", "web"].includes(platform))
  throw Error("Pass ios, android or web.");
function snapshot() {
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else files.push(full);
    }
  };
  walk(path.join(mobile, "src"));
  walk(path.join(mobile, "assets/brand"));
  for (const name of [
    "package.json",
    "package-lock.json",
    "app.json",
    "metro.config.js",
    "tsconfig.json",
  ])
    files.push(path.join(mobile, name));
  const records = files
    .sort()
    .map((file) => [
      path.relative(mobile, file).replaceAll("\\", "/"),
      crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
    ]);
  return {
    files: records.length,
    sha256: crypto
      .createHash("sha256")
      .update(JSON.stringify(records))
      .digest("hex"),
  };
}
(async () => {
  const before = snapshot(),
    start = Date.now(),
    log = path.join(out, `export-${platform}-verified.log`),
    fd = fs.openSync(log, "w"),
    output = `.tools/export-${platform}-verified`;
  const command = [
    path.join(mobile, "node_modules/expo/bin/cli"),
    "export",
    "--platform",
    platform,
    "--source-maps",
    "--output-dir",
    output,
  ];
  const exit = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, command, {
      cwd: mobile,
      env: { ...process.env, CI: "1" },
      stdio: ["ignore", fd, fd],
    });
    child.on("error", reject);
    child.on("exit", resolve);
  });
  fs.closeSync(fd);
  const provenance =
    exit === 0 ? sourceProvenance(path.join(mobile, output), mobile) : null;
  const after = snapshot(),
    result = {
      at: new Date().toISOString(),
      platform,
      exit,
      elapsedSeconds: (Date.now() - start) / 1000,
      before,
      after,
      stable: before.sha256 === after.sha256,
      provenance,
      output,
      physicalNativeValidation: false,
    };
  fs.writeFileSync(
    path.join(out, `export-${platform}-verified.json`),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
  if (exit !== 0 || !result.stable || !provenance?.accepted)
    process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
