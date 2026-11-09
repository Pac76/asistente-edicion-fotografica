import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { auditFolder } from "./audit.js";

function usage() {
  return [
    "Uso:",
    '  npm run audit -- "<carpeta>" [--profile "Evento nocturno"] [--json reporte.json]',
    "",
    "El auditor no modifica ningún archivo de la carpeta analizada."
  ].join("\n");
}

function parseArguments(argv) {
  const args = [...argv];
  const command = args.shift();
  if (command !== "audit") {
    throw new Error(usage());
  }

  const folder = args.shift();
  if (!folder) {
    throw new Error(usage());
  }

  const options = { folder, profile: null, jsonPath: null };
  while (args.length > 0) {
    const option = args.shift();
    const value = args.shift();
    if (!value) {
      throw new Error(`Falta el valor de ${option}.\n\n${usage()}`);
    }

    if (option === "--profile") {
      options.profile = value;
    } else if (option === "--json") {
      options.jsonPath = value;
    } else {
      throw new Error(`Opción desconocida: ${option}\n\n${usage()}`);
    }
  }

  return options;
}

function printSummary(report) {
  const { summary } = report;
  const lines = [
    "",
    "Auditoría terminada",
    `Carpeta: ${report.root}`,
    `Perfil/contexto: ${report.profile ?? "sin indicar"}`,
    `RAW encontrados: ${summary.rawFiles}`,
    `XMP encontrados: ${summary.xmpFiles}`,
    `Pares RAW/XMP: ${summary.validPairs}`,
    `RAW sin XMP: ${summary.rawWithoutXmp}`,
    `XMP sin RAW: ${summary.xmpWithoutRaw}`,
    `Nombres duplicados: ${summary.duplicateKeys}`,
    `Pares con advertencias: ${summary.pairsWithWarnings}`
  ];

  process.stdout.write(`${lines.join("\n")}\n`);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const report = await auditFolder(options.folder, {
    profile: options.profile
  });

  printSummary(report);

  if (options.jsonPath) {
    const outputPath = path.resolve(options.jsonPath);
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(`Reporte guardado: ${outputPath}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exitCode = 1;
});
