import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { auditFolder, extractAdobeSettings } from "../src/audit.js";

const SAMPLE_XMP = `<?xpacket begin="﻿" id="test"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description
      xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
      crs:ProcessVersion="15.4"
      crs:CameraProfile="Adobe Color"
      crs:WhiteBalance="Custom"
      crs:Temperature="4850"
      crs:Tint="+8"
      crs:Exposure2012="+0.45"
      crs:Contrast2012="-5"
      crs:Highlights2012="-32"
      crs:Shadows2012="+18"
      crs:Texture="-4"
      crs:Clarity2012="+2"
      crs:Vibrance="+11">
      <crs:Saturation>3</crs:Saturation>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

async function withTemporaryDirectory(callback) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "foto-audit-"));
  try {
    await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("extrae ajustes de atributos y elementos XMP", () => {
  const settings = extractAdobeSettings(SAMPLE_XMP);

  assert.equal(settings.CameraProfile, "Adobe Color");
  assert.equal(settings.Exposure2012, "+0.45");
  assert.equal(settings.Highlights2012, "-32");
  assert.equal(settings.Saturation, "3");
});

test("empareja RAW y XMP por carpeta y nombre sin importar mayúsculas", async () => {
  await withTemporaryDirectory(async (directory) => {
    const session = path.join(directory, "Sesion 01");
    await mkdir(session);
    await writeFile(path.join(session, "DSC_0001.NEF"), "raw");
    await writeFile(path.join(session, "dsc_0001.xMp"), SAMPLE_XMP);

    const report = await auditFolder(directory, {
      profile: "Evento nocturno"
    });

    assert.equal(report.profile, "Evento nocturno");
    assert.equal(report.summary.rawFiles, 1);
    assert.equal(report.summary.xmpFiles, 1);
    assert.equal(report.summary.validPairs, 1);
    assert.equal(report.summary.rawWithoutXmp, 0);
    assert.equal(report.summary.pairsWithWarnings, 0);
    assert.equal(report.pairs[0].xmpInspection.settings.Temperature, "4850");
    assert.equal(report.xmpCompatibility.cameraProfiles["Adobe Color"], 1);
    assert.equal(report.xmpCompatibility.processVersions["15.4"], 1);
    assert.equal(report.xmpCompatibility.settingsCoverage.Exposure2012, 1);
  });
});

test("separa faltantes, huérfanos, duplicados e ignorados", async () => {
  await withTemporaryDirectory(async (directory) => {
    await writeFile(path.join(directory, "sin-edicion.CR3"), "raw");
    await writeFile(path.join(directory, "sin-original.xmp"), SAMPLE_XMP);
    await writeFile(path.join(directory, "duplicada.nef"), "raw");
    await writeFile(path.join(directory, "duplicada.dng"), "raw");
    await writeFile(path.join(directory, "duplicada.xmp"), SAMPLE_XMP);
    await writeFile(path.join(directory, "nota.txt"), "ignorar");

    const report = await auditFolder(directory);

    assert.equal(report.summary.rawFiles, 3);
    assert.equal(report.summary.xmpFiles, 2);
    assert.equal(report.summary.validPairs, 1);
    assert.equal(report.summary.rawWithoutXmp, 1);
    assert.equal(report.summary.xmpWithoutRaw, 1);
    assert.equal(report.summary.duplicateKeys, 1);
    assert.equal(report.ignoredExtensions[".txt"], 1);
  });
});

test("advierte cuando un XMP no contiene metadata Adobe reconocible", async () => {
  await withTemporaryDirectory(async (directory) => {
    await writeFile(path.join(directory, "foto.ARW"), "raw");
    await writeFile(path.join(directory, "foto.xmp"), "<documento />");

    const report = await auditFolder(directory);

    assert.equal(report.summary.validPairs, 1);
    assert.equal(report.summary.pairsWithWarnings, 1);
    assert.equal(report.pairs[0].xmpInspection.readable, true);
    assert.equal(report.pairs[0].xmpInspection.looksLikeXmp, false);
    assert.equal(report.pairs[0].xmpInspection.settingCount, 0);
  });
});

test("rechaza una ruta que no sea una carpeta", async () => {
  await withTemporaryDirectory(async (directory) => {
    const filePath = path.join(directory, "archivo.nef");
    await writeFile(filePath, "raw");

    await assert.rejects(
      auditFolder(filePath),
      /La ruta no es una carpeta/
    );
  });
});
