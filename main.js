import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  addDoc,
  serverTimestamp,
  orderBy,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBM2mZO-aUpKY2_eI6RZ-owE32t950OK90",
  authDomain: "orarip-afb20.firebaseapp.com",
  databaseURL: "https://orarip-afb20-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "orarip-afb20",
  storageBucket: "orarip-afb20.firebasestorage.app",
  messagingSenderId: "565541237976",
  appId: "1:565541237976:web:54d9385b678f8fb4de93ad",
  measurementId: "G-VLXX8EF66K"
};

const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch {}
const db = getFirestore(app);

const state = {
  currentUser: null,
  employees: [],
  selectedSlots: new Set(),
  slots: generateSlots(),
  employeeMonthReport: null,
  personalVoiceDraft: null,
  adminVoiceDraft: null,
};

const $ = (id) => document.getElementById(id);

const els = {
  loginView: $("loginView"),
  appView: $("appView"),
  loginUsername: $("loginUsername"),
  loginPassword: $("loginPassword"),
  loginBtn: $("loginBtn"),
  loginMsg: $("loginMsg"),
  logoutBtn: $("logoutBtn"),
  welcomeName: $("welcomeName"),
  roleBadge: $("roleBadge"),
  adminTabBtn: $("adminTabBtn"),
  selectedDate: $("selectedDate"),
  rangeStart: $("rangeStart"),
  rangeEnd: $("rangeEnd"),
  addRangeBtn: $("addRangeBtn"),
  dayHours: $("dayHours"),
  slotCount: $("slotCount"),
  slotGrid: $("slotGrid"),
  clearSlotsBtn: $("clearSlotsBtn"),
  selectedRanges: $("selectedRanges"),
  saveDayBtn: $("saveDayBtn"),
  saveMsg: $("saveMsg"),
  reportMonth: $("reportMonth"),
  loadMyReportBtn: $("loadMyReportBtn"),
  myMonthHours: $("myMonthHours"),
  myMonthPay: $("myMonthPay"),
  myTotalHours: $("myTotalHours"),
  myTotalPay: $("myTotalPay"),
  myDaySummary: $("myDaySummary"),
  empName: $("empName"),
  empUsername: $("empUsername"),
  empPassword: $("empPassword"),
  empRate: $("empRate"),
  createEmployeeBtn: $("createEmployeeBtn"),
  createEmployeeMsg: $("createEmployeeMsg"),
  employeeList: $("employeeList"),
  adminDay: $("adminDay"),
  adminMonth: $("adminMonth"),
  loadAdminDayBtn: $("loadAdminDayBtn"),
  loadAdminMonthBtn: $("loadAdminMonthBtn"),
  adminDayReport: $("adminDayReport"),
  adminMonthReport: $("adminMonthReport"),
  adminReportEmployee: $("adminReportEmployee"),
  adminReportMonth: $("adminReportMonth"),
  loadEmployeeMonthBtn: $("loadEmployeeMonthBtn"),
  downloadEmployeePdfBtn: $("downloadEmployeePdfBtn"),
  employeePdfMsg: $("employeePdfMsg"),
  employeeMonthSummary: $("employeeMonthSummary"),
  employeeMonthTable: $("employeeMonthTable"),
  personalVoiceDate: $("personalVoiceDate"),
  personalVoiceText: $("personalVoiceText"),
  startPersonalVoiceBtn: $("startPersonalVoiceBtn"),
  parsePersonalVoiceBtn: $("parsePersonalVoiceBtn"),
  savePersonalVoiceBtn: $("savePersonalVoiceBtn"),
  personalVoiceMsg: $("personalVoiceMsg"),
  personalVoicePreview: $("personalVoicePreview"),
  voiceEmployee: $("voiceEmployee"),
  voiceDate: $("voiceDate"),
  voiceText: $("voiceText"),
  startVoiceBtn: $("startVoiceBtn"),
  parseVoiceBtn: $("parseVoiceBtn"),
  saveVoiceBtn: $("saveVoiceBtn"),
  voiceMsg: $("voiceMsg"),
  voicePreview: $("voicePreview"),
};

init();

async function init() {
  setDefaultDates();
  bindEvents();
  renderSlotGrid();
  await ensureAdminExists();
}

