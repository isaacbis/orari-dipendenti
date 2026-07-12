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
  loadingDay: false,
  saveTimer: null,
  saveChain: Promise.resolve(),
  saveVersion: 0,
  activeRecognition: null,
  activeVoiceButton: null
};

const $ = (id) => document.getElementById(id);
const on = (element, event, handler) => element?.addEventListener(event, handler);

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
  bottomNav: $("bottomNav"),
  selectedDate: $("selectedDate"),
  rangeStart: $("rangeStart"),
  rangeEnd: $("rangeEnd"),
  addRangeBtn: $("addRangeBtn"),
  dayHours: $("dayHours"),
  slotCount: $("slotCount"),
  slotGrid: $("slotGrid"),
  clearSlotsBtn: $("clearSlotsBtn"),
  selectedRanges: $("selectedRanges"),
  saveMsg: $("saveMsg"),
  autoSaveBadge: $("autoSaveBadge"),
  openQuickSlotsBtn: $("openQuickSlotsBtn"),
  quickSlotsModal: $("quickSlotsModal"),
  closeQuickSlotsBtn: $("closeQuickSlotsBtn"),
  doneQuickSlotsBtn: $("doneQuickSlotsBtn"),
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
  adminModuleSelect: $("adminModuleSelect"),
  personalVoiceModal: $("personalVoiceModal"),
  openVoiceModalBtn: $("openVoiceModalBtn"),
  closeVoiceModalBtn: $("closeVoiceModalBtn"),
  personalVoiceDate: $("personalVoiceDate"),
  personalVoiceText: $("personalVoiceText"),
  startPersonalVoiceBtn: $("startPersonalVoiceBtn"),
  parsePersonalVoiceBtn: $("parsePersonalVoiceBtn"),
  personalVoiceMsg: $("personalVoiceMsg"),
  personalVoicePreview: $("personalVoicePreview"),
  voiceEmployee: $("voiceEmployee"),
  voiceDate: $("voiceDate"),
  voiceText: $("voiceText"),
  startVoiceBtn: $("startVoiceBtn"),
  parseVoiceBtn: $("parseVoiceBtn"),
  voiceMsg: $("voiceMsg"),
  voicePreview: $("voicePreview")
};

init();

async function init() {
  setDefaultDates();
  bindEvents();
  renderSlotGrid();
  markSaveStatus("Salvato", "saved");
  try {
    await ensureAdminExists();
  } catch (error) {
    console.error("Impossibile verificare l'account admin:", error);
  }
}

