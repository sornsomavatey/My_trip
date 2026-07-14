const http = require("http");
const fs = require("fs");
const path = require("path");

const startPort = Number(process.argv[2] || process.env.PORT || 3000);
const root = __dirname;
const liveReloadClients = new Set();
let reloadTimer = null;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function liveReloadScript() {
  return `
<script>
(() => {
  const source = new EventSource("/__live-reload");
  source.addEventListener("reload", () => window.location.reload());
})();
</script>`;
}

function sendHtml(res, data) {
  const html = data.toString("utf8");
  const injected = html.includes("</body>")
    ? html.replace("</body>", liveReloadScript() + "\n</body>")
    : html + liveReloadScript();

  send(res, 200, injected, mimeTypes[".html"]);
}

function handleLiveReload(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
  });
  res.write("event: connected\ndata: ready\n\n");

  liveReloadClients.add(res);
  req.on("close", () => {
    liveReloadClients.delete(res);
  });
}

function broadcastReload() {
  for (const client of liveReloadClients) {
    client.write("event: reload\ndata: now\n\n");
  }
}

function scheduleReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(broadcastReload, 120);
}

function shouldWatch(filePath) {
  const ignoredParts = [".git", "node_modules"];
  if (ignoredParts.some((part) => filePath.includes(path.sep + part + path.sep))) {
    return false;
  }

  return [".html", ".css", ".js", ".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(
    path.extname(filePath).toLowerCase()
  );
}

function resolveRequestPath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const requestPath = cleanPath === "/" ? "/index.html" : cleanPath;
  const filePath = path.normalize(path.join(root, requestPath));

  if (!filePath.startsWith(root)) {
    return null;
  }

  return filePath;
}

function createServer() {
  return http.createServer((req, res) => {
  if ((req.url || "").startsWith("/__live-reload")) {
    handleLiveReload(req, res);
    return;
  }

  const filePath = resolveRequestPath(req.url || "/");

  if (!filePath) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".html") {
      sendHtml(res, data);
      return;
    }

    send(res, 200, data, mimeTypes[ext] || "application/octet-stream");
  });
  });
}

function watchFiles() {
  fs.watch(root, { recursive: true }, (eventType, fileName) => {
    if (!fileName) return;

    const filePath = path.join(root, fileName);
    if (!shouldWatch(filePath)) return;

    console.log(`Reloading after ${eventType}: ${fileName}`);
    scheduleReload();
  });
}

function listen(port, attemptsLeft = 10) {
  const server = createServer();

  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
      const nextPort = port + 1;
      console.log(`Port ${port} is busy, trying ${nextPort}...`);
      listen(nextPort, attemptsLeft - 1);
      return;
    }

    throw error;
  });

  server.listen(port, () => {
    console.log(`Kampot trip website running at http://localhost:${port}`);
    console.log("Live reload is on. Edit and save files, then the browser refreshes.");
  });
}

watchFiles();
listen(startPort);