function bindEvents() {
  els.loginBtn.addEventListener("click", handleLogin);
  els.loginPassword.addEventListener("keydown", (event) => {
    if (event.key === "Enter") handleLogin();
  });
  els.logoutBtn.addEventListener("click", logout);
  els.selectedDate.addEventListener("change", loadSelectedDay);
  els.addRangeBtn.addEventListener("click", addRangeFromInputs);
  els.clearSlotsBtn.addEventListener("click", clearSelection);
  els.saveDayBtn.addEventListener("click", saveSelectedDay);
  els.loadMyReportBtn.addEventListener("click", loadMyReports);
  els.createEmployeeBtn.addEventListener("click", createEmployee);
  els.loadAdminDayBtn.addEventListener("click", loadAdminDayReport);
  els.loadAdminMonthBtn.addEventListener("click", loadAdminMonthReport);
  els.loadEmployeeMonthBtn.addEventListener("click", loadAdminEmployeeMonthReport);
  els.downloadEmployeePdfBtn.addEventListener("click", downloadAdminEmployeeMonthPdf);
  els.adminReportEmployee.addEventListener("change", clearEmployeeMonthReport);
  els.adminReportMonth.addEventListener("change", clearEmployeeMonthReport);

  els.startPersonalVoiceBtn.addEventListener("click", () => startVoiceDictation(els.personalVoiceText, els.personalVoiceMsg, parsePersonalVoice));
  els.parsePersonalVoiceBtn.addEventListener("click", parsePersonalVoice);
  els.savePersonalVoiceBtn.addEventListener("click", savePersonalVoiceDraft);
  els.personalVoiceText.addEventListener("input", () => setMsg(els.personalVoiceMsg, ""));

  els.startVoiceBtn.addEventListener("click", () => startVoiceDictation(els.voiceText, els.voiceMsg, parseAdminVoice));
  els.parseVoiceBtn.addEventListener("click", parseAdminVoice);
  els.saveVoiceBtn.addEventListener("click", saveAdminVoiceDraft);
  els.voiceText.addEventListener("input", () => setMsg(els.voiceMsg, ""));
  els.voiceEmployee.addEventListener("change", () => { state.adminVoiceDraft = null; renderVoiceEmpty(els.voicePreview, "Nessuna anteprima", "Detta o scrivi gli orari del dipendente scelto."); });
  els.voiceDate.addEventListener("change", () => { state.adminVoiceDraft = null; });
  els.personalVoiceDate.addEventListener("change", () => { state.personalVoiceDraft = null; });

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab, btn));
  });
}

function activateTab(tabId, btn) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  btn.classList.add("active");
  $(tabId).classList.add("active");
}

async function ensureAdminExists() {
  const q = query(collection(db, "employees"), where("username", "==", "admin"));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, "employees"), {
      name: "Admin",
      username: "admin",
      password: "admin123",
      role: "admin",
      hourlyRate: 0,
      active: true,
      createdAt: serverTimestamp()
    });
  }
}

async function handleLogin() {
  const username = els.loginUsername.value.trim();
  const password = els.loginPassword.value.trim();
  if (!username || !password) return setMsg(els.loginMsg, "Inserisci username e password.", "error");

  const q = query(collection(db, "employees"), where("username", "==", username));
  const snap = await getDocs(q);
  if (snap.empty) return setMsg(els.loginMsg, "Credenziali non valide.", "error");

  const docSnap = snap.docs.find(d => {
    const data = d.data();
    return data.password === password && data.active === true;
  });
  if (!docSnap) return setMsg(els.loginMsg, "Credenziali non valide.", "error");

  state.currentUser = { id: docSnap.id, ...docSnap.data() };
  els.welcomeName.textContent = state.currentUser.name;
  els.roleBadge.textContent = state.currentUser.role === "admin" ? "Admin" : "Dipendente";
  els.adminTabBtn.classList.toggle("hidden", state.currentUser.role !== "admin");
  els.loginView.classList.add("hidden");
  els.appView.classList.remove("hidden");
  setMsg(els.loginMsg, "");

  if (state.currentUser.role === "admin") {
    await loadEmployees();
    await loadAdminDayReport();
    await loadAdminMonthReport();
    await loadAdminEmployeeMonthReport({ silent: true });
  }

  await loadSelectedDay();
  await loadMyReports();
}

function logout() {
  state.currentUser = null;
  state.selectedSlots = new Set();
  state.employeeMonthReport = null;
  state.personalVoiceDraft = null;
  state.adminVoiceDraft = null;
  renderSelectedState();
  clearEmployeeMonthReport();
  els.appView.classList.add("hidden");
  els.loginView.classList.remove("hidden");
  els.loginUsername.value = "";
  els.loginPassword.value = "";
  activateTab("tabSchedule", document.querySelector('[data-tab="tabSchedule"]'));
}

function setDefaultDates() {
  const today = new Date();
  const ymd = dateToYMD(today);
  const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  els.selectedDate.value = ymd;
  els.adminDay.value = ymd;
  els.reportMonth.value = ym;
  els.adminMonth.value = ym;
  els.adminReportMonth.value = ym;
  els.personalVoiceDate.value = ymd;
  els.voiceDate.value = ymd;
}

function generateSlots() {
  const list = [];
  for (let m = 0; m < 24 * 60; m += 30) list.push(minutesToTime(m));
  return list;
}

function renderSlotGrid() {
  els.slotGrid.innerHTML = "";
  state.slots.forEach(time => {
    const btn = document.createElement("button");
    btn.className = "slot-btn";
    btn.textContent = time;
    btn.type = "button";
    btn.addEventListener("click", () => toggleSlot(time));
    els.slotGrid.appendChild(btn);
  });
  renderSelectedState();
}

function toggleSlot(time) {
  if (state.selectedSlots.has(time)) state.selectedSlots.delete(time);
  else state.selectedSlots.add(time);
  renderSelectedState();
}

function clearSelection() {
  state.selectedSlots = new Set();
  renderSelectedState();
}

