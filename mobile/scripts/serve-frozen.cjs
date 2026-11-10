/* Loopback-only server for a completed app-owned immutable export. */
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
const report = require("../../docs/build/frozen-web-export.json"),
  root = path.resolve(report.webRoot),
  port = Number(process.env.OIS_QA_PORT || 8084);
if (report.exit !== 0 || !report.stable || !report.accepted)
  throw Error("A stable successful export is required");
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".glb": "model/gltf-binary",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
};
http
  .createServer((request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
      let file = path.resolve(root, "." + pathname);
      if (file !== root && !file.startsWith(root + path.sep)) {
        response.writeHead(403);
        response.end();
        return;
      }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        if (fs.existsSync(file + ".html")) file += ".html";
        else file = path.join(root, "index.html");
      }
      response.writeHead(200, {
        "Content-Type": mime[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      fs.createReadStream(file).pipe(response);
    } catch {
      response.writeHead(400);
      response.end();
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(JSON.stringify({ port, root, at: new Date().toISOString() })),
  );
