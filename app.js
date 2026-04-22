const STORAGE_KEY = "weekly-planner-state-v1";
const DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const DAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const HOURS = Array.from({ length: 17 }, (_, index) => 6 + index);
const HOUR_HEIGHT = 72;
const DEFAULT_STATE = {
  people: [
    { id: crypto.randomUUID(), name: "Persona 1", color: "#e76f51" },
    { id: crypto.randomUUID(), name: "Persona 2", color: "#2a9d8f" },
    { id: crypto.randomUUID(), name: "Persona 3", color: "#577590" },
    { id: crypto.randomUUID(), name: "Persona 4", color: "#f4a261" },
    { id: crypto.randomUUID(), name: "Persona 5", color: "#7b6d8d" },
  ],
  entries: [],
};

let state = loadState();

const peopleList = document.querySelector("#people-list");
const personTemplate = document.querySelector("#person-row-template");
const entryForm = document.querySelector("#entry-form");
const entryType = document.querySelector("#entry-type");
const entryDay = document.querySelector("#entry-day");
const entryRepeat = document.querySelector("#entry-repeat");
const entryPerson = document.querySelector("#entry-person");
const personLabelText = document.querySelector("#person-label-text");
const editContextBanner = document.querySelector("#edit-context-banner");
const entriesTable = document.querySelector("#entries-table");
const plannerCanvas = document.querySelector("#planner-canvas");
const plannerEmpty = document.querySelector("#planner-empty");
const plannerSummary = document.querySelector("#planner-summary");
const legendChips = document.querySelector("#legend-chips");
const jsonUpload = document.querySelector("#json-upload");
const repeatDaysWrap = document.querySelector("#repeat-days-wrap");
const repeatDayInputs = Array.from(document.querySelectorAll('input[name="repeat-day"]'));
const addPersonButton = document.querySelector("#add-person");
const installAppButton = document.querySelector("#install-app");

let currentEditContext = null;
let pendingPersonFocusId = null;
let deferredInstallPrompt = null;

if (addPersonButton) {
  addPersonButton.addEventListener("click", addPerson);
}
if (installAppButton) {
  installAppButton.addEventListener("click", handleInstallApp);
}

document.querySelector("#seed-week").addEventListener("click", loadDemoWeek);
document.querySelector("#reset-week").addEventListener("click", clearWeek);
document.querySelector("#cancel-edit").addEventListener("click", resetForm);
document.querySelector("#download-svg").addEventListener("click", exportSvg);
document.querySelector("#download-png").addEventListener("click", exportPng);
document.querySelector("#print-planner").addEventListener("click", () => window.print());
document.querySelector("#save-json").addEventListener("click", exportJson);
jsonUpload.addEventListener("change", importJson);
entryType.addEventListener("change", syncEntryPersonSelect);
entryDay.addEventListener("change", syncRepeatDaySelectionFromDay);
entryRepeat.addEventListener("change", syncRepeatControls);
repeatDayInputs.forEach((input) => input.addEventListener("change", handleRepeatDayToggle));
entryForm.addEventListener("submit", saveEntry);
window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
window.addEventListener("appinstalled", handleAppInstalled);

