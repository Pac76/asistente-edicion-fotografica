import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export const RAW_EXTENSIONS = new Set([
  ".3fr",
  ".arw",
  ".cr2",
  ".cr3",
  ".dng",
  ".fff",
  ".iiq",
  ".nef",
  ".nrw",
  ".orf",
  ".pef",
  ".raf",
  ".raw",
  ".rw2",
  ".srw"
]);

export const XMP_EXTENSION = ".xmp";

const ADOBE_SETTINGS = [
  "ProcessVersion",
  "CameraProfile",
  "WhiteBalance",
  "Temperature",
  "Tint",
  "Exposure",
  "Exposure2012",
  "Contrast",
  "Contrast2012",
  "Highlights2012",
  "Shadows2012",
  "Whites2012",
  "Blacks2012",
  "Texture",
  "Clarity",
  "Clarity2012",
  "Dehaze",
  "Vibrance",
  "Saturation"
];

function normalizeExtension(filePath) {
  return path.extname(filePath).toLowerCase();
}

function pairingKey(root, filePath) {
  const relative = path.relative(root, filePath);
  const directory = path.dirname(relative).toLowerCase();
  const stem = path.basename(relative, path.extname(relative)).toLowerCase();
  return path.join(directory, stem);
}

function addToIndex(index, key, filePath) {
  const existing = index.get(key) ?? [];
  existing.push(filePath);
  index.set(key, existing);
}

