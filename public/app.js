const profileSelect = document.querySelector("#profile");
const customProfile = document.querySelector("#custom-profile");
const saveProfileButton = document.querySelector("#save-profile");
const folderInput = document.querySelector("#folder");
const browseButton = document.querySelector("#browse");
const auditButton = document.querySelector("#audit");
const statusElement = document.querySelector("#status");
const resultsElement = document.querySelector("#results");
const metricsElement = document.querySelector("#metrics");
const formatsElement = document.querySelector("#formats");
const problemsElement = document.querySelector("#problems");
const settingsElement = document.querySelector("#settings");
const resultBadge = document.querySelector("#result-badge");
const downloadReport = document.querySelector("#download-report");
const historyElement = document.querySelector("#history");

function selectedProfile() {
  const option = profileSelect.selectedOptions[0];
  return option?.dataset.name ?? "";
}

function setBusy(busy) {
  browseButton.disabled = busy;
  auditButton.disabled = busy;
  auditButton.textContent = busy ? "Analizando…" : "Analizar material";
}

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle("error", isError);
}

function metric(label, value) {
  const element = document.createElement("div");
  element.className = "metric";

  const strong = document.createElement("strong");
  strong.textContent = String(value);
  const span = document.createElement("span");
  span.textContent = label;

  element.append(strong, span);
  return element;
}

function renderList(container, items, emptyMessage) {
  container.replaceChildren();
  if (items.length === 0) {
    container.textContent = emptyMessage;
    return;
  }

  const list = document.createElement("ul");
  for (const item of items) {
    const entry = document.createElement("li");
    entry.textContent = item;
    list.append(entry);
  }
  container.append(list);
}

function renderReport(report) {
  const { summary } = report;
  metricsElement.replaceChildren(
    metric("RAW encontrados", summary.rawFiles),
    metric("Pares válidos", summary.validPairs),
    metric("RAW sin XMP", summary.rawWithoutXmp),
    metric("Con advertencias", summary.pairsWithWarnings)
  );

  renderList(
    formatsElement,
    Object.entries(report.rawFormats).map(
      ([extension, count]) => `${extension.toUpperCase()}: ${count}`
    ),
    "No se encontraron formatos RAW soportados."
  );

  const problems = [];
  if (summary.rawWithoutXmp > 0) {
    problems.push(`${summary.rawWithoutXmp} RAW no tienen un XMP asociado.`);
  }
  if (summary.xmpWithoutRaw > 0) {
    problems.push(`${summary.xmpWithoutRaw} XMP no tienen un RAW asociado.`);
  }
  if (summary.duplicateKeys > 0) {
    problems.push(`${summary.duplicateKeys} nombres tienen archivos duplicados.`);
  }
  if (summary.pairsWithWarnings > 0) {
    problems.push(
      `${summary.pairsWithWarnings} pares requieren revisar el contenido del XMP.`
    );
  }
  if (summary.unreadableDirectories > 0) {
    problems.push(
      `${summary.unreadableDirectories} carpetas no pudieron ser leídas.`
    );
  }

  renderList(problemsElement, problems, "No se detectaron problemas básicos.");
  renderList(
    settingsElement,
    Object.entries(report.xmpCompatibility.settingsCoverage)
      .sort(([, countA], [, countB]) => countB - countA)
      .map(([name, count]) => `${name}: ${count}/${summary.validPairs}`),
    "No se detectaron ajustes compatibles."
  );

  const ready =
    summary.validPairs > 0 &&
    summary.rawWithoutXmp === 0 &&
    summary.duplicateKeys === 0 &&
    summary.pairsWithWarnings === 0;

  resultBadge.textContent = ready ? "Material consistente" : "Requiere revisión";
  resultBadge.className = `result-badge ${ready ? "good" : "warning"}`;
  downloadReport.href = `/api/audits/${report.auditId}?download=1`;
  downloadReport.classList.remove("hidden");
  resultsElement.classList.remove("hidden");
  resultsElement.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadProfiles(selectedId = null) {
  const response = await fetch("/api/profiles");
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "No se pudieron cargar los perfiles.");
  }

  profileSelect.replaceChildren();
  for (const profile of body.profiles) {
    const option = document.createElement("option");
    option.value = profile.id;
    option.dataset.name = profile.name;
    option.textContent = profile.name;
    option.selected = profile.id === selectedId;
    profileSelect.append(option);
  }

  const newOption = document.createElement("option");
  newOption.value = "__new__";
  newOption.textContent = "Crear otro perfil…";
  profileSelect.append(newOption);
}

async function loadHistory() {
  const response = await fetch("/api/audits");
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "No se pudo cargar el historial.");
  }

  historyElement.replaceChildren();
  if (body.audits.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Todavía no hay auditorías.";
    historyElement.append(empty);
    return;
  }

  for (const audit of body.audits.slice(0, 10)) {
    const item = document.createElement("div");
    item.className = "history-item";

    const description = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = audit.profile ?? "Sin perfil";
    const details = document.createElement("span");
    details.textContent =
      `${audit.summary.validPairs} pares · ` +
      new Date(audit.scannedAt).toLocaleString("es-AR");
    description.append(title, details);

    const link = document.createElement("a");
    link.href = `/api/audits/${audit.id}?download=1`;
    link.textContent = "Descargar";
    item.append(description, link);
    historyElement.append(item);
  }
}

profileSelect.addEventListener("change", () => {
  const creating = profileSelect.value === "__new__";
  customProfile.classList.toggle("hidden", !creating);
  saveProfileButton.classList.toggle("hidden", !creating);
  if (creating) {
    customProfile.focus();
  }
});

saveProfileButton.addEventListener("click", async () => {
  const name = customProfile.value.trim();
  if (!name) {
    setStatus("Indicá un nombre para el perfil.", true);
    return;
  }

  setBusy(true);
  try {
    const response = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error ?? "No se pudo crear el perfil.");
    }
    await loadProfiles(body.profile.id);
    customProfile.value = "";
    customProfile.classList.add("hidden");
    saveProfileButton.classList.add("hidden");
    setStatus(`Perfil “${body.profile.name}” guardado.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  } finally {
    setBusy(false);
  }
});

browseButton.addEventListener("click", async () => {
  setBusy(true);
  setStatus("Abriendo selector de carpetas…");
  try {
    const response = await fetch("/api/select-folder", { method: "POST" });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error ?? "No se pudo abrir el selector.");
    }
    if (body.folder) {
      folderInput.value = body.folder;
      setStatus("Carpeta seleccionada.");
    } else {
      setStatus("No se eligió ninguna carpeta.");
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  } finally {
    setBusy(false);
  }
});

auditButton.addEventListener("click", async () => {
  const profile = selectedProfile();
  const folder = folderInput.value.trim();

  if (!profile) {
    setStatus("Indicá un nombre para el perfil.", true);
    return;
  }
  if (!folder) {
    setStatus("Elegí una carpeta para analizar.", true);
    return;
  }

  setBusy(true);
  setStatus("Leyendo nombres y metadatos. Los originales no se modificarán.");
  resultsElement.classList.add("hidden");

  try {
    const response = await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder, profile })
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error ?? "No se pudo completar la auditoría.");
    }

    renderReport(body);
    await loadHistory();
    setStatus(`Auditoría terminada para el perfil “${profile}”.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  } finally {
    setBusy(false);
  }
});

Promise.all([loadProfiles(), loadHistory()]).catch((error) => {
  setStatus(error instanceof Error ? error.message : String(error), true);
});
