/* Build-time image fingerprints; native runtime never hashes/decodes image bytes in JS. */
const fs = require("node:fs"),
  crypto = require("node:crypto");
function imageHashes(bytes) {
  let offset = 12,
    json,
    bin;
  while (offset + 8 <= bytes.length) {
    const size = bytes.readUInt32LE(offset),
      type = bytes.readUInt32LE(offset + 4);
    if (offset + 8 + size > bytes.length) throw Error("Truncated GLB chunk");
    const data = bytes.subarray(offset + 8, offset + 8 + size);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString("utf8"));
    if (type === 0x004e4942) bin = data;
    offset += 8 + size;
  }
  const result = {};
  for (const [index, image] of (json?.images ?? []).entries()) {
    let data,
      mimeType = image.mimeType;
    if (image.bufferView !== undefined && bin) {
      const view = json.bufferViews[image.bufferView];
      if (view.buffer !== 0) continue;
      const start = view.byteOffset ?? 0,
        end = start + view.byteLength;
      if (end > bin.length || start < 0)
        throw Error("Embedded image range exceeds BIN");
      data = bin.subarray(start, end);
    } else if (image.uri?.startsWith("data:")) {
      const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(image.uri);
      if (!match) continue;
      mimeType = match[1];
      data = Buffer.from(match[2], "base64");
    }
    if (data)
      result[index] = {
        sha256: crypto.createHash("sha256").update(data).digest("hex"),
        mimeType: mimeType ?? "application/octet-stream",
      };
  }
  return result;
}
function textureIndex(records, fileFor) {
  const result = {};
  for (const a of records) {
    if (result[a.sha256]) continue;
    const bytes = fs.readFileSync(fileFor(a));
    if (crypto.createHash("sha256").update(bytes).digest("hex") !== a.sha256)
      throw Error("Copied model hash mismatch: " + a.id);
    result[a.sha256] = imageHashes(bytes);
  }
  return result;
}
module.exports = { imageHashes, textureIndex };