function renderSelectedState() {
  const buttons = [...els.slotGrid.querySelectorAll(".slot-btn")];
  buttons.forEach((btn, i) => {
    const t = state.slots[i];
    btn.classList.toggle("active", state.selectedSlots.has(t));
  });

  const ranges = slotsToRanges([...state.selectedSlots]);
  els.selectedRanges.innerHTML = "";
  if (!ranges.length) {
    els.selectedRanges.innerHTML = `<div class="range-item"><div class="range-main"><strong>Nessuna fascia selezionata</strong><small>Tocca gli slot o usa inizio/fine.</small></div></div>`;
  } else {
    ranges.forEach(range => {
      const div = document.createElement("div");
      div.className = "range-item";
      div.innerHTML = `
        <div class="range-main">
          <strong>${range.start} - ${range.end}</strong>
          <small>${rangeHours(range).toFixed(2)} ore</small>
        </div>
        <button class="btn btn-light btn-sm" type="button">Rimuovi</button>
      `;
      div.querySelector("button").addEventListener("click", () => removeRange(range));
      els.selectedRanges.appendChild(div);
    });
  }

  els.slotCount.textContent = String(state.selectedSlots.size);
  els.dayHours.textContent = (state.selectedSlots.size * 0.5).toFixed(2);
  renderMyDaySummary(ranges);
}

function removeRange(range) {
  for (let m = timeToMinutes(range.start); m < timeToMinutes(range.end); m += 30) {
    state.selectedSlots.delete(minutesToTime(m));
  }
  renderSelectedState();
}

function addRangeFromInputs() {
  const start = els.rangeStart.value;
  const end = els.rangeEnd.value;
  if (!start || !end) return alert("Inserisci ora di inizio e fine.");
  const startM = timeToMinutes(start);
  const endM = timeToMinutes(end);
  if (endM <= startM) return alert("L'orario di fine deve essere dopo l'inizio.");
  if (startM % 30 !== 0 || endM % 30 !== 0) return alert("Usa orari a mezz'ora (es. 08:00, 08:30).");

  for (let m = startM; m < endM; m += 30) {
    state.selectedSlots.add(minutesToTime(m));
  }
  renderSelectedState();
}

async function loadSelectedDay() {
  if (!state.currentUser) return;
  clearSelection();
  const id = `${state.currentUser.id}_${els.selectedDate.value}`;
  const ref = doc(db, "workSessions", id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    state.selectedSlots = new Set(data.slots || []);
    renderSelectedState();
  }
}

async function saveSelectedDay() {
  if (!state.currentUser) return;
  const date = els.selectedDate.value;
  const slots = [...state.selectedSlots].sort();
  const ranges = slotsToRanges(slots);
  const totalHours = slots.length * 0.5;

  if (!date) return alert("Seleziona una data.");

  const ref = doc(db, "workSessions", `${state.currentUser.id}_${date}`);

  // Se non ci sono slot, elimino il documento: così il giorno sparisce dai report.
  if (slots.length === 0) {
    await deleteDoc(ref);
    setMsg(els.saveMsg, "Orario cancellato: giornata senza ore lavorate.", "success");

    if (state.currentUser.role === "admin") {
      await loadAdminDayReport();
      await loadAdminMonthReport();
      await loadAdminEmployeeMonthReport({ silent: true });
    }
    await loadMyReports();
    renderSelectedState();
    return;
  }

  const payload = {
    employeeId: state.currentUser.id,
    employeeName: state.currentUser.name,
    date,
    slots,
    ranges,
    totalHours,
    updatedAt: serverTimestamp()
  };

  await setDoc(ref, payload);
  setMsg(els.saveMsg, "Orari salvati correttamente.", "success");

  if (state.currentUser.role === "admin") {
    await loadAdminDayReport();
    await loadAdminMonthReport();
    await loadAdminEmployeeMonthReport({ silent: true });
  }
  await loadMyReports();
}


async function saveWorkSessionForEmployee(employee, date, slots) {
  const cleanSlots = [...new Set(slots)].sort();
  const ranges = slotsToRanges(cleanSlots);
  const totalHours = cleanSlots.length * 0.5;

  if (!employee?.id || !date) throw new Error("Dipendente o data non validi.");
  if (!cleanSlots.length) throw new Error("Nessun orario riconosciuto.");

  const ref = doc(db, "workSessions", `${employee.id}_${date}`);
  await setDoc(ref, {
    employeeId: employee.id,
    employeeName: employee.name || employee.username || "Dipendente",
    date,
    slots: cleanSlots,
    ranges,
    totalHours,
    updatedAt: serverTimestamp()
  });

  return { employee, date, slots: cleanSlots, ranges, totalHours };
}

function parsePersonalVoice() {
  if (!state.currentUser) return;
  const text = els.personalVoiceText.value.trim();
  const baseDate = els.personalVoiceDate.value || els.selectedDate.value || dateToYMD(new Date());

  try {
    const draft = buildVoiceDraft({
      text,
      baseDate,
      employee: state.currentUser,
      allowEmployeeFromText: false
    });

    state.personalVoiceDraft = draft;
    renderVoicePreview(els.personalVoicePreview, draft);
    setMsg(els.personalVoiceMsg, draft.shouldSave ? "Orari riconosciuti. Hai detto anche salva: puoi confermare o verranno salvati dalla dettatura." : "Anteprima pronta. Controlla e salva.", "success");
    return draft;
  } catch (error) {
    state.personalVoiceDraft = null;
    renderVoiceEmpty(els.personalVoicePreview, "Nessuna anteprima", "Non ho riconosciuto bene gli orari.");
    setMsg(els.personalVoiceMsg, error.message, "error");
    return null;
  }
}