render();
initializeAppShell();

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return structuredClone(DEFAULT_STATE);
  }

  try {
    const parsed = JSON.parse(raw);
    const people = mergePeople(parsed);
    return {
      people: people.length ? people : DEFAULT_STATE.people,
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function persistAndRender() {
  persistState();
  render();
}

function initializeAppShell() {
  registerServiceWorker();
  updateInstallButtonVisibility();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

function handleBeforeInstallPrompt(event) {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallButtonVisibility();
}

async function handleInstallApp() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice.catch(() => {});
    deferredInstallPrompt = null;
    updateInstallButtonVisibility();
    return;
  }

  if (isIosInstallCandidate()) {
    window.alert("En Safari, tocá Compartir y después 'Agregar a pantalla de inicio'.");
    return;
  }

  if (isFirefoxBrowser()) {
    window.alert("Firefox no ofrece instalación PWA desde esta página. Para instalarla como app, abrila en Chrome o Edge. En iPhone/iPad, usá Safari y 'Agregar a pantalla de inicio'.");
    return;
  }

  window.alert("Este navegador no mostró el prompt de instalación. Probá con Chrome o Edge para instalar la app desde esta página.");
}

function handleAppInstalled() {
  deferredInstallPrompt = null;
  updateInstallButtonVisibility();
}

function updateInstallButtonVisibility() {
  if (!installAppButton) {
    return;
  }

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  installAppButton.hidden = isStandalone;

  if (deferredInstallPrompt) {
    installAppButton.textContent = "Instalar app";
    return;
  }

  if (isIosInstallCandidate()) {
    installAppButton.textContent = "Cómo instalar";
    return;
  }

  installAppButton.textContent = "Instalar app";
}

function isIosInstallCandidate() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios/.test(userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  return isIos && isSafari && !isStandalone;
}

function isFirefoxBrowser() {
  return /firefox|fxios/i.test(window.navigator.userAgent);
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  renderPeople(peopleList, state.people, "people");
  syncEntryPersonSelect();
  renderEntriesTable();
  renderLegend();
  renderPlanner();
}

function renderPeople(container, people, key) {
  container.innerHTML = "";

  people.forEach((person) => {
    const row = personTemplate.content.firstElementChild.cloneNode(true);
    const nameInput = row.querySelector(".person-name");
    const colorInput = row.querySelector(".person-color");
    nameInput.value = person.name;
    colorInput.value = person.color;

    nameInput.addEventListener("input", (event) => {
      person.name = event.target.value;
      persistState();
      syncEntryPersonSelect();
      renderEntriesTable();
      renderLegend();
      renderPlanner();
    });

    colorInput.addEventListener("input", (event) => {
      person.color = event.target.value;
      persistState();
      renderEntriesTable();
      renderLegend();
      renderPlanner();
    });

    row.querySelector(".remove-person").addEventListener("click", () => {
      if (people.length <= 1) {
        return;
      }

      state[key] = state[key].filter((item) => item.id !== person.id);
      state.entries = state.entries.filter((entry) => entry.personId !== person.id);
      persistAndRender();
    });

    container.appendChild(row);

    if (pendingPersonFocusId === person.id) {
      pendingPersonFocusId = null;
      requestAnimationFrame(() => {
        nameInput.focus();
        nameInput.select();
        row.scrollIntoView({ block: "nearest", inline: "nearest" });
      });
    }
  });
}

function addPerson() {
  const newPerson = {
    id: crypto.randomUUID(),
    name: `Persona ${state.people.length + 1}`,
    color: randomColor(),
  };
  pendingPersonFocusId = newPerson.id;
  state.people.push(newPerson);
  persistAndRender();
}

function syncEntryPersonSelect() {
  const collection = state.people;
  const previousValue = entryPerson.value;
  personLabelText.textContent = "Persona Principal";
  entryPerson.innerHTML = "";

  collection.forEach((person) => {
    const option = document.createElement("option");
    option.value = person.id;
    option.textContent = person.name || "Persona sin nombre";
    entryPerson.appendChild(option);
  });

  if (collection.some((person) => person.id === previousValue)) {
    entryPerson.value = previousValue;
  }
}

function saveEntry(event) {
  event.preventDefault();
  const id = document.querySelector("#entry-id").value;
  const repeatMode = entryRepeat.value;
  const repeatDays = getRepeatDaysFromForm();
  const entry = {
    id: id || crypto.randomUUID(),
    type: entryType.value,
    day: repeatMode === "weekly" ? repeatDays[0] : Number(entryDay.value),
    title: document.querySelector("#entry-title").value.trim(),
    personId: entryPerson.value,
    location: document.querySelector("#entry-location").value.trim(),
    start: document.querySelector("#entry-start").value,
    end: document.querySelector("#entry-end").value,
    notes: document.querySelector("#entry-notes").value.trim(),
    repeatMode,
    repeatDays,
  };

  if (!entry.title || !entry.start || !entry.end || entry.start >= entry.end) {
    window.alert("Completá un título y un horario válido.");
    return;
  }

  if (repeatMode === "weekly" && !repeatDays.length) {
    window.alert("Elegí al menos un día para los eventos repetidos.");
    return;
  }

  if (currentEditContext?.scope === "instance") {
    saveEditedInstance(entry);
    return;
  }

  const existingIndex = state.entries.findIndex((item) => item.id === entry.id);
  if (existingIndex >= 0) {
    state.entries[existingIndex] = entry;
  } else {
    state.entries.push(entry);
  }

  state.entries.sort(sortEntries);
  persistAndRender();
  resetForm();
}

function renderEntriesTable() {
  entriesTable.innerHTML = "";

  state.entries.forEach((entry) => {
    const person = getPersonForEntry(entry);
    const dayLabel = entry.repeatMode === "weekly" ? formatRepeatDays(entry.repeatDays) : DAYS[entry.day];
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(dayLabel)}</td>
      <td>${entry.start} - ${entry.end}</td>
      <td><span class="entry-type-pill" style="background:${withAlpha(person?.color || "#ccc", 0.18)}; color:${entry.type === "activity" ? "#994b33" : "#465360"}">${entry.type === "activity" ? "actividad" : "traslado"}</span></td>
      <td>${escapeHtml(entry.title)}${entry.repeatMode === "weekly" ? ` <span class="entry-type-pill" style="background:rgba(47,36,28,0.08); color:#2f241c">Repite ${escapeHtml(formatRepeatDays(entry.repeatDays))}</span>` : ""}</td>
      <td>${escapeHtml(person?.name || "Sin asignar")}</td>
      <td>${escapeHtml(entry.location || "—")}</td>
      <td>
        <button class="ghost compact" data-action="edit">Editar</button>
        <button class="ghost compact" data-action="delete">Eliminar</button>
      </td>
    `;

    row.querySelector('[data-action="edit"]').addEventListener("click", () => {
      editEntry(entry.id);
    });

    row.querySelector('[data-action="delete"]').addEventListener("click", () => {
      state.entries = state.entries.filter((item) => item.id !== entry.id);
      persistAndRender();
    });

    entriesTable.appendChild(row);
  });
}

function renderLegend() {
  legendChips.innerHTML = "";
  state.people.forEach((person) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `
      <span class="chip-swatch" style="background:${person.color}"></span>
      <span>${escapeHtml(person.name)}</span>
    `;
    legendChips.appendChild(chip);
  });

  const occurrences = expandEntries(state.entries);
  const activities = occurrences.filter((entry) => entry.type === "activity").length;
  const transport = occurrences.filter((entry) => entry.type === "transport").length;
  plannerSummary.textContent = occurrences.length
    ? `${occurrences.length} bloques esta semana: ${activities} actividades y ${transport} traslados.`
    : "Todavía no hay bloques cargados.";
}

function renderPlanner() {
  const occurrences = expandEntries(state.entries);
  if (!occurrences.length) {
    plannerCanvas.innerHTML = "";
    plannerEmpty.hidden = false;
    return;
  }

  plannerEmpty.hidden = true;
  plannerCanvas.innerHTML = createPlannerSvg(occurrences);
  plannerCanvas.querySelectorAll(".planner-edit-title").forEach((element) => {
    element.addEventListener("click", () => {
      editEntryInstance(element.dataset.entryId, Number(element.dataset.day));
    });
  });
}

function createPlannerSvg(occurrences) {
  const dayWidth = 180;
  const labelWidth = 88;
  const headerHeight = 60;
  const svgWidth = labelWidth + DAYS.length * dayWidth;
  const svgHeight = headerHeight + HOURS.length * HOUR_HEIGHT;

  const hourLines = HOURS.map((hour, index) => {
    const y = headerHeight + index * HOUR_HEIGHT;
    return `
      <line x1="${labelWidth}" y1="${y}" x2="${svgWidth}" y2="${y}" stroke="rgba(74,54,40,0.15)" />
      <text x="${labelWidth - 12}" y="${y + 18}" text-anchor="end" fill="#6b5a4b" font-size="13">${formatHour(hour)}</text>
    `;
  }).join("");

  const dayColumns = DAYS.map((day, index) => {
    const x = labelWidth + index * dayWidth;
    return `
      <rect x="${x}" y="0" width="${dayWidth}" height="${svgHeight}" fill="${index % 2 ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.34)"}" />
      <line x1="${x}" y1="0" x2="${x}" y2="${svgHeight}" stroke="rgba(74,54,40,0.14)" />
      <text x="${x + 18}" y="34" fill="#2f241c" font-size="18" font-family="Georgia, serif">${DAY_SHORT[index]}</text>
    `;
  }).join("");

  const blocks = occurrences.map((occurrence) => {
    const { entry, day } = occurrence;
    const person = getPersonForEntry(entry);
    const startMinutes = toMinutes(entry.start);
    const endMinutes = toMinutes(entry.end);
    const top = headerHeight + ((startMinutes - 360) / 60) * HOUR_HEIGHT;
    const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 36);
    const x = labelWidth + day * dayWidth + 10;
    const width = dayWidth - 20;
    const fill = person?.color || "#94a3b8";
    const stripe = entry.type === "transport" ? "#243b53" : "#8c3d20";
    const titleY = top + 22;
    const subY = top + 40;
    const noteY = top + 57;
    const iconX = x + 18;
    const iconY = top + 11;
    const titleX = x + 42;
    const title = escapeHtml(entry.title);
    const personName = escapeHtml(person?.name || "Sin asignar");
    const line2 = escapeHtml(`${entry.start} - ${entry.end} · ${personName}`);
    const line3 = escapeHtml(entry.location || entry.notes || "");
    const isCompactCard = height < 70;
    const canShowThreeLines = height >= 90;
    const iconMarkup = entry.type === "transport"
      ? createTransportIcon(iconX, iconY)
      : createActivityIcon(iconX, iconY);

    return `
      <g class="planner-event" data-entry-id="${entry.id}" data-day="${day}">
        <rect x="${x}" y="${top}" width="${width}" height="${height}" rx="18" fill="${fill}" opacity="0.88" />
        <rect x="${x}" y="${top}" width="8" height="${height}" rx="18" fill="${stripe}" opacity="0.92" />
        ${iconMarkup}
        <text class="planner-edit-title" data-entry-id="${entry.id}" data-day="${day}" x="${titleX}" y="${titleY}" fill="#ffffff" font-size="15" font-weight="700">${title}</text>
        ${isCompactCard ? "" : `<text x="${x + 18}" y="${subY}" fill="rgba(255,255,255,0.92)" font-size="12">${line2}</text>`}
        ${!isCompactCard && canShowThreeLines && line3 ? `<text x="${x + 18}" y="${noteY}" fill="rgba(255,255,255,0.84)" font-size="12">${line3}</text>` : ""}
      </g>
    `;
  }).join("");

  return `
    <svg
      id="planner-svg"
      xmlns="http://www.w3.org/2000/svg"
      width="${svgWidth}"
      height="${svgHeight}"
      viewBox="0 0 ${svgWidth} ${svgHeight}"
      role="img"
      aria-label="Horario semanal"
    >
      <rect width="${svgWidth}" height="${svgHeight}" fill="#fbf7f0" rx="28" />
      <rect x="0" y="0" width="${svgWidth}" height="${headerHeight}" fill="#efe2d1" />
      ${dayColumns}
      ${hourLines}
      <line x1="${labelWidth}" y1="${svgHeight}" x2="${svgWidth}" y2="${svgHeight}" stroke="rgba(74,54,40,0.15)" />
      ${blocks}
    </svg>
  `;
}

function createTransportIcon(x, y) {
  return `
    <g aria-hidden="true">
      <rect x="${x + 1}" y="${y + 6}" width="16" height="5" rx="2.5" fill="rgba(255,255,255,0.96)" />
      <path d="M ${x + 4} ${y + 6} L ${x + 7} ${y + 2} H ${x + 12} L ${x + 15} ${y + 6} Z" fill="rgba(255,255,255,0.96)" />
      <circle cx="${x + 5}" cy="${y + 12}" r="2" fill="${"#8c3d20"}" />
      <circle cx="${x + 13}" cy="${y + 12}" r="2" fill="${"#8c3d20"}" />
    </g>
  `;
}

function createActivityIcon(x, y) {
  return `
    <g aria-hidden="true">
      <rect x="${x + 1}" y="${y + 2}" width="16" height="14" rx="3" fill="none" stroke="rgba(255,255,255,0.96)" stroke-width="1.5" />
      <line x1="${x + 5}" y1="${y}" x2="${x + 5}" y2="${y + 4}" stroke="rgba(255,255,255,0.96)" stroke-width="1.5" stroke-linecap="round" />
      <line x1="${x + 13}" y1="${y}" x2="${x + 13}" y2="${y + 4}" stroke="rgba(255,255,255,0.96)" stroke-width="1.5" stroke-linecap="round" />
      <line x1="${x + 1}" y1="${y + 6}" x2="${x + 17}" y2="${y + 6}" stroke="rgba(255,255,255,0.96)" stroke-width="1.5" />
    </g>
  `;
}

function editEntry(entryId) {
  const entry = state.entries.find((item) => item.id === entryId);
  if (!entry) {
    return;
  }

  currentEditContext = { scope: "series", entryId: entry.id };
  setEditContextBanner("Estás editando toda la serie de este bloque.");
  document.querySelector("#entry-id").value = entry.id;
  entryType.value = entry.type;
  syncEntryPersonSelect();
  entryDay.value = String(entry.day);
  entryRepeat.value = entry.repeatMode || "none";
  setRepeatDaySelection(entry.repeatDays?.length ? entry.repeatDays : [entry.day]);
  syncRepeatControls();
  document.querySelector("#entry-title").value = entry.title;
  entryPerson.value = entry.personId;
  document.querySelector("#entry-location").value = entry.location || "";
  document.querySelector("#entry-start").value = entry.start;
  document.querySelector("#entry-end").value = entry.end;
  document.querySelector("#entry-notes").value = entry.notes || "";
  document.querySelector("#entry-title").focus();
}

function editEntryInstance(entryId, day) {
  const entry = state.entries.find((item) => item.id === entryId);
  if (!entry) {
    return;
  }

  if ((entry.repeatMode || "none") === "none") {
    editEntry(entryId);
    return;
  }

  currentEditContext = { scope: "instance", entryId: entry.id, day };
  setEditContextBanner(`Estás editando solo esta ocurrencia del ${DAYS[day]}.`);
  document.querySelector("#entry-id").value = "";
  entryType.value = entry.type;
  syncEntryPersonSelect();
  entryDay.value = String(day);
  entryRepeat.value = "none";
  setRepeatDaySelection([day]);
  syncRepeatControls();
  document.querySelector("#entry-title").value = entry.title;
  entryPerson.value = entry.personId;
  document.querySelector("#entry-location").value = entry.location || "";
  document.querySelector("#entry-start").value = entry.start;
  document.querySelector("#entry-end").value = entry.end;
  document.querySelector("#entry-notes").value = entry.notes || "";
  document.querySelector("#entry-title").focus();
}

function resetForm() {
  currentEditContext = null;
  setEditContextBanner("");
  entryForm.reset();
  document.querySelector("#entry-id").value = "";
  entryType.value = "activity";
  entryDay.value = "0";
  entryRepeat.value = "none";
  setRepeatDaySelection([0]);
  syncEntryPersonSelect();
  syncRepeatControls();
}

function getPersonForEntry(entry) {
  return state.people.find((person) => person.id === entry.personId);
}

function sortEntries(a, b) {
  return a.day - b.day || a.start.localeCompare(b.start) || a.end.localeCompare(b.end);
}

function toMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatHour(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function withAlpha(hex, alpha) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function randomColor() {
  const palette = ["#d62828", "#f77f00", "#2a9d8f", "#457b9d", "#6d597a", "#e56b6f"];
  return palette[Math.floor(Math.random() * palette.length)];
}

function clearWeek() {
  state.entries = [];
  persistAndRender();
  resetForm();
}

function loadDemoWeek() {
  state.entries = [
    {
      id: crypto.randomUUID(),
      type: "transport",
      day: 0,
      title: "Llevar al cole",
      personId: state.people[3]?.id || state.people[0]?.id || "",
      location: "Casa → Colegio",
      start: "07:20",
      end: "07:50",
      notes: "",
    },
    {
      id: crypto.randomUUID(),
      type: "activity",
      day: 0,
      title: "Práctica de fútbol",
      personId: state.people[0]?.id || "",
      location: "Cancha Norte",
      start: "16:00",
      end: "17:30",
      notes: "Llevar canilleras",
      repeatMode: "weekly",
      repeatDays: [0, 2],
    },
    {
      id: crypto.randomUUID(),
      type: "transport",
      day: 1,
      title: "Buscar en danza",
      personId: state.people[4]?.id || state.people[1]?.id || "",
      location: "Academia → Casa",
      start: "18:00",
      end: "18:30",
      notes: "",
    },
    {
      id: crypto.randomUUID(),
      type: "activity",
      day: 2,
      title: "Clase de piano",
      personId: state.people[1]?.id || "",
      location: "Sala de música",
      start: "17:00",
      end: "18:00",
      notes: "",
      repeatMode: "weekly",
      repeatDays: [2, 4],
    },
    {
      id: crypto.randomUUID(),
      type: "activity",
      day: 4,
      title: "Natación",
      personId: state.people[2]?.id || "",
      location: "Club acuático",
      start: "15:30",
      end: "17:00",
      notes: "Llevar gorra y antiparras",
    },
  ].sort(sortEntries);
  persistAndRender();
}

function exportSvg() {
  const svg = document.querySelector("#planner-svg");
  if (!svg) {
    window.alert("Todavía no hay una vista para exportar.");
    return;
  }

  const blob = new Blob([svg.outerHTML], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, "planner-semanal.svg");
}

async function exportPng() {
  const svg = document.querySelector("#planner-svg");
  if (!svg) {
    window.alert("Todavía no hay una vista para exportar.");
    return;
  }

  const data = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();

  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = svg.viewBox.baseVal.width * 2;
    canvas.height = svg.viewBox.baseVal.height * 2;
    const context = canvas.getContext("2d");
    context.fillStyle = "#fbf7f0";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((pngBlob) => {
      if (pngBlob) {
        downloadBlob(pngBlob, "planner-semanal.png");
      }
    }, "image/png");
  };

  image.src = url;
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  downloadBlob(blob, "planner-semanal-datos.json");
}

function importJson(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed.entries)) {
        throw new Error("Archivo inválido.");
      }

      const people = mergePeople(parsed);
      if (!people.length) {
        throw new Error("El archivo necesita al menos una persona.");
      }

      state = {
        people,
        entries: parsed.entries.map(normalizeEntry).filter(Boolean).sort(sortEntries),
      };

      persistAndRender();
      resetForm();
    } catch {
      window.alert("No se pudo importar ese archivo JSON.");
    } finally {
      jsonUpload.value = "";
    }
  };
  reader.readAsText(file);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function normalizePerson(person) {
  if (!person || typeof person !== "object") {
    return null;
  }

  return {
    id: String(person.id || crypto.randomUUID()),
    name: String(person.name || "").slice(0, 30),
    color: /^#[0-9a-f]{6}$/i.test(person.color) ? person.color : randomColor(),
  };
}

function mergePeople(source) {
  const fromPeople = Array.isArray(source.people) ? source.people : [];
  const fromKids = Array.isArray(source.kids) ? source.kids : [];
  const fromDrivers = Array.isArray(source.drivers) ? source.drivers : [];
  const merged = [...fromPeople, ...fromKids, ...fromDrivers].map(normalizePerson).filter(Boolean);
  const seen = new Set();

  return merged.filter((person) => {
    if (seen.has(person.id)) {
      return false;
    }
    seen.add(person.id);
    return true;
  });
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  if (!["activity", "transport"].includes(entry.type)) {
    return null;
  }

  if (typeof entry.day !== "number" || entry.day < 0 || entry.day > 6) {
    return null;
  }

  if (typeof entry.start !== "string" || typeof entry.end !== "string" || entry.start >= entry.end) {
    return null;
  }

  return {
    id: String(entry.id || crypto.randomUUID()),
    type: entry.type,
    day: entry.day,
    title: String(entry.title || "Sin título").slice(0, 60),
    personId: String(entry.personId || ""),
    location: String(entry.location || "").slice(0, 60),
    start: entry.start,
    end: entry.end,
    notes: String(entry.notes || "").slice(0, 160),
    repeatMode: entry.repeatMode === "weekly" ? "weekly" : "none",
    repeatDays: normalizeRepeatDays(entry),
  };
}

function normalizeRepeatDays(entry) {
  const rawDays = Array.isArray(entry.repeatDays) ? entry.repeatDays : [entry.day];
  const days = [...new Set(rawDays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))];
  return days.length ? days.sort((a, b) => a - b) : [entry.day];
}

function expandEntries(entries) {
  return entries
    .flatMap((entry) => {
      const days = entry.repeatMode === "weekly" ? normalizeRepeatDays(entry) : [entry.day];
      return days.map((day) => ({ entry, day }));
    })
    .sort((a, b) => a.day - b.day || a.entry.start.localeCompare(b.entry.start) || a.entry.end.localeCompare(b.entry.end));
}

function getRepeatDaysFromForm() {
  if (entryRepeat.value !== "weekly") {
    return [Number(entryDay.value)];
  }

  return repeatDayInputs
    .filter((input) => input.checked)
    .map((input) => Number(input.value))
    .sort((a, b) => a - b);
}

function setRepeatDaySelection(days) {
  const activeDays = new Set(days.map(Number));
  repeatDayInputs.forEach((input) => {
    input.checked = activeDays.has(Number(input.value));
  });
}

function syncRepeatControls() {
  const repeating = entryRepeat.value === "weekly";
  repeatDaysWrap.hidden = !repeating;

  if (repeating && !getRepeatDaysFromForm().length) {
    setRepeatDaySelection([Number(entryDay.value)]);
  }
}

function handleRepeatDayToggle() {
  const selectedDays = getRepeatDaysFromForm();
  if (!selectedDays.length) {
    return;
  }

  entryDay.value = String(selectedDays[0]);
}

function syncRepeatDaySelectionFromDay() {
  if (entryRepeat.value !== "weekly") {
    return;
  }

  const selectedDays = new Set(getRepeatDaysFromForm());
  selectedDays.add(Number(entryDay.value));
  setRepeatDaySelection([...selectedDays].sort((a, b) => a - b));
}

function formatRepeatDays(days) {
  return normalizeRepeatDays({ day: 0, repeatDays: days }).map((day) => DAY_SHORT[day]).join(", ");
}

function setEditContextBanner(message) {
  editContextBanner.textContent = message;
  editContextBanner.hidden = !message;
}

function saveEditedInstance(entry) {
  const sourceIndex = state.entries.findIndex((item) => item.id === currentEditContext.entryId);
  if (sourceIndex < 0) {
    state.entries.push(entry);
    state.entries.sort(sortEntries);
    persistAndRender();
    resetForm();
    return;
  }

  const sourceEntry = state.entries[sourceIndex];
  if ((sourceEntry.repeatMode || "none") === "none") {
    state.entries[sourceIndex] = { ...entry, id: sourceEntry.id };
  } else {
    const remainingDays = normalizeRepeatDays(sourceEntry).filter((day) => day !== currentEditContext.day);
    if (remainingDays.length) {
      state.entries[sourceIndex] = {
        ...sourceEntry,
        day: remainingDays[0],
        repeatDays: remainingDays,
      };
    } else {
      state.entries.splice(sourceIndex, 1);
    }

    state.entries.push(entry);
  }

  state.entries.sort(sortEntries);
  persistAndRender();
  resetForm();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