function bindEvents() {
  on(els.loginBtn, "click", handleLogin);
  on(els.loginPassword, "keydown", (event) => {
    if (event.key === "Enter") handleLogin();
  });
  on(els.logoutBtn, "click", logout);

  on(els.selectedDate, "change", async () => {
    cancelPendingAutoSave();
    els.personalVoiceDate.value = els.selectedDate.value;
    await loadSelectedDay();
  });
  on(els.addRangeBtn, "click", addRangeFromInputs);
  on(els.clearSlotsBtn, "click", () => clearSelection({ save: true, ask: true }));

  on(els.loadMyReportBtn, "click", loadMyReports);
  on(els.reportMonth, "change", loadMyReports);
  on(els.createEmployeeBtn, "click", createEmployee);
  on(els.loadAdminDayBtn, "click", loadAdminDayReport);
  on(els.loadAdminMonthBtn, "click", loadAdminMonthReport);
  on(els.loadEmployeeMonthBtn, "click", loadAdminEmployeeMonthReport);
  on(els.downloadEmployeePdfBtn, "click", downloadAdminEmployeeMonthPdf);
  on(els.adminReportEmployee, "change", clearEmployeeMonthReport);
  on(els.adminReportMonth, "change", clearEmployeeMonthReport);

  on(els.openQuickSlotsBtn, "click", () => openModal(els.quickSlotsModal));
  on(els.closeQuickSlotsBtn, "click", () => closeModal(els.quickSlotsModal));
  on(els.doneQuickSlotsBtn, "click", () => closeModal(els.quickSlotsModal));
  on(els.openVoiceModalBtn, "click", () => {
    els.personalVoiceDate.value = els.selectedDate.value || els.personalVoiceDate.value;
    openModal(els.personalVoiceModal);
  });
  on(els.closeVoiceModalBtn, "click", () => closeModal(els.personalVoiceModal));

  on(els.quickSlotsModal, "click", (event) => {
    if (event.target === els.quickSlotsModal) closeModal(els.quickSlotsModal);
  });
  on(els.personalVoiceModal, "click", (event) => {
    if (event.target === els.personalVoiceModal) closeModal(els.personalVoiceModal);
  });

  on(els.startPersonalVoiceBtn, "click", () => startVoiceDictation({
    textarea: els.personalVoiceText,
    msgEl: els.personalVoiceMsg,
    button: els.startPersonalVoiceBtn,
    onFinal: parseAndSavePersonalVoice
  }));
  on(els.parsePersonalVoiceBtn, "click", parseAndSavePersonalVoice);
  on(els.personalVoiceText, "input", () => {
    state.personalVoiceDraft = null;
    setMsg(els.personalVoiceMsg, "");
  });
  on(els.personalVoiceDate, "change", () => { state.personalVoiceDraft = null; });

  on(els.startVoiceBtn, "click", () => startVoiceDictation({
    textarea: els.voiceText,
    msgEl: els.voiceMsg,
    button: els.startVoiceBtn,
    onFinal: parseAndSaveAdminVoice
  }));
  on(els.parseVoiceBtn, "click", parseAndSaveAdminVoice);
  on(els.voiceText, "input", () => {
    state.adminVoiceDraft = null;
    setMsg(els.voiceMsg, "");
  });
  on(els.voiceEmployee, "change", () => {
    state.adminVoiceDraft = null;
    renderVoiceEmpty(els.voicePreview, "Nessun orario", "");
  });
  on(els.voiceDate, "change", () => { state.adminVoiceDraft = null; });

  on(els.adminModuleSelect, "change", () => activateAdminModule(els.adminModuleSelect.value));

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab, btn));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeModal(els.quickSlotsModal);
    closeModal(els.personalVoiceModal);
    stopActiveRecognition();
  });
}