async function savePersonalVoiceDraft() {
  if (!state.currentUser) return;
  const draft = state.personalVoiceDraft || parsePersonalVoice();
  if (!draft) return;

  try {
    await saveVoiceDraft(draft);
    const last = draft.days[draft.days.length - 1];
    els.selectedDate.value = last.date;
    els.reportMonth.value = last.date.slice(0, 7);
    state.selectedSlots = new Set(last.slots);
    renderSelectedState();
    await loadSelectedDay();
    await loadMyReports();
    if (state.currentUser.role === "admin") {
      await loadAdminDayReport();
      await loadAdminMonthReport();
      await loadAdminEmployeeMonthReport({ silent: true });
    }
    setMsg(els.personalVoiceMsg, `Salvato: ${draft.days.length} ${draft.days.length === 1 ? "giorno" : "giorni"}.`, "success");
  } catch (error) {
    setMsg(els.personalVoiceMsg, error.message, "error");
  }
}

function parseAdminVoice() {
  if (!state.currentUser || state.currentUser.role !== "admin") return null;
  const selectedEmployee = state.employees.find(emp => emp.id === els.voiceEmployee.value);
  const text = els.voiceText.value.trim();
  const baseDate = els.voiceDate.value || dateToYMD(new Date());

  try {
    const draft = buildVoiceDraft({
      text,
      baseDate,
      employee: selectedEmployee,
      employees: state.employees.filter(emp => emp.role !== "admin" && emp.active !== false),
      allowEmployeeFromText: true
    });

    state.adminVoiceDraft = draft;
    if (draft.employee?.id && draft.employee.id !== els.voiceEmployee.value) {
      els.voiceEmployee.value = draft.employee.id;
    }
    renderVoicePreview(els.voicePreview, draft);
    setMsg(els.voiceMsg, draft.shouldSave ? "Orari riconosciuti. Hai detto anche salva." : "Anteprima pronta. Controlla e salva.", "success");
    return draft;
  } catch (error) {
    state.adminVoiceDraft = null;
    renderVoiceEmpty(els.voicePreview, "Nessuna anteprima", "Non ho riconosciuto bene dipendente, data o orari.");
    setMsg(els.voiceMsg, error.message, "error");
    return null;
  }
}

async function saveAdminVoiceDraft() {
  if (!state.currentUser || state.currentUser.role !== "admin") return;
  const draft = state.adminVoiceDraft || parseAdminVoice();
  if (!draft) return;

  try {
    await saveVoiceDraft(draft);
    const first = draft.days[0];
    els.adminDay.value = first.date;
    els.adminMonth.value = first.date.slice(0, 7);
    els.adminReportMonth.value = first.date.slice(0, 7);
    els.adminReportEmployee.value = draft.employee.id;
    await loadAdminDayReport();
    await loadAdminMonthReport();
    await loadAdminEmployeeMonthReport({ silent: true });
    setMsg(els.voiceMsg, `Salvato per ${draft.employee.name || "dipendente"}: ${draft.days.length} ${draft.days.length === 1 ? "giorno" : "giorni"}.`, "success");
  } catch (error) {
    setMsg(els.voiceMsg, error.message, "error");
  }
}

async function saveVoiceDraft(draft) {
  if (!draft?.employee || !draft.days?.length) throw new Error("Prima crea un'anteprima valida.");

  for (const day of draft.days) {
    await saveWorkSessionForEmployee(draft.employee, day.date, day.slots);
  }

  return draft;
}

function buildVoiceDraft({ text, baseDate, employee, employees = [], allowEmployeeFromText = false }) {
  if (!text) throw new Error("Detta o scrivi una frase con gli orari.");

  const normalized = normalizeText(text);
  const detectedEmployee = allowEmployeeFromText ? findEmployeeInText(normalized, employees) : null;
  const finalEmployee = detectedEmployee || employee;
  if (!finalEmployee?.id) throw new Error("Seleziona un dipendente.");

  const dates = parseDatesFromText(normalized, baseDate);
  const ranges = parseTimeRanges(normalized);
  if (!ranges.length) throw new Error("Non ho trovato fasce orarie. Esempio: oggi dalle 10 alle 21.");

  const slots = rangesToSlots(ranges);
  if (!slots.length) throw new Error("Gli orari devono essere validi e a mezz'ora, per esempio 10:00 o 10:30.");

  const days = dates.map(date => ({ date, slots, ranges, totalHours: slots.length * 0.5 }));
  const shouldSave = /\b(salva|salvami|salvamele|salvamelo|conferma|registra|registrami)\b/.test(normalized);

  return {
    employee: finalEmployee,
    days,
    ranges,
    shouldSave,
    originalText: text
  };
}

function startVoiceDictation(textarea, msgEl, afterResult) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    setMsg(msgEl, "Dettatura non supportata su questo browser. Puoi scrivere la frase a mano.", "error");
    return;
  }

  const recognition = new Recognition();
  recognition.lang = "it-IT";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => setMsg(msgEl, "Sto ascoltando...", "success");
  recognition.onerror = () => setMsg(msgEl, "Non sono riuscito a capire il vocale. Riprova o scrivi la frase.", "error");
  recognition.onresult = async (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript || "";
    textarea.value = transcript;
    setMsg(msgEl, `Ho capito: “${transcript}”`, "success");
    const draft = afterResult();
    if (draft?.shouldSave) {
      if (textarea === els.personalVoiceText) await savePersonalVoiceDraft();
      else await saveAdminVoiceDraft();
    }
  };

  recognition.start();
}

