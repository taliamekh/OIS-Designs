const fs = require("node:fs"),
  path = require("node:path"),
  { textureIndex } = require("./texture-index.cjs");
const root = path.resolve(__dirname, ".."),
  records = require("../src/catalogue/revisions.json"),
  index = textureIndex(records, (a) =>
    path.join(
      root,
      "assets/furniture",
      `${a.id.replace(/[^\w.-]/g, "_")}-${a.sha256.slice(0, 12)}.glb`,
    ),
  );
const file = path.join(root, "src/catalogue/texture-images.json");
fs.writeFileSync(file + ".tmp", JSON.stringify(index, null, 2) + "\n");
fs.renameSync(file + ".tmp", file);
console.log(
  JSON.stringify({
    models: Object.keys(index).length,
    images: Object.values(index).reduce((n, v) => n + Object.keys(v).length, 0),
    uniqueImages: new Set(
      Object.values(index).flatMap((v) =>
        Object.values(v).map((i) => i.sha256),
      ),
    ).size,
  }),
);
