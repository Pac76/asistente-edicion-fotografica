import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createStore } from "../src/store.js";

async function withStore(callback) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "foto-store-"));
  try {
    await callback(createStore({ dataDirectory: directory }));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("inicializa los perfiles propuestos una sola vez", async () => {
  await withStore(async (store) => {
    const firstRead = await store.listProfiles();
    const secondRead = await store.listProfiles();

    assert.equal(firstRead.length, 6);
    assert.deepEqual(firstRead, secondRead);
    assert.ok(firstRead.some((profile) => profile.name === "Eventos de noche"));
  });
});

test("crea un perfil persistente y rechaza nombres repetidos", async () => {
  await withStore(async (store) => {
    const created = await store.createProfile("  Producto   estudio  ");
    const profiles = await store.listProfiles();

    assert.equal(created.name, "Producto estudio");
    assert.ok(profiles.some((profile) => profile.id === created.id));
    await assert.rejects(
      store.createProfile("Producto estudio"),
      /Ya existe un perfil/
    );
  });
});

test("guarda y recupera el reporte completo de una auditoría", async () => {
  await withStore(async (store) => {
    const report = {
      version: 1,
      root: "C:\\Fotos\\Prueba",
      profile: "Deportivo",
      scannedAt: "2026-07-29T12:00:00.000Z",
      summary: {
        rawFiles: 12,
        xmpFiles: 12,
        validPairs: 12
      },
      pairs: [{ raw: "foto.nef", xmp: "foto.xmp" }]
    };

    const stored = await store.saveAudit(report);
    const history = await store.listAudits();
    const recovered = await store.getAudit(stored.auditId);

    assert.match(stored.auditId, /^[0-9a-f-]{36}$/);
    assert.equal(history.length, 1);
    assert.equal(history[0].profile, "Deportivo");
    assert.deepEqual(recovered, stored);
  });
});

test("ignora identificadores de auditoría inválidos", async () => {
  await withStore(async (store) => {
    assert.equal(await store.getAudit("../app-state"), null);
  });
});