function renderVoicePreview(container, draft) {
  const totalHours = draft.days.reduce((sum, day) => sum + day.totalHours, 0);
  const dayText = draft.days.length === 1 ? formatDateIT(draft.days[0].date) : `${formatDateIT(draft.days[0].date)} - ${formatDateIT(draft.days[draft.days.length - 1].date)}`;
  container.innerHTML = `
    <div class="summary-item voice-ready">
      <strong>${escapeHTML(draft.employee.name || "Dipendente")}</strong>
      <div class="big">${escapeHTML(formatRanges({ ranges: draft.ranges }))}</div>
      <small>${escapeHTML(dayText)} • ${totalHours.toFixed(2)} ore totali${draft.shouldSave ? " • salvataggio richiesto" : ""}</small>
    </div>
  `;
}

function renderVoiceEmpty(container, title, subtitle) {
  container.innerHTML = `
    <div class="summary-item">
      <strong>${escapeHTML(title)}</strong>
      <small>${escapeHTML(subtitle)}</small>
    </div>
  `;
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function findEmployeeInText(normalizedText, employees) {
  return employees.find(emp => {
    const name = normalizeText(emp.name || "");
    const username = normalizeText(emp.username || "");
    if (name && normalizedText.includes(name)) return true;
    if (username && normalizedText.includes(username)) return true;
    const firstName = name.split(" ")[0];
    return firstName.length >= 3 && normalizedText.includes(firstName);
  }) || null;
}

function parseDatesFromText(text, baseDate) {
  const base = new Date(`${baseDate}T12:00:00`);
  const monthNames = {
    gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6,
    luglio: 7, agosto: 8, settembre: 9, ottobre: 10, novembre: 11, dicembre: 12
  };

  const rangeMatch = text.match(/\bdal\s+(\d{1,2})(?:\s+\w+)?\s+al\s+(\d{1,2})\s*(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)?(?:\s+(\d{4}))?/);
  if (rangeMatch) {
    const startDay = Number(rangeMatch[1]);
    const endDay = Number(rangeMatch[2]);
    const month = rangeMatch[3] ? monthNames[rangeMatch[3]] : base.getMonth() + 1;
    const year = rangeMatch[4] ? Number(rangeMatch[4]) : base.getFullYear();
    if (endDay < startDay) throw new Error("Intervallo date non valido.");
    const dates = [];
    for (let day = startDay; day <= endDay; day++) {
      dates.push(dateToYMD(new Date(year, month - 1, day)));
    }
    return dates;
  }

  if (/\bdomani\b/.test(text)) return [dateToYMD(addDays(base, 1))];
  if (/\bieri\b/.test(text)) return [dateToYMD(addDays(base, -1))];
  if (/\boggi\b/.test(text)) return [dateToYMD(base)];

  const numericDate = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/);
  if (numericDate) {
    const day = Number(numericDate[1]);
    const month = Number(numericDate[2]);
    let year = numericDate[3] ? Number(numericDate[3]) : base.getFullYear();
    if (year < 100) year += 2000;
    return [dateToYMD(new Date(year, month - 1, day))];
  }

  const textDate = text.match(/\b(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+(\d{4}))?\b/);
  if (textDate) {
    const day = Number(textDate[1]);
    const month = monthNames[textDate[2]];
    const year = textDate[3] ? Number(textDate[3]) : base.getFullYear();
    return [dateToYMD(new Date(year, month - 1, day))];
  }

  return [dateToYMD(base)];
}

function parseTimeRanges(text) {
  const ranges = [];
  const rangeRegex = /(?:dalle?|da)?\s*(\d{1,2})(?:[:.,](\d{2}))?\s*(?:alle?|a|-|fino alle?|fino a)\s*(\d{1,2})(?:[:.,](\d{2}))?/g;
  let match;

  while ((match = rangeRegex.exec(text)) !== null) {
    const start = buildTime(match[1], match[2]);
    const end = buildTime(match[3], match[4]);
    if (start !== null && end !== null && end > start) {
      ranges.push({ start: minutesToTime(start), end: minutesToTime(end) });
    }
  }

  return mergeRanges(ranges);
}

function buildTime(hourText, minuteText = "0") {
  let hour = Number(hourText);
  let minute = Number(minuteText || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 24 || minute < 0 || minute > 59) return null;
  if (hour === 24 && minute !== 0) return null;
  if (![0, 30].includes(minute)) return null;
  return hour * 60 + minute;
}

function rangesToSlots(ranges) {
  const slots = new Set();
  ranges.forEach(range => {
    const start = timeToMinutes(range.start);
    const end = timeToMinutes(range.end);
    for (let m = start; m < end; m += 30) {
      slots.add(minutesToTime(m));
    }
  });
  return [...slots].sort();
}

function mergeRanges(ranges) {
  const sorted = ranges
    .map(range => ({ start: timeToMinutes(range.start), end: timeToMinutes(range.end) }))
    .sort((a, b) => a.start - b.start);

  const merged = [];
  sorted.forEach(range => {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end) merged.push({ ...range });
    else last.end = Math.max(last.end, range.end);
  });

  return merged.map(range => ({ start: minutesToTime(range.start), end: minutesToTime(range.end) }));
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

