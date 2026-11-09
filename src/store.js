import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_PROFILE_NAMES = [
  "Casamientos",
  "Eventos de día",
  "Eventos de noche",
  "Deportivo",
  "Retrato de estudio",
  "Retrato de evento al aire libre"
];

function initialState() {
  const createdAt = new Date().toISOString();
  return {
    version: 1,
    profiles: DEFAULT_PROFILE_NAMES.map((name) => ({
      id: randomUUID(),
      name,
      status: "sin_datos",
      archived: false,
      createdAt,
      updatedAt: createdAt
    })),
    audits: []
  };
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

export function createStore({ dataDirectory }) {
  const directory = path.resolve(dataDirectory);
  const reportsDirectory = path.join(directory, "reports");
  const statePath = path.join(directory, "app-state.json");
  let writeQueue = Promise.resolve();

  async function ensureDirectories() {
    await mkdir(reportsDirectory, { recursive: true });
  }

  async function readState() {
    await ensureDirectories();
    try {
      const text = await readFile(statePath, "utf8");
      const state = JSON.parse(text);
      if (state.version !== 1 || !Array.isArray(state.profiles)) {
        throw new Error("La estructura del estado local no es compatible.");
      }
      state.audits ??= [];
      return state;
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT") {
        const state = initialState();
        await writeState(state);
        return state;
      }
      throw error;
    }
  }

  async function writeState(state) {
    await ensureDirectories();
    const temporaryPath = `${statePath}.${process.pid}.tmp`;
    await writeFile(
      temporaryPath,
      `${JSON.stringify(state, null, 2)}\n`,
      "utf8"
    );
    await rename(temporaryPath, statePath);
  }

  function updateState(mutator) {
    const operation = writeQueue.then(async () => {
      const state = await readState();
      const result = await mutator(state);
      await writeState(state);
      return result;
    });
    writeQueue = operation.catch(() => {});
    return operation;
  }

  async function listProfiles() {
    const state = await readState();
    return state.profiles
      .filter((profile) => !profile.archived)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async function createProfile(nameInput) {
    const name = normalizeName(nameInput ?? "");
    if (name.length < 2 || name.length > 80) {
      throw new Error("El nombre del perfil debe tener entre 2 y 80 caracteres.");
    }

    return updateState((state) => {
      const exists = state.profiles.some(
        (profile) =>
          !profile.archived &&
          profile.name.localeCompare(name, undefined, {
            sensitivity: "accent"
          }) === 0
      );
      if (exists) {
        throw new Error(`Ya existe un perfil llamado “${name}”.`);
      }

      const now = new Date().toISOString();
      const profile = {
        id: randomUUID(),
        name,
        status: "sin_datos",
        archived: false,
        createdAt: now,
        updatedAt: now
      };
      state.profiles.push(profile);
      return profile;
    });
  }

  async function saveAudit(report) {
    return updateState(async (state) => {
      const id = randomUUID();
      const storedReport = { ...report, auditId: id };
      const reportPath = path.join(reportsDirectory, `${id}.json`);
      await writeFile(
        reportPath,
        `${JSON.stringify(storedReport, null, 2)}\n`,
        "utf8"
      );

      const entry = {
        id,
        profile: report.profile,
        root: report.root,
        scannedAt: report.scannedAt,
        summary: report.summary
      };
      state.audits.unshift(entry);
      state.audits = state.audits.slice(0, 100);
      return storedReport;
    });
  }

  async function listAudits() {
    const state = await readState();
    return state.audits;
  }

  async function getAudit(id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return null;
    }
    try {
      const text = await readFile(path.join(reportsDirectory, `${id}.json`), "utf8");
      return JSON.parse(text);
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  return {
    createProfile,
    getAudit,
    listAudits,
    listProfiles,
    saveAudit
  };
}