async function listFiles(root) {
  const files = [];
  const unreadableDirectories = [];

  async function visit(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      unreadableDirectories.push({
        path: directory,
        error: error instanceof Error ? error.message : String(error)
      });
      return;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  await visit(root);
  return { files, unreadableDirectories };
}

function decodeXml(value) {
  return value
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractAdobeSettings(xmpText) {
  const settings = {};

  for (const name of ADOBE_SETTINGS) {
    const escaped = escapeRegExp(name);
    const attribute = new RegExp(
      `(?:crs|photoshop):${escaped}\\s*=\\s*["']([^"']*)["']`,
      "i"
    );
    const element = new RegExp(
      `<(?:crs|photoshop):${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:crs|photoshop):${escaped}>`,
      "i"
    );

    const match = xmpText.match(attribute) ?? xmpText.match(element);
    if (match) {
      settings[name] = decodeXml(match[1].trim());
    }
  }

  return settings;
}

async function inspectXmp(filePath) {
  try {
    const text = await readFile(filePath, "utf8");
    const looksLikeXmp =
      /<\?xpacket|<x:xmpmeta|<rdf:RDF/i.test(text) &&
      /xmlns:(?:crs|xmp|rdf)=/i.test(text);
    const settings = extractAdobeSettings(text);

    return {
      readable: true,
      looksLikeXmp,
      settings,
      settingCount: Object.keys(settings).length,
      warnings: [
        ...(!looksLikeXmp ? ["El archivo no parece contener XMP/RDF válido."] : []),
        ...(Object.keys(settings).length === 0
          ? ["No se detectaron ajustes globales de Adobe compatibles."]
          : [])
      ]
    };
  } catch (error) {
    return {
      readable: false,
      looksLikeXmp: false,
      settings: {},
      settingCount: 0,
      warnings: [
        `No se pudo leer el XMP: ${
          error instanceof Error ? error.message : String(error)
        }`
      ]
    };
  }
}

export async function auditFolder(rootInput, options = {}) {
  const root = path.resolve(rootInput);
  const rootStats = await stat(root);
  if (!rootStats.isDirectory()) {
    throw new Error(`La ruta no es una carpeta: ${root}`);
  }

  const { files, unreadableDirectories } = await listFiles(root);
  const rawIndex = new Map();
  const xmpIndex = new Map();
  const ignoredExtensions = new Map();

  for (const filePath of files) {
    const extension = normalizeExtension(filePath);
    const key = pairingKey(root, filePath);

    if (RAW_EXTENSIONS.has(extension)) {
      addToIndex(rawIndex, key, filePath);
    } else if (extension === XMP_EXTENSION) {
      addToIndex(xmpIndex, key, filePath);
    } else {
      ignoredExtensions.set(
        extension || "(sin extensión)",
        (ignoredExtensions.get(extension || "(sin extensión)") ?? 0) + 1
      );
    }
  }

  const allKeys = [...new Set([...rawIndex.keys(), ...xmpIndex.keys()])].sort();
  const pairs = [];
  const rawWithoutXmp = [];
  const xmpWithoutRaw = [];
  const duplicateKeys = [];

  for (const key of allKeys) {
    const rawFiles = rawIndex.get(key) ?? [];
    const xmpFiles = xmpIndex.get(key) ?? [];

    if (rawFiles.length > 1 || xmpFiles.length > 1) {
      duplicateKeys.push({
        key,
        rawFiles: rawFiles.map((value) => path.relative(root, value)),
        xmpFiles: xmpFiles.map((value) => path.relative(root, value))
      });
    }

    if (rawFiles.length === 0) {
      xmpWithoutRaw.push(
        ...xmpFiles.map((value) => path.relative(root, value))
      );
      continue;
    }

    if (xmpFiles.length === 0) {
      rawWithoutXmp.push(
        ...rawFiles.map((value) => path.relative(root, value))
      );
      continue;
    }

    const xmpInspection = await inspectXmp(xmpFiles[0]);
    pairs.push({
      key,
      raw: path.relative(root, rawFiles[0]),
      xmp: path.relative(root, xmpFiles[0]),
      rawExtension: normalizeExtension(rawFiles[0]),
      xmpInspection
    });
  }

  const warningPairs = pairs.filter(
    (pair) => pair.xmpInspection.warnings.length > 0
  ).length;
  const settingsCoverage = {};
  const cameraProfiles = {};
  const processVersions = {};

  for (const pair of pairs) {
    const { settings } = pair.xmpInspection;
    for (const name of Object.keys(settings)) {
      settingsCoverage[name] = (settingsCoverage[name] ?? 0) + 1;
    }
    if (settings.CameraProfile) {
      cameraProfiles[settings.CameraProfile] =
        (cameraProfiles[settings.CameraProfile] ?? 0) + 1;
    }
    if (settings.ProcessVersion) {
      processVersions[settings.ProcessVersion] =
        (processVersions[settings.ProcessVersion] ?? 0) + 1;
    }
  }

  return {
    version: 1,
    root,
    profile: options.profile?.trim() || null,
    scannedAt: new Date().toISOString(),
    summary: {
      totalFiles: files.length,
      rawFiles: [...rawIndex.values()].flat().length,
      xmpFiles: [...xmpIndex.values()].flat().length,
      validPairs: pairs.length,
      rawWithoutXmp: rawWithoutXmp.length,
      xmpWithoutRaw: xmpWithoutRaw.length,
      duplicateKeys: duplicateKeys.length,
      pairsWithWarnings: warningPairs,
      unreadableDirectories: unreadableDirectories.length
    },
    rawFormats: Object.fromEntries(
      [...rawIndex.values()]
        .flat()
        .map(normalizeExtension)
        .reduce((counts, extension) => {
          counts.set(extension, (counts.get(extension) ?? 0) + 1);
          return counts;
        }, new Map())
    ),
    xmpCompatibility: {
      settingsCoverage,
      cameraProfiles,
      processVersions
    },
    pairs,
    rawWithoutXmp,
    xmpWithoutRaw,
    duplicateKeys,
    unreadableDirectories: unreadableDirectories.map((entry) => ({
      ...entry,
      path: path.relative(root, entry.path)
    })),
    ignoredExtensions: Object.fromEntries(
      [...ignoredExtensions.entries()].sort(([a], [b]) => a.localeCompare(b))
    )
  };
}