async function loadMyReports() {
  if (!state.currentUser) return;
  const snap = await getDocs(query(collection(db, "workSessions"), where("employeeId", "==", state.currentUser.id)));
  const month = els.reportMonth.value;
  let monthHours = 0;
  let totalHours = 0;

  snap.forEach(d => {
    const data = d.data();
    totalHours += data.totalHours || 0;
    if (month && data.date?.startsWith(month)) monthHours += data.totalHours || 0;
  });

  const rate = Number(state.currentUser.hourlyRate || 0);
  els.myMonthHours.textContent = monthHours.toFixed(2);
  els.myMonthPay.textContent = formatEuro(monthHours * rate);
  els.myTotalHours.textContent = totalHours.toFixed(2);
  els.myTotalPay.textContent = formatEuro(totalHours * rate);
}

function renderMyDaySummary(ranges = slotsToRanges([...state.selectedSlots])) {
  els.myDaySummary.innerHTML = "";
  if (!ranges.length) {
    els.myDaySummary.innerHTML = `<div class="summary-item"><strong>${els.selectedDate.value || 'Nessuna data'}</strong><small>Nessun orario registrato per il giorno selezionato.</small></div>`;
    return;
  }
  const total = ranges.reduce((s, r) => s + rangeHours(r), 0);
  const item = document.createElement("div");
  item.className = "summary-item";
  item.innerHTML = `
    <strong>${els.selectedDate.value}</strong>
    <div class="big">${ranges.map(r => `${r.start} - ${r.end}`).join(" / ")}</div>
    <small>Totale giornata: ${total.toFixed(2)} ore</small>
  `;
  els.myDaySummary.appendChild(item);
}

async function createEmployee() {
  const name = els.empName.value.trim();
  const username = els.empUsername.value.trim();
  const password = els.empPassword.value.trim();
  const hourlyRate = Number(els.empRate.value || 0);

  if (!name || !username || !password) return setMsg(els.createEmployeeMsg, "Compila nome, username e password.", "error");

  const exists = await getDocs(query(collection(db, "employees"), where("username", "==", username)));
  if (!exists.empty) return setMsg(els.createEmployeeMsg, "Username già presente.", "error");

  await addDoc(collection(db, "employees"), {
    name,
    username,
    password,
    hourlyRate,
    role: "employee",
    active: true,
    createdAt: serverTimestamp()
  });

  els.empName.value = "";
  els.empUsername.value = "";
  els.empPassword.value = "";
  els.empRate.value = "";
  setMsg(els.createEmployeeMsg, "Dipendente creato con successo.", "success");
  await loadEmployees();
}

