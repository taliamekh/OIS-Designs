/* App-owned adapter. Furniture sources remain read-only. Copy only manifest-verified bytes. */
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const { textureIndex } = require("./texture-index.cjs");
const { withdrawnKeys, curate } = require("./curation.cjs");
const withdrawalFile = path.resolve(
  __dirname,
  "../../furniture/catalogue-v2/contact-review-withdrawals.json",
);
const withdrawn = withdrawnKeys(
  fs.existsSync(withdrawalFile)
    ? JSON.parse(fs.readFileSync(withdrawalFile, "utf8"))
    : null,
);
const root = path.resolve(__dirname, "../.."),
  source = path.join(root, "furniture"),
  target = path.join(root, "mobile/assets/furniture");
const manifestRaw = fs.readFileSync(path.join(source, "manifest.json")),
  sourceManifestSha256 = crypto
    .createHash("sha256")
    .update(manifestRaw)
    .digest("hex"),
  ready = JSON.parse(
    fs.readFileSync(path.join(source, "catalogue-v2/batch-ready.json"), "utf8"),
  );
if (ready.manifestSha256 !== sourceManifestSha256 || !ready.completedFilesOnly)
  throw Error(
    "The producer batch marker is catching up. No app catalogue was published.",
  );
const manifest = JSON.parse(manifestRaw.toString("utf8"));
fs.mkdirSync(target, { recursive: true });
fs.mkdirSync(path.join(root, "mobile/src/catalogue"), { recursive: true });
const catalogueDir = path.join(root, "mobile/src/catalogue");
const priorFile = path.join(catalogueDir, "revisions.json");
const prior = fs.existsSync(priorFile)
  ? JSON.parse(fs.readFileSync(priorFile, "utf8"))
  : JSON.parse(fs.readFileSync(path.join(catalogueDir, "assets.json"), "utf8"));
const identity = (a) => `${a.id}@${a.version}@${a.sha256}`;
const revisions = new Map(prior.map((a) => [identity(a), a]));
const assets = [],
  requires = [],
  thumbs = [];
const aliases = {
  "entry-hall": "entry",
  "laundry-utility": "utility",
  childrens: "children",
};
for (const a of manifest.assets) {
  const file = path.resolve(source, a.file);
  if (!file.startsWith(source + path.sep))
    throw Error("Source path escapes furniture directory");
  const bytes = fs.readFileSync(file),
    hash = crypto.createHash("sha256").update(bytes).digest("hex");
  if (hash !== a.sha256 || bytes.length !== a.bytes)
    throw Error(`Manifest mismatch: ${a.id}`);
  const name = `${a.id.replace(/[^\w.-]/g, "_")}-${hash.slice(0, 12)}.glb`;
  const dest = path.join(target, name);
  if (!fs.existsSync(dest)) fs.writeFileSync(dest, bytes);
  requires.push(
    `${JSON.stringify(a.id)}: require('../../assets/furniture/${name}')`,
  );
  if (a.thumbnail) {
    const thumb = path.resolve(source, a.thumbnail);
    if (thumb.startsWith(source + path.sep) && fs.existsSync(thumb)) {
      const thumbnailBytes = fs.readFileSync(thumb),
        thumbnailHash = crypto
          .createHash("sha256")
          .update(thumbnailBytes)
          .digest("hex"),
        tn =
          a.id.replace(/[^\w.-]/g, "_") +
          "-" +
          thumbnailHash.slice(0, 16) +
          ".png",
        thumbnailTarget = path.join(target, tn);
      if (!fs.existsSync(thumbnailTarget))
        fs.writeFileSync(thumbnailTarget, thumbnailBytes);
      if (
        crypto
          .createHash("sha256")
          .update(fs.readFileSync(thumbnailTarget))
          .digest("hex") !== thumbnailHash
      )
        throw Error(`Copied thumbnail mismatch: ${a.id}`);
      thumbs.push(
        `${JSON.stringify(a.id)}: require('../../assets/furniture/${tn}')`,
      );
    }
  }
  const normalized = {
    ...a,
    roomTags: [
      ...new Set(
        a.roomTags.flatMap((tag) =>
          aliases[tag] ? [tag, aliases[tag]] : [tag],
        ),
      ),
    ],
    stage: a.stage ?? a.qualityStatus ?? "prototype",
    searchAliases: a.searchAliases ?? [],
    colourTags: a.colourTags ?? [],
    materials: a.materials ?? [],
    variantSlots: a.variantSlots ?? [],
  };
  const curated = curate(normalized, withdrawn);
  assets.push(curated);
  revisions.set(identity(curated), curated);
}
function atomic(file, content) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}
const revisionRequires = [
  ...new Map([...revisions.values()].map((a) => [a.sha256, a])).values(),
].map((a) => {
  const filename = `${a.id.replace(/[^\w.-]/g, "_")}-${a.sha256.slice(0, 12)}.glb`;
  if (!fs.existsSync(path.join(target, filename)))
    throw Error(`Missing preserved revision ${a.id}`);
  return `${JSON.stringify(a.sha256)}: require('../../assets/furniture/${filename}')`;
});
// Publish all required assets first. Old metadata still resolves exact hashes during hot reload.
atomic(
  path.join(catalogueDir, "texture-images.json"),
  JSON.stringify(
    textureIndex([...revisions.values()], (a) =>
      path.join(
        target,
        `${a.id.replace(/[^\w.-]/g, "_")}-${a.sha256.slice(0, 12)}.glb`,
      ),
    ),
    null,
    2,
  ) + "\n",
);
atomic(
  path.join(catalogueDir, "bundled.ts"),
  `// Generated by scripts/sync-furniture.cjs; immutable exact-hash assets.\nexport const models:Record<string,number>={\n${requires.join(",\n")}\n};\nexport const revisionModels:Record<string,number>={\n${revisionRequires.join(",\n")}\n};\nexport const thumbnails:Record<string,number>={\n${thumbs.join(",\n")}\n};\n`,
);
atomic(priorFile, JSON.stringify([...revisions.values()], null, 2) + "\n");
atomic(
  path.join(catalogueDir, "assets.json"),
  JSON.stringify(assets, null, 2) + "\n",
);
const result = {
  at: new Date().toISOString(),
  records: assets.length,
  retainedRevisions: revisions.size,
  sourceManifestSha256,
  catalogueVersion: ready.catalogueVersion,
  producerReviewCounts: ready.counts,
  geometryFamilies: new Set(assets.map((a) => a.designId || a.geometryFamily))
    .size,
  bytes: assets.reduce((s, a) => s + a.bytes, 0),
  appStages: Object.fromEntries(
    [...new Set(assets.map((a) => a.stage))].map((stage) => [
      stage,
      assets.filter((a) => a.stage === stage).length,
    ]),
  ),
};
fs.writeFileSync(
  path.join(root, "docs/build/furniture-sync.json"),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result));