function activateTab(tabId, btn) {
  document.querySelectorAll(".tab-btn").forEach((button) => button.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
  btn?.classList.add("active");
  $(tabId)?.classList.add("active");

  if (tabId === "tabReports") loadMyReports();
  if (tabId === "tabAdmin" && state.currentUser?.role === "admin") {
    activateAdminModule(els.adminModuleSelect.value || "adminVoiceModule");
  }
}

function activateAdminModule(moduleId) {
  document.querySelectorAll(".admin-module").forEach((module) => module.classList.remove("active"));
  $(moduleId)?.classList.add("active");

  if (moduleId === "adminDayModule") loadAdminDayReport();
  if (moduleId === "adminMonthModule") loadAdminMonthReport();
  if (moduleId === "adminPdfModule") loadAdminEmployeeMonthReport({ silent: true });
}

function openModal(modal) {
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  if (!modal || modal.classList.contains("hidden")) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  stopActiveRecognition();
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

  els.loginBtn.disabled = true;
  els.loginBtn.textContent = "Accesso...";

  try {
    const q = query(collection(db, "employees"), where("username", "==", username));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error("Credenziali non valide.");

    const docSnap = snap.docs.find((item) => {
      const data = item.data();
      return data.password === password && data.active === true;
    });
    if (!docSnap) throw new Error("Credenziali non valide.");

    state.currentUser = { id: docSnap.id, ...docSnap.data() };
    els.welcomeName.textContent = state.currentUser.name || state.currentUser.username;
    els.roleBadge.textContent = state.currentUser.role === "admin" ? "Admin" : "Dipendente";
    els.adminTabBtn.classList.toggle("hidden", state.currentUser.role !== "admin");
    els.bottomNav?.classList.toggle("admin-enabled", state.currentUser.role === "admin");
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
  } catch (error) {
    setMsg(els.loginMsg, error.message || "Accesso non riuscito.", "error");
  } finally {
    els.loginBtn.disabled = false;
    els.loginBtn.textContent = "Entra";
  }
}

function logout() {
  cancelPendingAutoSave();
  stopActiveRecognition();
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
  els.bottomNav?.classList.remove("admin-enabled");
  closeModal(els.quickSlotsModal);
  closeModal(els.personalVoiceModal);
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
  for (let minutes = 0; minutes < 24 * 60; minutes += 30) list.push(minutesToTime(minutes));
  return list;
}

function renderSlotGrid() {
  els.slotGrid.innerHTML = "";
  state.slots.forEach((time) => {
    const btn = document.createElement("button");
    btn.className = "slot-btn";
    btn.textContent = time;
    btn.type = "button";
    btn.setAttribute("aria-label", `Orario ${time}`);
    btn.addEventListener("click", () => toggleSlot(time));
    els.slotGrid.appendChild(btn);
  });
  renderSelectedState();
}

function toggleSlot(time) {
  if (state.selectedSlots.has(time)) state.selectedSlots.delete(time);
  else state.selectedSlots.add(time);
  renderSelectedState();
  queueAutoSave(500);
}

function clearSelection(options = {}) {
  const { save = false, ask = false } = options;
  if (ask && state.selectedSlots.size && !confirm("Svuotare tutti gli orari del giorno selezionato?")) return;
  state.selectedSlots = new Set();
  renderSelectedState();
  if (save) queueAutoSave(100);
}

function renderSelectedState() {
  const buttons = [...els.slotGrid.querySelectorAll(".slot-btn")];
  buttons.forEach((btn, index) => {
    btn.classList.toggle("active", state.selectedSlots.has(state.slots[index]));
  });

  const ranges = slotsToRanges([...state.selectedSlots]);
  els.selectedRanges.innerHTML = "";

  if (!ranges.length) {
    els.selectedRanges.innerHTML = '<div class="empty-range">Nessuna fascia inserita.</div>';
  } else {
    ranges.forEach((range) => {
      const div = document.createElement("div");
      div.className = "range-item";
      div.innerHTML = `
        <div class="range-main">
          <strong>${range.start} - ${range.end}</strong>
          <small>${rangeHours(range).toFixed(2)} ore</small>
        </div>
        <button class="range-remove" type="button" aria-label="Rimuovi ${range.start} - ${range.end}">×</button>
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
  for (let minutes = timeToMinutes(range.start); minutes < timeToMinutes(range.end); minutes += 30) {
    state.selectedSlots.delete(minutesToTime(minutes));
  }
  renderSelectedState();
  queueAutoSave(150);
}

function addRangeFromInputs() {
  const start = els.rangeStart.value;
  const end = els.rangeEnd.value;
  if (!start || !end) return setMsg(els.saveMsg, "Inserisci inizio e fine.", "error");

  const startM = timeToMinutes(start);
  const endM = timeToMinutes(end);
  if (endM <= startM) return setMsg(els.saveMsg, "La fine deve essere successiva all'inizio.", "error");
  if (startM % 30 !== 0 || endM % 30 !== 0) return setMsg(els.saveMsg, "Usa orari a mezz'ora.", "error");

  for (let minutes = startM; minutes < endM; minutes += 30) {
    state.selectedSlots.add(minutesToTime(minutes));
  }

  els.rangeStart.value = "";
  els.rangeEnd.value = "";
  renderSelectedState();
  queueAutoSave(80);
}

function cancelPendingAutoSave() {
  if (state.saveTimer) clearTimeout(state.saveTimer);
  state.saveTimer = null;
}

function queueAutoSave(delay = 350) {
  if (!state.currentUser || state.loadingDay) return;
  cancelPendingAutoSave();

  const snapshot = {
    version: ++state.saveVersion,
    user: { ...state.currentUser },
    date: els.selectedDate.value,
    slots: [...state.selectedSlots].sort()
  };

  markSaveStatus("Salvataggio...", "saving");
  setMsg(els.saveMsg, "");

  state.saveTimer = setTimeout(() => {
    state.saveTimer = null;
    state.saveChain = state.saveChain
      .catch(() => {})
      .then(() => persistDaySnapshot(snapshot));
  }, delay);
}

async function persistDaySnapshot(snapshot) {
  if (!snapshot.user?.id || !snapshot.date) return;

  const ranges = slotsToRanges(snapshot.slots);
  const totalHours = snapshot.slots.length * 0.5;
  const ref = doc(db, "workSessions", `${snapshot.user.id}_${snapshot.date}`);

  try {
    if (!snapshot.slots.length) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, {
        employeeId: snapshot.user.id,
        employeeName: snapshot.user.name || snapshot.user.username || "Dipendente",
        date: snapshot.date,
        slots: snapshot.slots,
        ranges,
        totalHours,
        updatedAt: serverTimestamp()
      });
    }

    if (snapshot.version === state.saveVersion) {
      markSaveStatus("Salvato", "saved");
      setMsg(els.saveMsg, "");
    }

    await loadMyReports();
    if (snapshot.user.role === "admin") {
      await loadAdminDayReport();
      await loadAdminMonthReport();
      await loadAdminEmployeeMonthReport({ silent: true });
    }
  } catch (error) {
    console.error(error);
    if (snapshot.version === state.saveVersion) {
      markSaveStatus("Errore", "error");
      setMsg(els.saveMsg, "Salvataggio non riuscito. Controlla la connessione e riprova.", "error");
    }
  }
}

function markSaveStatus(text, type) {
  if (!els.autoSaveBadge) return;
  const symbols = { saved: "✓", saving: "…", error: "!" };
  els.autoSaveBadge.textContent = symbols[type] || "✓";
  els.autoSaveBadge.className = `save-badge ${type}`;
  els.autoSaveBadge.setAttribute("aria-label", text);
  els.autoSaveBadge.title = text;
}

async function loadSelectedDay() {
  if (!state.currentUser || !els.selectedDate.value) return;
  const requestedDate = els.selectedDate.value;
  state.loadingDay = true;
  markSaveStatus("Caricamento...", "saving");
  state.selectedSlots = new Set();
  renderSelectedState();

  try {
    const ref = doc(db, "workSessions", `${state.currentUser.id}_${requestedDate}`);
    const snap = await getDoc(ref);
    if (els.selectedDate.value !== requestedDate) return;
    state.selectedSlots = new Set(snap.exists() ? (snap.data().slots || []) : []);
    renderSelectedState();
    markSaveStatus("Salvato", "saved");
    setMsg(els.saveMsg, "");
  } catch (error) {
    console.error(error);
    markSaveStatus("Errore", "error");
    setMsg(els.saveMsg, "Non riesco a caricare la giornata.", "error");
  } finally {
    state.loadingDay = false;
  }
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
  if (!state.currentUser) return null;
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
    return draft;
  } catch (error) {
    state.personalVoiceDraft = null;
    renderVoiceEmpty(els.personalVoicePreview, "Nessun orario", "Non ho riconosciuto bene la frase.");
    setMsg(els.personalVoiceMsg, error.message, "error");
    return null;
  }
}

async function parseAndSavePersonalVoice() {
  const draft = parsePersonalVoice();
  if (!draft) return;
  await savePersonalVoiceDraft(draft);
}

async function savePersonalVoiceDraft(draft = state.personalVoiceDraft || parsePersonalVoice()) {
  if (!state.currentUser || !draft) return;
  try {
    setMsg(els.personalVoiceMsg, "");
    await saveVoiceDraft(draft);
    const last = draft.days[draft.days.length - 1];
    els.selectedDate.value = last.date;
    els.personalVoiceDate.value = last.date;
    els.reportMonth.value = last.date.slice(0, 7);
    state.selectedSlots = new Set(last.slots);
    renderSelectedState();
    markSaveStatus("Salvato", "saved");
    await loadMyReports();
    setMsg(els.personalVoiceMsg, "Salvato.", "success");
  } catch (error) {
    setMsg(els.personalVoiceMsg, error.message || "Salvataggio non riuscito.", "error");
  }
}

function parseAdminVoice() {
  if (!state.currentUser || state.currentUser.role !== "admin") return null;
  const selectedEmployee = state.employees.find((employee) => employee.id === els.voiceEmployee.value);
  const text = els.voiceText.value.trim();
  const baseDate = els.voiceDate.value || dateToYMD(new Date());

  try {
    const draft = buildVoiceDraft({
      text,
      baseDate,
      employee: selectedEmployee,
      employees: state.employees.filter((employee) => employee.role !== "admin" && employee.active !== false),
      allowEmployeeFromText: true
    });
    state.adminVoiceDraft = draft;
    if (draft.employee?.id) els.voiceEmployee.value = draft.employee.id;
    renderVoicePreview(els.voicePreview, draft);
    return draft;
  } catch (error) {
    state.adminVoiceDraft = null;
    renderVoiceEmpty(els.voicePreview, "Nessun orario", "Non ho riconosciuto dipendente, data o fascia.");
    setMsg(els.voiceMsg, error.message, "error");
    return null;
  }
}

async function parseAndSaveAdminVoice() {
  const draft = parseAdminVoice();
  if (!draft) return;
  await saveAdminVoiceDraft(draft);
}

async function saveAdminVoiceDraft(draft = state.adminVoiceDraft || parseAdminVoice()) {
  if (!state.currentUser || state.currentUser.role !== "admin" || !draft) return;
  try {
    setMsg(els.voiceMsg, "");
    await saveVoiceDraft(draft);
    const first = draft.days[0];
    els.adminDay.value = first.date;
    els.adminMonth.value = first.date.slice(0, 7);
    els.adminReportMonth.value = first.date.slice(0, 7);
    els.adminReportEmployee.value = draft.employee.id;
    await loadAdminDayReport();
    await loadAdminMonthReport();
    await loadAdminEmployeeMonthReport({ silent: true });
    setMsg(els.voiceMsg, `Salvato per ${draft.employee.name || "dipendente"}.`, "success");
  } catch (error) {
    setMsg(els.voiceMsg, error.message || "Salvataggio non riuscito.", "error");
  }
}

async function saveVoiceDraft(draft) {
  if (!draft?.employee || !draft.days?.length) throw new Error("Prima inserisci una frase valida.");
  for (const day of draft.days) {
    await saveWorkSessionForEmployee(draft.employee, day.date, day.slots);
  }
  return draft;
}

function buildVoiceDraft({ text, baseDate, employee, employees = [], allowEmployeeFromText = false }) {
  if (!text) throw new Error("Detta o scrivi una frase con gli orari.");

  const normalized = normalizeVoiceText(text);
  const detectedEmployee = allowEmployeeFromText ? findEmployeeInText(normalized, employees) : null;
  const finalEmployee = detectedEmployee || employee;
  if (!finalEmployee?.id) throw new Error("Seleziona un dipendente.");

  const dates = parseDatesFromText(normalized, baseDate);
  const ranges = parseTimeRanges(normalized);
  if (!ranges.length) throw new Error("Non ho trovato fasce orarie. Prova: oggi dalle 10 alle 13 e dalle 15 alle 18.");

  const slots = rangesToSlots(ranges);
  if (!slots.length) throw new Error("Usa orari interi o a mezz'ora, per esempio 10 oppure 10:30.");

  const days = dates.map((date) => ({ date, slots, ranges, totalHours: slots.length * 0.5 }));
  return { employee: finalEmployee, days, ranges, originalText: text };
}

function startVoiceDictation({ textarea, msgEl, button, onFinal }) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    setMsg(msgEl, "Microfono non supportato. Scrivi gli orari e premi Salva.", "error");
    textarea?.focus();
    return;
  }

  if (state.activeRecognition) {
    stopActiveRecognition();
    return;
  }

  const recognition = new Recognition();
  recognition.lang = "it-IT";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;

  let finalTranscript = "";
  let lastVisibleTranscript = "";
  let hasError = false;
  let handled = false;

  state.activeRecognition = recognition;
  state.activeVoiceButton = button;

  recognition.onstart = () => {
    button.textContent = "■ Ferma";
    button.classList.add("listening");
    setMsg(msgEl, "In ascolto…", "success");
  };

  recognition.onresult = (event) => {
    let interim = "";
    for (let index = event.resultIndex; index < event.results.length; index++) {
      const transcript = event.results[index][0]?.transcript || "";
      if (event.results[index].isFinal) finalTranscript += `${transcript} `;
      else interim += transcript;
    }
    lastVisibleTranscript = `${finalTranscript}${interim}`.trim();
    textarea.value = lastVisibleTranscript;
    setMsg(msgEl, "In ascolto…", "success");
  };

  recognition.onerror = (event) => {
    hasError = true;
    const messages = {
      "not-allowed": "Permesso microfono negato. Abilitalo nelle impostazioni del browser.",
      "service-not-allowed": "Il servizio di dettatura non è disponibile.",
      "audio-capture": "Microfono non disponibile.",
      "no-speech": "Non ho sentito la voce. Riprova parlando più vicino al telefono.",
      "network": "Errore di rete durante la dettatura."
    };
    setMsg(msgEl, messages[event.error] || "Dettatura interrotta. Riprova.", "error");
  };

  recognition.onend = async () => {
    cleanupRecognitionButton();
    if (hasError || handled) return;
    handled = true;
    const transcript = (finalTranscript || lastVisibleTranscript || textarea.value).trim();
    if (!transcript) {
      setMsg(msgEl, "Non ho ricevuto alcuna frase.", "error");
      return;
    }
    textarea.value = transcript;
    await onFinal();
  };

  try {
    recognition.start();
  } catch (error) {
    cleanupRecognitionButton();
    setMsg(msgEl, "Il microfono è già attivo. Chiudilo e riprova.", "error");
  }
}

function stopActiveRecognition() {
  if (!state.activeRecognition) return;
  try { state.activeRecognition.stop(); } catch {}
}

function cleanupRecognitionButton() {
  if (state.activeVoiceButton) {
    state.activeVoiceButton.textContent = "🎙️ Detta";
    state.activeVoiceButton.classList.remove("listening");
  }
  state.activeRecognition = null;
  state.activeVoiceButton = null;
}

function renderVoicePreview(container, draft) {
  const totalHours = draft.days.reduce((sum, day) => sum + day.totalHours, 0);
  const dayText = draft.days.length === 1
    ? formatDateIT(draft.days[0].date)
    : `${formatDateIT(draft.days[0].date)} - ${formatDateIT(draft.days[draft.days.length - 1].date)}`;
  container.innerHTML = `
    <div class="summary-item voice-ready">
      <strong>${escapeHTML(draft.employee.name || "Dipendente")}</strong>
      <div class="big">${escapeHTML(formatRanges({ ranges: draft.ranges }))}</div>
      <small>${escapeHTML(dayText)} • ${totalHours.toFixed(2)} ore totali</small>
    </div>
  `;
}

function renderVoiceEmpty(container, title, subtitle = "") {
  if (!container) return;
  const detail = subtitle ? `<small>${escapeHTML(subtitle)}</small>` : "";
  container.innerHTML = `<div class="summary-item"><strong>${escapeHTML(title)}</strong>${detail}</div>`;
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

function normalizeVoiceText(text) {
  let normalized = normalizeText(text)
    .replace(/\bmezzogiorno\b/g, "12")
    .replace(/\bmezzanotte\b/g, "0");

  const numberWords = {
    zero: 0, una: 1, uno: 1, un: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6,
    sette: 7, otto: 8, nove: 9, dieci: 10, undici: 11, dodici: 12, tredici: 13,
    quattordici: 14, quindici: 15, sedici: 16, diciassette: 17, diciotto: 18,
    diciannove: 19, venti: 20, ventuno: 21, ventidue: 22, ventitre: 23, ventiquattro: 24,
    trenta: 30
  };

  const words = Object.keys(numberWords).sort((a, b) => b.length - a.length).join("|");
  normalized = normalized.replace(new RegExp(`\\b(${words})\\b`, "g"), (match) => String(numberWords[match]));
  normalized = normalized
    .replace(/\b(\d{1,2})\s*(?:e\s*)?(?:mezza|mezzo)\b/g, "$1:30")
    .replace(/\b(\d{1,2})\s+e\s+30\b/g, "$1:30")
    .replace(/\b(\d{1,2})\s+e\s+0\b/g, "$1:00")
    .replace(/\bore\s+(\d{1,2})\b/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  return normalized;
}

function findEmployeeInText(normalizedText, employees) {
  return employees.find((employee) => {
    const name = normalizeText(employee.name || "");
    const username = normalizeText(employee.username || "");
    if (name && normalizedText.includes(name)) return true;
    if (username && normalizedText.includes(username)) return true;
    const firstName = name.split(" ")[0];
    return firstName.length >= 3 && new RegExp(`\\b${escapeRegExp(firstName)}\\b`).test(normalizedText);
  }) || null;
}

function parseDatesFromText(text, baseDate) {
  const base = new Date(`${baseDate}T12:00:00`);
  if (Number.isNaN(base.getTime())) throw new Error("Data di riferimento non valida.");

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
    if (endDay < startDay) throw new Error("Intervallo di date non valido.");
    const dates = [];
    for (let day = startDay; day <= endDay; day++) dates.push(makeValidYMD(year, month, day));
    return dates;
  }

  if (/\bdopodomani\b/.test(text)) return [dateToYMD(addDays(base, 2))];
  if (/\bdomani\b/.test(text)) return [dateToYMD(addDays(base, 1))];
  if (/\bieri\b/.test(text)) return [dateToYMD(addDays(base, -1))];
  if (/\boggi\b/.test(text)) return [dateToYMD(base)];

  const weekdayNames = { domenica: 0, lunedi: 1, martedi: 2, mercoledi: 3, giovedi: 4, venerdi: 5, sabato: 6 };
  const weekdayMatch = text.match(/\b(domenica|lunedi|martedi|mercoledi|giovedi|venerdi|sabato)(?:\s+prossim[oa])?\b/);
  if (weekdayMatch) {
    const target = weekdayNames[weekdayMatch[1]];
    let delta = (target - base.getDay() + 7) % 7;
    if (/prossim[oa]/.test(weekdayMatch[0]) && delta === 0) delta = 7;
    return [dateToYMD(addDays(base, delta))];
  }

  // Il trattino è volutamente escluso: "10-13" deve essere una fascia oraria, non una data.
  const numericDate = text.match(/\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\b/);
  if (numericDate) {
    let year = numericDate[3] ? Number(numericDate[3]) : base.getFullYear();
    if (year < 100) year += 2000;
    return [makeValidYMD(year, Number(numericDate[2]), Number(numericDate[1]))];
  }

  const textDate = text.match(/\b(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+(\d{4}))?\b/);
  if (textDate) {
    const year = textDate[3] ? Number(textDate[3]) : base.getFullYear();
    return [makeValidYMD(year, monthNames[textDate[2]], Number(textDate[1]))];
  }

  const simpleDay = text.match(/\b(?:il|giorno)\s+(\d{1,2})\b/);
  if (simpleDay) return [makeValidYMD(base.getFullYear(), base.getMonth() + 1, Number(simpleDay[1]))];

  return [dateToYMD(base)];
}

function parseTimeRanges(text) {
  const ranges = [];
  const timeText = stripDateExpressions(text);
  const rangeRegex = /(?:dalle?|da)?\s*(\d{1,2})(?:\s*[:.,]\s*(\d{1,2}))?\s*(?:fino\s+alle?|fino\s+a|alle?|a|-)\s*(\d{1,2})(?:\s*[:.,]\s*(\d{1,2}))?/g;
  let match;

  while ((match = rangeRegex.exec(timeText)) !== null) {
    const start = buildTime(match[1], match[2]);
    const end = buildTime(match[3], match[4]);
    if (start !== null && end !== null && end > start) {
      ranges.push({ start: minutesToTime(start), end: minutesToTime(end) });
    }
  }

  return mergeRanges(ranges);
}

function stripDateExpressions(text) {
  return text
    .replace(/\bdal\s+\d{1,2}(?:\s+\w+)?\s+al\s+\d{1,2}\s*(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)?(?:\s+\d{4})?/g, " ")
    .replace(/\b\d{1,2}[\/.]\d{1,2}(?:[\/.]\d{2,4})?\b/g, " ")
    .replace(/\b\d{1,2}\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+\d{4})?\b/g, " ")
    .replace(/\b(?:il|giorno)\s+\d{1,2}\b/g, " ")
    .replace(/\s+/g, " ");
}

function buildTime(hourText, minuteText = "0") {
  const hour = Number(hourText);
  const minute = Number(minuteText || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 24 || minute < 0 || minute > 59) return null;
  if (hour === 24 && minute !== 0) return null;
  if (![0, 30].includes(minute)) return null;
  return hour * 60 + minute;
}

function rangesToSlots(ranges) {
  const slots = new Set();
  ranges.forEach((range) => {
    const start = timeToMinutes(range.start);
    const end = timeToMinutes(range.end);
    for (let minutes = start; minutes < end; minutes += 30) slots.add(minutesToTime(minutes));
  });
  return [...slots].sort();
}

function mergeRanges(ranges) {
  const sorted = ranges
    .map((range) => ({ start: timeToMinutes(range.start), end: timeToMinutes(range.end) }))
    .sort((a, b) => a.start - b.start);

  const merged = [];
  sorted.forEach((range) => {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end) merged.push({ ...range });
    else last.end = Math.max(last.end, range.end);
  });

  return merged.map((range) => ({ start: minutesToTime(range.start), end: minutesToTime(range.end) }));
}

function makeValidYMD(year, month, day) {
  const date = new Date(year, month - 1, day, 12, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error("La data dettata non è valida.");
  }
  return dateToYMD(date);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
