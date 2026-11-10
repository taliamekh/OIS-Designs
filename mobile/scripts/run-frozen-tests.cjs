/* Pin one verified snapshot for all checks; own and close its ephemeral server. */
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  { spawn } = require("node:child_process"),
  { createFrozenServer } = require("./serve-frozen.cjs"),
  report = require("../../docs/build/frozen-web-export.json"),
  mobile = path.resolve(__dirname, ".."),
  scripts = process.argv.slice(2);
if (!scripts.length || scripts.some((s) => !/^[\w-]+\.cjs$/.test(s)))
  throw Error("Pass app-owned test script filenames");
const stable = () =>
  report.sourceFiles.every(
    (r) =>
      crypto
        .createHash("sha256")
        .update(fs.readFileSync(path.join(mobile, r.file)))
        .digest("hex") === r.sha256,
  );
(async () => {
  if (!stable())
    throw Error("Production inputs have changed since the frozen export");
  const server = createFrozenServer(report),
    results = [];
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const baseURL = "http://127.0.0.1:" + server.address().port;
  try {
    for (const name of scripts) {
      const start = Date.now(),
        exit = await new Promise((resolve, reject) => {
          const child = spawn(process.execPath, [path.join(__dirname, name)], {
            cwd: mobile,
            env: { ...process.env, OIS_QA_BASE_URL: baseURL },
            stdio: "inherit",
          });
          child.on("error", reject);
          child.on("exit", resolve);
        });
      results.push({
        script: name,
        exit,
        seconds: (Date.now() - start) / 1000,
      });
    }
    const result = {
      at: new Date().toISOString(),
      snapshot: report.directory,
      compiledMatches: report.compiledMatches,
      stable: stable(),
      baseURL,
      results,
      nativeValidation: false,
    };
    fs.writeFileSync(
      path.resolve(mobile, "../docs/build/frozen-tests-result.json"),
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result));
    if (!result.stable || results.some((r) => r.exit !== 0))
      process.exitCode = 1;
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
