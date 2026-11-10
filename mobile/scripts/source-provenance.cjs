/* Bind compiled source-map content to the actual app source files. Indexed
 * Metro maps are recursive; synthetic Router contexts are not source files. */
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
function sourceProvenance(output, root) {
  const records = new Map();
  function inspect(map) {
    (map.sources || []).forEach((source, i) => {
      const normalized = source.replaceAll("\\", "/"),
        index = normalized.lastIndexOf("/src/"),
        relative =
          index >= 0
            ? normalized.slice(index + 1)
            : normalized.startsWith("src/")
              ? normalized
              : null;
      if (!relative) return;
      const file = path.resolve(root, relative);
      if (
        !file.startsWith(path.join(root, "src") + path.sep) ||
        !fs.existsSync(file) ||
        !fs.statSync(file).isFile()
      )
        return;
      const original = fs.readFileSync(file, "utf8"),
        content = map.sourcesContent?.[i],
        contentHash =
          typeof content === "string"
            ? crypto.createHash("sha256").update(content).digest("hex")
            : null;
      if (normalized.includes("/node_modules/")) return;
      records.set(relative + "@" + contentHash, {
        file: relative,
        matches: original === content,
        compiledSha256: contentHash,
      });
    });
    (map.sections || []).forEach((section) => inspect(section.map));
  }
  function walk(directory) {
    for (const e of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, e.name);
      if (e.isDirectory()) walk(file);
      else if (e.name.endsWith(".map"))
        inspect(JSON.parse(fs.readFileSync(file, "utf8")));
    }
  }
  walk(output);
  const compiled = [...records.values()];
  return {
    files: new Set(compiled.map((r) => r.file)).size,
    matches: compiled.filter((r) => r.matches).length,
    accepted: compiled.length > 0 && compiled.every((r) => r.matches),
    compiled,
  };
}
module.exports = { sourceProvenance };
