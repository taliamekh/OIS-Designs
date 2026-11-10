/* Refresh only review metadata; never replace geometry, bounds or saved identity. */
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  { identity, withdrawnKeys, curate } = require("./curation.cjs");
const root = path.resolve(__dirname, "../.."),
  source = path.join(root, "furniture"),
  dir = path.join(root, "mobile/src/catalogue"),
  manifestRaw = fs.readFileSync(path.join(source, "manifest.json")),
  manifestSha256 = crypto
    .createHash("sha256")
    .update(manifestRaw)
    .digest("hex"),
  ready = JSON.parse(
    fs.readFileSync(path.join(source, "catalogue-v2/batch-ready.json"), "utf8"),
  );
if (ready.manifestSha256 !== manifestSha256)
  throw Error("Wait for a matching completed producer snapshot.");
const records = new Map(
    JSON.parse(manifestRaw).assets.map((a) => [identity(a), a]),
  ),
  handoff = JSON.parse(
    fs.readFileSync(
      path.join(source, "catalogue-v2/contact-review-withdrawals.json"),
      "utf8",
    ),
  ),
  withdrawn = withdrawnKeys(handoff),
  report = {
    at: new Date().toISOString(),
    manifestSha256,
    withdrawalAt: handoff.timeUtc,
    changed: {},
  };
for (const file of ["assets.json", "revisions.json"]) {
  const previous = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  let changed = 0;
  const next = previous.map((a) => {
    const current = records.get(identity(a));
    let out = a;
    if (current)
      out = {
        ...a,
        stage: current.stage ?? current.qualityStatus ?? a.stage,
        qualityStatus: current.qualityStatus,
        visualReview: current.visualReview,
      };
    out = curate(out, withdrawn);
    const geometryFields = (o) =>
      JSON.stringify(
        Object.fromEntries(
          Object.entries(o).filter(
            ([k]) => !["stage", "qualityStatus", "visualReview"].includes(k),
          ),
        ),
      );
    if (geometryFields(out) !== geometryFields(a))
      throw Error("Curation altered geometry metadata");
    if (JSON.stringify(a) !== JSON.stringify(out)) changed++;
    return out;
  });
  const target = path.join(dir, file);
  fs.writeFileSync(target + ".tmp", JSON.stringify(next, null, 2) + "\n");
  fs.renameSync(target + ".tmp", target);
  report.changed[file] = changed;
  if (file === "assets.json")
    report.counts = {
      records: next.length,
      reviewed: next.filter((a) => a.stage === "internally-accepted").length,
      reviewedVariants: next.filter((a) => a.stage === "reviewed-variant")
        .length,
      needsRework: next.filter((a) => a.stage === "needs-rework").length,
    };
}
fs.writeFileSync(
  path.join(root, "docs/build/curation-refresh.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));