async function loadEmployees() {
  const snap = await getDocs(query(collection(db, "employees"), orderBy("name")));
  state.employees = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  els.employeeList.innerHTML = "";

  state.employees.forEach(emp => {
    const item = document.createElement("div");
    item.className = "employee-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHTML(emp.name || "Senza nome")}</strong>
        <small>@${escapeHTML(emp.username || "")} • ${emp.role === 'admin' ? 'Admin' : 'Dipendente'} • ${formatEuro(Number(emp.hourlyRate || 0))}/h</small>
      </div>
      ${emp.role === 'admin' ? '<span class="chip">Admin</span>' : '<button class="btn btn-light btn-sm" type="button">Elimina</button>'}
    `;
    const btn = item.querySelector("button");
    if (btn) btn.addEventListener("click", async () => {
      if (!confirm(`Eliminare ${emp.name}?`)) return;
      await deleteDoc(doc(db, "employees", emp.id));
      await loadEmployees();
      await loadAdminMonthReport();
      await loadAdminEmployeeMonthReport({ silent: true });
    });
    els.employeeList.appendChild(item);
  });

  populateAdminEmployeeSelect();
}

function populateAdminEmployeeSelect() {
  const previousReport = els.adminReportEmployee.value;
  const previousVoice = els.voiceEmployee.value;
  const employees = state.employees.filter(emp => emp.role !== "admin" && emp.active !== false);

  fillEmployeeSelect(els.adminReportEmployee, employees, previousReport);
  fillEmployeeSelect(els.voiceEmployee, employees, previousVoice);
}

function fillEmployeeSelect(selectEl, employees, previousValue) {
  selectEl.innerHTML = "";

  if (!employees.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Nessun dipendente disponibile";
    selectEl.appendChild(option);
    return;
  }

  employees.forEach(emp => {
    const option = document.createElement("option");
    option.value = emp.id;
    option.textContent = emp.name || emp.username || "Dipendente";
    selectEl.appendChild(option);
  });

  const stillExists = employees.some(emp => emp.id === previousValue);
  selectEl.value = stillExists ? previousValue : employees[0].id;
}

async function loadAdminDayReport() {
  if (!state.currentUser || state.currentUser.role !== "admin") return;
  const date = els.adminDay.value;
  const snap = await getDocs(query(collection(db, "workSessions"), where("date", "==", date)));
  const items = snap.docs.map(d => d.data()).sort((a, b) => String(a.employeeName || "").localeCompare(String(b.employeeName || "")));
  els.adminDayReport.innerHTML = "";

  if (!items.length) {
    els.adminDayReport.innerHTML = `<div class="report-item"><strong>Nessun dato</strong><small>Non ci sono orari salvati per ${date}.</small></div>`;
    return;
  }

  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "report-item";
    div.innerHTML = `
      <strong>${escapeHTML(item.employeeName || "Dipendente")}</strong>
      <div class="big">${escapeHTML(formatRanges(item) || "-")}</div>
      <small>${Number(item.totalHours || 0).toFixed(2)} ore</small>
    `;
    els.adminDayReport.appendChild(div);
  });
}

async function loadAdminMonthReport() {
  if (!state.currentUser || state.currentUser.role !== "admin") return;
  const month = els.adminMonth.value;
  const snap = await getDocs(collection(db, "workSessions"));
  const filtered = snap.docs.map(d => d.data()).filter(x => x.date?.startsWith(month));
  const map = new Map();

  filtered.forEach(item => {
    if (!map.has(item.employeeId)) map.set(item.employeeId, { name: item.employeeName, hours: 0 });
    map.get(item.employeeId).hours += item.totalHours || 0;
  });

  els.adminMonthReport.innerHTML = "";

  if (!map.size) {
    els.adminMonthReport.innerHTML = `<div class="report-item"><strong>Nessun dato</strong><small>Non ci sono orari salvati per ${month}.</small></div>`;
    return;
  }

  [...map.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
    .forEach(row => {
      const employee = state.employees.find(e => e.id === row.id);
      const rate = Number(employee?.hourlyRate || 0);
      const div = document.createElement("div");
      div.className = "report-item";
      div.innerHTML = `
        <strong>${escapeHTML(row.name || "Dipendente")}</strong>
        <div class="big">${row.hours.toFixed(2)} ore</div>
        <small>Compenso stimato: ${formatEuro(row.hours * rate)}</small>
      `;
      els.adminMonthReport.appendChild(div);
    });
}

async function loadAdminEmployeeMonthReport(options = {}) {
  if (!state.currentUser || state.currentUser.role !== "admin") return null;
  const employeeId = els.adminReportEmployee.value;
  const month = els.adminReportMonth.value;

  if (!employeeId || !month) {
    clearEmployeeMonthReport("Seleziona dipendente e mese.");
    return null;
  }

  const employee = state.employees.find(emp => emp.id === employeeId);
  if (!employee) {
    clearEmployeeMonthReport("Dipendente non trovato.");
    return null;
  }

  const rows = await buildEmployeeMonthRows(employeeId, month);
  const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);
  const daysWorked = rows.filter(row => row.hours > 0).length;
  const rate = Number(employee.hourlyRate || 0);
  const totalPay = totalHours * rate;

  state.employeeMonthReport = {
    employee,
    month,
    rows,
    totalHours,
    daysWorked,
    totalPay
  };

  renderEmployeeMonthSummary(state.employeeMonthReport);
  renderEmployeeMonthTable(rows);

  if (!options.silent) {
    setMsg(els.employeePdfMsg, "Report caricato.", "success");
  }

  return state.employeeMonthReport;
}

async function buildEmployeeMonthRows(employeeId, month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const snap = await getDocs(query(collection(db, "workSessions"), where("employeeId", "==", employeeId)));
  const sessionsByDate = new Map();

  snap.docs
    .map(d => d.data())
    .filter(item => item.date?.startsWith(month))
    .forEach(item => sessionsByDate.set(item.date, item));

  const rows = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const session = sessionsByDate.get(date);
    rows.push({
      date,
      dateLabel: formatDateIT(date),
      weekday: formatWeekdayIT(date),
      rangesText: session ? formatRanges(session) : "-",
      hours: Number(session?.totalHours || 0),
    });
  }

  return rows;
}

function renderEmployeeMonthSummary(report) {
  els.employeeMonthSummary.innerHTML = `
    <div class="stat-card">
      <span>Dipendente</span>
      <strong>${escapeHTML(report.employee.name || "Dipendente")}</strong>
    </div>
    <div class="stat-card">
      <span>Mese</span>
      <strong>${formatMonthIT(report.month)}</strong>
    </div>
    <div class="stat-card">
      <span>Ore mese</span>
      <strong>${report.totalHours.toFixed(2)}</strong>
    </div>
    <div class="stat-card">
      <span>Giorni lavorati</span>
      <strong>${report.daysWorked}</strong>
    </div>
    <div class="stat-card">
      <span>Paga oraria</span>
      <strong>${formatEuro(Number(report.employee.hourlyRate || 0))}</strong>
    </div>
    <div class="stat-card">
      <span>Compenso stimato</span>
      <strong>${formatEuro(report.totalPay)}</strong>
    </div>
  `;
}

function renderEmployeeMonthTable(rows) {
  if (!rows.length) {
    els.employeeMonthTable.innerHTML = `<tr><td colspan="4">Nessun giorno trovato.</td></tr>`;
    return;
  }

  els.employeeMonthTable.innerHTML = rows.map(row => `
    <tr class="${row.hours > 0 ? 'worked' : ''}">
      <td>${escapeHTML(row.dateLabel)}</td>
      <td>${escapeHTML(row.weekday)}</td>
      <td>${escapeHTML(row.rangesText)}</td>
      <td>${row.hours > 0 ? row.hours.toFixed(2) : '-'}</td>
    </tr>
  `).join("");
}

function clearEmployeeMonthReport(message = "") {
  state.employeeMonthReport = null;
  if (els.employeeMonthSummary) els.employeeMonthSummary.innerHTML = "";
  if (els.employeeMonthTable) {
    els.employeeMonthTable.innerHTML = `<tr><td colspan="4">Carica un report mensile.</td></tr>`;
  }
  if (message) setMsg(els.employeePdfMsg, message, "error");
  else setMsg(els.employeePdfMsg, "");
}

async function downloadAdminEmployeeMonthPdf() {
  if (!state.currentUser || state.currentUser.role !== "admin") return;

  let report = state.employeeMonthReport;
  const selectedEmployeeId = els.adminReportEmployee.value;
  const selectedMonth = els.adminReportMonth.value;

  if (!report || report.employee.id !== selectedEmployeeId || report.month !== selectedMonth) {
    report = await loadAdminEmployeeMonthReport({ silent: true });
  }

  if (!report) return;

  const JsPDF = window.jspdf?.jsPDF;
  if (!JsPDF) {
    setMsg(els.employeePdfMsg, "PDF non disponibile: controlla la connessione e ricarica la pagina.", "error");
    return;
  }

  const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const tableWidth = pageWidth - margin * 2;
  const colDate = 25;
  const colDay = 34;
  const colHours = 18;
  const colRanges = tableWidth - colDate - colDay - colHours;
  const lineHeight = 5;

  let y = 16;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("Report mensile orari", margin, y);

  y += 8;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Dipendente: ${report.employee.name || "Dipendente"}`, margin, y);
  y += 6;
  pdf.text(`Mese: ${formatMonthIT(report.month)}`, margin, y);
  y += 6;
  pdf.text(`Ore mese: ${report.totalHours.toFixed(2)} - Giorni lavorati: ${report.daysWorked}`, margin, y);
  y += 6;
  pdf.text(`Paga oraria: ${formatEuro(Number(report.employee.hourlyRate || 0))} - Compenso stimato: ${formatEuro(report.totalPay)}`, margin, y);
  y += 9;

  drawPdfTableHeader();

  report.rows.forEach(row => {
    const rangesLines = pdf.splitTextToSize(row.rangesText, colRanges - 4);
    const rowHeight = Math.max(8, rangesLines.length * lineHeight + 4);

    if (y + rowHeight > pageHeight - 14) {
      pdf.addPage();
      y = 16;
      drawPdfTableHeader();
    }

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.rect(margin, y, tableWidth, rowHeight);
    pdf.line(margin + colDate, y, margin + colDate, y + rowHeight);
    pdf.line(margin + colDate + colDay, y, margin + colDate + colDay, y + rowHeight);
    pdf.line(margin + colDate + colDay + colRanges, y, margin + colDate + colDay + colRanges, y + rowHeight);

    pdf.text(row.dateLabel, margin + 2, y + 5);
    pdf.text(row.weekday, margin + colDate + 2, y + 5);
    pdf.text(rangesLines, margin + colDate + colDay + 2, y + 5);
    pdf.text(row.hours > 0 ? row.hours.toFixed(2) : "-", margin + colDate + colDay + colRanges + 2, y + 5);

    y += rowHeight;
  });

  const fileName = `report-${slugify(report.employee.name || "dipendente")}-${report.month}.pdf`;
  pdf.save(fileName);
  setMsg(els.employeePdfMsg, "PDF scaricato.", "success");

  function drawPdfTableHeader() {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.rect(margin, y, tableWidth, 8);
    pdf.line(margin + colDate, y, margin + colDate, y + 8);
    pdf.line(margin + colDate + colDay, y, margin + colDate + colDay, y + 8);
    pdf.line(margin + colDate + colDay + colRanges, y, margin + colDate + colDay + colRanges, y + 8);
    pdf.text("Data", margin + 2, y + 5);
    pdf.text("Giorno", margin + colDate + 2, y + 5);
    pdf.text("Orari", margin + colDate + colDay + 2, y + 5);
    pdf.text("Ore", margin + colDate + colDay + colRanges + 2, y + 5);
    y += 8;
  }
}

function formatRanges(item) {
  const ranges = Array.isArray(item?.ranges) && item.ranges.length
    ? item.ranges
    : slotsToRanges(item?.slots || []);

  return ranges.map(r => `${r.start} - ${r.end}`).join(" / ");
}

function slotsToRanges(slots) {
  const sorted = slots.map(timeToMinutes).sort((a, b) => a - b);
  if (!sorted.length) return [];
  const ranges = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur !== prev + 30) {
      ranges.push({ start: minutesToTime(start), end: minutesToTime(prev + 30) });
      start = cur;
    }
    prev = cur;
  }
  return ranges;
}

function rangeHours(range) {
  return (timeToMinutes(range.end) - timeToMinutes(range.start)) / 60;
}

function minutesToTime(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function timeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function dateToYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateIT(dateString) {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function formatWeekdayIT(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  const text = new Intl.DateTimeFormat("it-IT", { weekday: "long" }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatMonthIT(monthString) {
  const [year, month] = monthString.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const text = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatEuro(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR"
  }).format(Number(value || 0));
}

function slugify(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "report";
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setMsg(el, text, type = "") {
  el.textContent = text;
  el.className = `msg ${type}`.trim();
}
