import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { auditFolder } from "./audit.js";
import { createStore } from "./store.js";

const execFileAsync = promisify(execFile);
const host = "127.0.0.1";
const requestedPort = Number.parseInt(process.env.APP_PORT ?? "4173", 10);
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.resolve(currentDirectory, "..", "public");
const dataDirectory =
  process.env.APP_DATA_DIR ??
  path.resolve(currentDirectory, "..", "runtime");
const store = createStore({ dataDirectory });

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(value));
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) {
      throw new Error("La solicitud es demasiado grande.");
    }
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

async function chooseWindowsFolder() {
  if (process.platform !== "win32") {
    throw new Error("El selector de carpetas está disponible únicamente en Windows.");
  }

  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
    "$dialog.Description = 'Elegí la carpeta con las fotografías y XMP'",
    "$dialog.ShowNewFolderButton = $false",
    "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {",
    "  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
    "  Write-Output $dialog.SelectedPath",
    "}"
  ].join("; ");

  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-STA", "-Command", script],
    {
      encoding: "utf8",
      windowsHide: true,
      timeout: 120_000
    }
  );

  return stdout.trim();
}

async function serveStatic(requestPath, response) {
  const relativePath =
    requestPath === "/" ? "index.html" : decodeURIComponent(requestPath.slice(1));
  const filePath = path.resolve(publicDirectory, relativePath);
  const relativeToPublic = path.relative(publicDirectory, filePath);

  if (
    relativeToPublic.startsWith("..") ||
    path.isAbsolute(relativeToPublic)
  ) {
    sendJson(response, 403, { error: "Ruta no permitida." });
    return;
  }

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      sendJson(response, 404, { error: "Archivo no encontrado." });
      return;
    }

    response.writeHead(200, {
      "Content-Type":
        contentTypes[path.extname(filePath).toLowerCase()] ??
        "application/octet-stream",
      "Cache-Control": "no-store"
    });
    createReadStream(filePath).pipe(response);
  } catch {
    const fallback = await readFile(path.join(publicDirectory, "index.html"));
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    });
    response.end(fallback);
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${host}`);

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { status: "ok" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/profiles") {
      sendJson(response, 200, { profiles: await store.listProfiles() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/profiles") {
      const body = await readJsonBody(request);
      const profile = await store.createProfile(
        typeof body.name === "string" ? body.name : ""
      );
      sendJson(response, 201, { profile });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/audits") {
      sendJson(response, 200, { audits: await store.listAudits() });
      return;
    }

    const auditMatch = url.pathname.match(
      /^\/api\/audits\/([0-9a-f-]{36})$/i
    );
    if (request.method === "GET" && auditMatch) {
      const report = await store.getAudit(auditMatch[1]);
      if (!report) {
        sendJson(response, 404, { error: "Auditoría no encontrada." });
        return;
      }

      if (url.searchParams.get("download") === "1") {
        const safeProfile = (report.profile ?? "sin-perfil")
          .normalize("NFKD")
          .replace(/[^\w-]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase();
        response.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="auditoria-${safeProfile || "perfil"}.json"`,
          "Cache-Control": "no-store"
        });
        response.end(`${JSON.stringify(report, null, 2)}\n`);
        return;
      }

      sendJson(response, 200, report);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/select-folder") {
      const folder = await chooseWindowsFolder();
      sendJson(response, 200, { folder: folder || null });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/audit") {
      const body = await readJsonBody(request);
      if (typeof body.folder !== "string" || body.folder.trim() === "") {
        sendJson(response, 400, { error: "Elegí una carpeta para analizar." });
        return;
      }

      const report = await auditFolder(body.folder, {
        profile: typeof body.profile === "string" ? body.profile : null
      });
      const storedReport = await store.saveAudit(report);
      sendJson(response, 200, storedReport);
      return;
    }

    if (request.method === "GET") {
      await serveStatic(url.pathname, response);
      return;
    }

    sendJson(response, 405, { error: "Método no permitido." });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

server.listen(requestedPort, host, () => {
  const address = server.address();
  const port =
    address && typeof address === "object" ? address.port : requestedPort;
  process.stdout.write(
    `Asistente disponible en http://${host}:${port}\n` +
      "Presioná Ctrl+C para cerrarlo.\n"
  );
});
