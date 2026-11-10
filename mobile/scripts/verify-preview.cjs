/* Check the actual running Expo Go launch route, separately from release exports. */
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, ".."),
  local = "http://127.0.0.1:8081";
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
function inputs() {
  const rows = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else
        rows.push({
          file: path.relative(root, file).replaceAll("\\", "/"),
          sha256: sha(fs.readFileSync(file)),
        });
    }
  }
  walk(path.join(root, "src"));
  for (const name of [
    "package.json",
    "package-lock.json",
    "app.json",
    "metro.config.js",
  ])
    rows.push({
      file: name,
      sha256: sha(fs.readFileSync(path.join(root, name))),
    });
  return rows.sort((a, b) => a.file.localeCompare(b.file));
}
const headers = {
  "expo-platform": "ios",
  "expo-protocol-version": "1",
  accept: "application/expo+json",
  "ngrok-skip-browser-warning": "true",
};
async function get(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(180000),
  });
  if (!response.ok)
    throw Error(
      `HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`,
    );
  return response;
}
(async () => {
  const at = new Date().toISOString(),
    before = inputs(),
    opened = await (
      await get(local + "/_expo/open?platform=ios&runtime=expo")
    ).json();
  const expoURL = opened.url.split("?")[0],
    publicBase = expoURL.replace(/^exp:/, "https:");
  const current = require("../src/catalogue/assets.json"),
    asset = current.find((a) => a.sha256.startsWith("d46cc8be7673"));
  if (!asset) throw Error("Exact final-library island control unavailable");
  const bindings = fs.readFileSync(
    path.join(root, "src/catalogue/bundled.ts"),
    "utf8",
  );
  const line = bindings.split("\n").find((line) => line.includes(asset.sha256));
  const relative = /require\(["']([^"']+)["']\)/.exec(line)?.[1];
  if (!relative) throw Error("Static asset binding missing");
  const file = path.resolve(root, "src/catalogue", relative),
    relativeAsset = path.relative(root, file).replaceAll("\\", "/");
  const routes = [];
  for (const [kind, base] of [
    ["local", local],
    ["public", publicBase],
  ]) {
    const manifestResponse = await get(base + "/", { headers }),
      manifest = await manifestResponse.json();
    if (!manifest.launchAsset?.url)
      throw Error("No advertised iOS launch asset");
    const advertised = manifest.launchAsset.url,
      bundleResponse = await get(advertised, {
        headers: { "ngrok-skip-browser-warning": "true" },
      }),
      bundle = Buffer.from(await bundleResponse.arrayBuffer());
    const glbResponse = await get(
        base + "/assets/" + relativeAsset + "?platform=ios",
        { headers: { "ngrok-skip-browser-warning": "true" } },
      ),
      bytes = Buffer.from(await glbResponse.arrayBuffer());
    if (
      bytes.toString("ascii", 0, 4) !== "glTF" ||
      sha(bytes) !== asset.sha256 ||
      bytes.length !== asset.bytes
    )
      throw Error("Served GLB differs from saved exact revision");
    routes.push({
      kind,
      manifestStatus: manifestResponse.status,
      sdkVersion: manifest.extra?.expoClient?.sdkVersion,
      runtimeVersion: manifest.runtimeVersion,
      advertisedBundlePath: new URL(advertised).pathname,
      bundleStatus: bundleResponse.status,
      bundleBytes: bundle.length,
      bundleSha256: sha(bundle),
      bundleType: bundleResponse.headers.get("content-type"),
      asset: {
        id: asset.id,
        version: asset.version,
        sha256: asset.sha256,
        bytes: bytes.length,
        status: glbResponse.status,
      },
    });
  }
  const after = inputs(),
    stable = JSON.stringify(before) === JSON.stringify(after);
  const report = {
    at,
    completedAt: new Date().toISOString(),
    stable,
    sourceFiles: before,
    sourceHash: sha(JSON.stringify(before)),
    routes,
    physicalPhoneLaunch: false,
  };
  fs.writeFileSync(
    path.resolve(root, "../docs/build/preview-route-verified.json"),
    JSON.stringify(report, null, 2),
  );
  fs.writeFileSync(
    path.join(root, ".expo/ois-preview-connection.json"),
    JSON.stringify(
      { at, publicBase, expoURL, verified: stable, routes },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ stable, sourceHash: report.sourceHash, routes }),
  );
  if (!stable) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
