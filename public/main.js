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
let adminVoiceRecognition = null;
let personalVoiceRecognition = null;

const state = {
  currentUser: null,
  employees: [],
  selectedSlots: new Set(),
  slots: generateSlots(),
  employeeMonthReport: null,
  adminVoicePreviewRows: [],
  personalVoicePreviewRows: [],
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
  personalVoiceDate: $("personalVoiceDate"),
  personalVoiceText: $("personalVoiceText"),
  startPersonalVoiceBtn: $("startPersonalVoiceBtn"),
  parsePersonalVoiceBtn: $("parsePersonalVoiceBtn"),
  savePersonalVoiceBtn: $("savePersonalVoiceBtn"),
  personalVoiceMsg: $("personalVoiceMsg"),
  personalVoicePreview: $("personalVoicePreview"),
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
  els.selectedDate.addEventListener("change", () => {
    els.personalVoiceDate.value = els.selectedDate.value;
    loadSelectedDay();
  });
  els.addRangeBtn.addEventListener("click", addRangeFromInputs);
  els.clearSlotsBtn.addEventListener("click", clearSelection);
  els.saveDayBtn.addEventListener("click", saveSelectedDay);
  els.personalVoiceDate.addEventListener("change", clearPersonalVoicePreview);
  els.personalVoiceText.addEventListener("input", clearPersonalVoicePreview);
  els.startPersonalVoiceBtn.addEventListener("click", startPersonalVoiceDictation);
  els.parsePersonalVoiceBtn.addEventListener("click", createPersonalVoicePreview);
  els.savePersonalVoiceBtn.addEventListener("click", savePersonalVoicePreview);
  els.loadMyReportBtn.addEventListener("click", loadMyReports);
  els.createEmployeeBtn.addEventListener("click", createEmployee);
  els.loadAdminDayBtn.addEventListener("click", loadAdminDayReport);
  els.loadAdminMonthBtn.addEventListener("click", loadAdminMonthReport);
  els.loadEmployeeMonthBtn.addEventListener("click", loadAdminEmployeeMonthReport);
  els.downloadEmployeePdfBtn.addEventListener("click", downloadAdminEmployeeMonthPdf);
  els.adminReportEmployee.addEventListener("change", clearEmployeeMonthReport);
  els.adminReportMonth.addEventListener("change", clearEmployeeMonthReport);
  els.voiceEmployee.addEventListener("change", clearAdminVoicePreview);
  els.voiceDate.addEventListener("change", clearAdminVoicePreview);
  els.voiceText.addEventListener("input", clearAdminVoicePreview);
  els.startVoiceBtn.addEventListener("click", startAdminVoiceDictation);
  els.parseVoiceBtn.addEventListener("click", createAdminVoicePreview);
  els.saveVoiceBtn.addEventListener("click", saveAdminVoicePreview);

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
  state.adminVoicePreviewRows = [];
  state.personalVoicePreviewRows = [];
  renderSelectedState();
  clearEmployeeMonthReport();
  clearAdminVoicePreview();
  clearPersonalVoicePreview();
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

function fillEmployeeSelect(select, employees, previousValue = "") {
  select.innerHTML = "";

  if (!employees.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Nessun dipendente disponibile";
    select.appendChild(option);
    return;
  }

  employees.forEach(emp => {
    const option = document.createElement("option");
    option.value = emp.id;
    option.textContent = emp.name || emp.username || "Dipendente";
    select.appendChild(option);
  });

  const stillExists = employees.some(emp => emp.id === previousValue);
  select.value = stillExists ? previousValue : employees[0].id;
}


async function startPersonalVoiceDictation() {
  if (!state.currentUser) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setMsg(els.personalVoiceMsg, "Dettatura non supportata da questo browser. Puoi comunque scrivere la frase a mano e premere Crea anteprima.", "error");
    return;
  }

  if (personalVoiceRecognition) {
    personalVoiceRecognition.stop();
    personalVoiceRecognition = null;
    els.startPersonalVoiceBtn.textContent = "🎙️ Dettatura";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "it-IT";
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  personalVoiceRecognition = recognition;
  els.startPersonalVoiceBtn.textContent = "Sto ascoltando...";
  setMsg(els.personalVoiceMsg, "Parla ora. Esempio: “Segnami le ore di oggi dalle 10 alle 21 e salvamele”.", "success");

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0]?.transcript || "")
      .join(" ")
      .trim();

    if (transcript) {
      els.personalVoiceText.value = els.personalVoiceText.value.trim()
        ? `${els.personalVoiceText.value.trim()} ${transcript}`
        : transcript;
      clearPersonalVoicePreview();
      setMsg(els.personalVoiceMsg, `Testo ricevuto: ${transcript}`, "success");

      if (hasVoiceSaveCommand(transcript)) {
        setTimeout(async () => {
          createPersonalVoicePreview();
          await savePersonalVoicePreview({ skipConfirm: true });
        }, 250);
      }
    }
  };

  recognition.onerror = () => {
    setMsg(els.personalVoiceMsg, "Non sono riuscito a leggere il vocale. Riprova oppure scrivi la frase a mano.", "error");
  };

  recognition.onend = () => {
    personalVoiceRecognition = null;
    els.startPersonalVoiceBtn.textContent = "🎙️ Dettatura";
  };

  recognition.start();
}

function createPersonalVoicePreview() {
  if (!state.currentUser) return;

  try {
    const rows = parsePersonalVoiceWorkRows(els.personalVoiceText.value);
    state.personalVoicePreviewRows = rows;
    renderPersonalVoicePreview(rows);
    setMsg(els.personalVoiceMsg, "Anteprima creata. Controlla bene prima di salvare.", "success");
  } catch (error) {
    state.personalVoicePreviewRows = [];
    renderPersonalVoicePreview([]);
    setMsg(els.personalVoiceMsg, error.message || "Non sono riuscito a capire la frase.", "error");
  }
}

async function savePersonalVoicePreview(options = {}) {
  if (!state.currentUser) return;

  if (!state.personalVoicePreviewRows.length) {
    createPersonalVoicePreview();
  }

  const rows = state.personalVoicePreviewRows;
  if (!rows.length) return;

  if (!options.skipConfirm) {
    const ok = confirm(`Salvare ${rows.length} giornata/e? Eventuali orari già presenti per gli stessi giorni verranno sostituiti.`);
    if (!ok) return;
  }

  for (const row of rows) {
    const ref = doc(db, "workSessions", `${state.currentUser.id}_${row.date}`);
    await setDoc(ref, {
      employeeId: state.currentUser.id,
      employeeName: state.currentUser.name || state.currentUser.username || "Dipendente",
      date: row.date,
      slots: row.slots,
      ranges: row.ranges,
      totalHours: row.totalHours,
      source: "user-voice",
      insertedBy: state.currentUser.id,
      updatedAt: serverTimestamp()
    });
  }

  const firstDate = rows[0].date;
  els.selectedDate.value = firstDate;
  els.personalVoiceDate.value = firstDate;
  state.selectedSlots = new Set(rows[0].slots);
  renderSelectedState();

  setMsg(els.personalVoiceMsg, "Orari salvati correttamente.", "success");
  await loadMyReports();
  await loadSelectedDay();

  if (state.currentUser.role === "admin") {
    await loadAdminDayReport();
    await loadAdminMonthReport();
    await loadAdminEmployeeMonthReport({ silent: true });
  }
}

function renderPersonalVoicePreview(rows) {
  if (!rows.length) {
    els.personalVoicePreview.innerHTML = `
      <div class="summary-item">
        <strong>Nessuna anteprima</strong>
        <small>Frasi utili: “oggi 10-13 e 15-18”, “domani dalle 9 alle 14”, “dal 1 al 5 luglio 10-14”.</small>
      </div>
    `;
    return;
  }

  const totalHours = rows.reduce((sum, row) => sum + row.totalHours, 0);
  els.personalVoicePreview.innerHTML = `
    <div class="summary-item">
      <strong>${escapeHTML(state.currentUser.name || state.currentUser.username || "Dipendente")}</strong>
      <div class="big">${rows.length} giornata/e • ${totalHours.toFixed(2)} ore totali</div>
      <small>Premendo Salva, questi orari sostituiscono quelli già presenti negli stessi giorni.</small>
    </div>
    ${rows.map(row => `
      <div class="summary-item worked-preview">
        <strong>${escapeHTML(formatDateIT(row.date))} • ${escapeHTML(formatWeekdayIT(row.date))}</strong>
        <div class="big">${escapeHTML(row.ranges.map(r => `${r.start} - ${r.end}`).join(" / "))}</div>
        <small>Totale: ${row.totalHours.toFixed(2)} ore</small>
      </div>
    `).join("")}
  `;
}

function clearPersonalVoicePreview() {
  state.personalVoicePreviewRows = [];
  if (!els.personalVoicePreview) return;
  renderPersonalVoicePreview([]);
  if (els.personalVoiceMsg) setMsg(els.personalVoiceMsg, "");
}

function parsePersonalVoiceWorkRows(rawText) {
  const raw = String(rawText || "").trim();
  if (!raw) throw new Error("Detta o scrivi prima una frase con data e orari.");

  const fallbackDate = els.personalVoiceDate.value || els.selectedDate.value || dateToYMD(new Date());
  const dates = parseVoiceDates(raw, fallbackDate);
  const parsedRanges = parseVoiceRanges(raw);
  if (!parsedRanges.length) {
    throw new Error("Non ho trovato gli orari. Usa frasi tipo: “10-13”, “dalle 10 alle 13”, “10:30-13:00”.");
  }

  const slots = rangesToSlots(parsedRanges);
  const ranges = slotsToRanges(slots);
  const totalHours = ranges.reduce((sum, range) => sum + rangeHours(range), 0);
  if (totalHours <= 0) throw new Error("Gli orari non sono validi.");

  return dates.map(date => ({
    date,
    slots,
    ranges,
    totalHours
  }));
}

function hasVoiceSaveCommand(rawText) {
  const text = normalizeVoiceText(rawText);
  return /\b(salva|salvami|salvamelo|salvamela|salvamele|salvali|registrami|registra)\b/.test(text);
}

async function startAdminVoiceDictation() {
  if (!state.currentUser || state.currentUser.role !== "admin") return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setMsg(els.voiceMsg, "Dettatura non supportata da questo browser. Puoi comunque scrivere la frase a mano e premere Crea anteprima.", "error");
    return;
  }

  if (adminVoiceRecognition) {
    adminVoiceRecognition.stop();
    adminVoiceRecognition = null;
    els.startVoiceBtn.textContent = "🎙️ Dettatura";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "it-IT";
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  adminVoiceRecognition = recognition;
  els.startVoiceBtn.textContent = "Sto ascoltando...";
  setMsg(els.voiceMsg, "Parla ora. Esempio: “Marco oggi dalle 10 alle 13 e dalle 15 alle 18”.", "success");

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0]?.transcript || "")
      .join(" ")
      .trim();

    if (transcript) {
      els.voiceText.value = els.voiceText.value.trim()
        ? `${els.voiceText.value.trim()} ${transcript}`
        : transcript;
      clearAdminVoicePreview();
      setMsg(els.voiceMsg, `Testo ricevuto: ${transcript}`, "success");
      if (hasVoiceSaveCommand(transcript)) {
        setTimeout(async () => {
          createAdminVoicePreview();
          await saveAdminVoicePreview({ skipConfirm: true });
        }, 250);
      }
    }
  };

  recognition.onerror = () => {
    setMsg(els.voiceMsg, "Non sono riuscito a leggere il vocale. Riprova oppure scrivi la frase a mano.", "error");
  };

  recognition.onend = () => {
    adminVoiceRecognition = null;
    els.startVoiceBtn.textContent = "🎙️ Dettatura";
  };

  recognition.start();
}

function createAdminVoicePreview() {
  if (!state.currentUser || state.currentUser.role !== "admin") return;

  try {
    const rows = parseVoiceWorkRows(els.voiceText.value);
    state.adminVoicePreviewRows = rows;
    renderAdminVoicePreview(rows);
    setMsg(els.voiceMsg, "Anteprima creata. Controlla bene prima di salvare.", "success");
  } catch (error) {
    state.adminVoicePreviewRows = [];
    renderAdminVoicePreview([]);
    setMsg(els.voiceMsg, error.message || "Non sono riuscito a capire la frase.", "error");
  }
}

async function saveAdminVoicePreview(options = {}) {
  if (!state.currentUser || state.currentUser.role !== "admin") return;

  if (!state.adminVoicePreviewRows.length) {
    createAdminVoicePreview();
  }

  const rows = state.adminVoicePreviewRows;
  if (!rows.length) return;

  if (!options.skipConfirm) {
    const ok = confirm(`Salvare ${rows.length} giornata/e? Eventuali orari già presenti per gli stessi giorni verranno sostituiti.`);
    if (!ok) return;
  }

  for (const row of rows) {
    const ref = doc(db, "workSessions", `${row.employee.id}_${row.date}`);
    await setDoc(ref, {
      employeeId: row.employee.id,
      employeeName: row.employee.name || row.employee.username || "Dipendente",
      date: row.date,
      slots: row.slots,
      ranges: row.ranges,
      totalHours: row.totalHours,
      source: "admin-voice",
      insertedBy: state.currentUser.id,
      updatedAt: serverTimestamp()
    });
  }

  setMsg(els.voiceMsg, "Orari salvati correttamente.", "success");
  await loadAdminDayReport();
  await loadAdminMonthReport();

  if (els.adminReportEmployee.value === rows[0].employee.id && els.adminReportMonth.value === rows[0].date.slice(0, 7)) {
    await loadAdminEmployeeMonthReport({ silent: true });
  }
}

function renderAdminVoicePreview(rows) {
  if (!rows.length) {
    els.voicePreview.innerHTML = `
      <div class="summary-item">
        <strong>Nessuna anteprima</strong>
        <small>Frasi utili: “Giulia oggi 10-13 e 15-18”, “Marco domani dalle 9 alle 14”, “Sara dal 1 al 5 luglio 10-14”.</small>
      </div>
    `;
    return;
  }

  const totalHours = rows.reduce((sum, row) => sum + row.totalHours, 0);
  els.voicePreview.innerHTML = `
    <div class="summary-item">
      <strong>${escapeHTML(rows[0].employee.name || rows[0].employee.username || "Dipendente")}</strong>
      <div class="big">${rows.length} giornata/e • ${totalHours.toFixed(2)} ore totali</div>
      <small>Premendo Conferma e salva, questi orari sostituiscono quelli già presenti negli stessi giorni.</small>
    </div>
    ${rows.map(row => `
      <div class="summary-item worked-preview">
        <strong>${escapeHTML(formatDateIT(row.date))} • ${escapeHTML(formatWeekdayIT(row.date))}</strong>
        <div class="big">${escapeHTML(row.ranges.map(r => `${r.start} - ${r.end}`).join(" / "))}</div>
        <small>Totale: ${row.totalHours.toFixed(2)} ore</small>
      </div>
    `).join("")}
  `;
}

function clearAdminVoicePreview() {
  state.adminVoicePreviewRows = [];
  if (!els.voicePreview) return;
  renderAdminVoicePreview([]);
  if (els.voiceMsg) setMsg(els.voiceMsg, "");
}

function parseVoiceWorkRows(rawText) {
  const raw = String(rawText || "").trim();
  if (!raw) throw new Error("Detta o scrivi prima una frase con dipendente, data e orari.");

  const employees = state.employees.filter(emp => emp.role !== "admin" && emp.active !== false);
  if (!employees.length) throw new Error("Prima crea almeno un dipendente.");

  const employee = detectEmployeeFromText(raw, employees) || employees.find(emp => emp.id === els.voiceEmployee.value);
  if (!employee) throw new Error("Non ho trovato il dipendente. Sceglilo dalla tendina oppure pronuncia il nome.");

  const dates = parseVoiceDates(raw, els.voiceDate.value || dateToYMD(new Date()));
  const parsedRanges = parseVoiceRanges(raw);
  if (!parsedRanges.length) {
    throw new Error("Non ho trovato gli orari. Usa frasi tipo: “10-13”, “dalle 10 alle 13”, “10:30-13:00”.");
  }

  const slots = rangesToSlots(parsedRanges);
  const ranges = slotsToRanges(slots);
  const totalHours = ranges.reduce((sum, range) => sum + rangeHours(range), 0);
  if (totalHours <= 0) throw new Error("Gli orari non sono validi.");

  return dates.map(date => ({
    employee,
    date,
    slots,
    ranges,
    totalHours
  }));
}

function detectEmployeeFromText(rawText, employees) {
  const text = normalizeForMatch(rawText);
  const matches = employees
    .map(emp => {
      const name = normalizeForMatch(emp.name || "");
      const username = normalizeForMatch(emp.username || "");
      const score = [name, username]
        .filter(Boolean)
        .filter(value => text.includes(value))
        .reduce((max, value) => Math.max(max, value.length), 0);
      return { emp, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return matches[0]?.emp || null;
}

function parseVoiceDates(rawText, fallbackDate) {
  const text = convertItalianNumberWords(normalizeVoiceText(rawText));
  const base = fallbackDate || dateToYMD(new Date());
  const [baseYear, baseMonth] = base.split("-").map(Number);
  const months = italianMonthsMap();

  if (/\bdopodomani\b/.test(text)) return [addDaysToYMD(base, 2)];
  if (/\bdomani\b/.test(text)) return [addDaysToYMD(base, 1)];
  if (/\boggi\b/.test(text)) return [dateToYMD(new Date())];

  const rangeMatch = text.match(/\b(?:dal|da)\s+(\d{1,2})\s+(?:al|a)\s+(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+(\d{4}))?\b/);
  if (rangeMatch) {
    const startDay = Number(rangeMatch[1]);
    const endDay = Number(rangeMatch[2]);
    const month = months[rangeMatch[3]];
    const year = Number(rangeMatch[4] || baseYear);
    if (!isValidDay(year, month, startDay) || !isValidDay(year, month, endDay) || endDay < startDay) {
      throw new Error("Intervallo di date non valido.");
    }
    const dates = [];
    for (let day = startDay; day <= endDay; day++) {
      dates.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
    return dates;
  }

  const numericDate = text.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (numericDate) {
    const day = Number(numericDate[1]);
    const month = Number(numericDate[2]);
    let year = numericDate[3] ? Number(numericDate[3]) : baseYear;
    if (year < 100) year += 2000;
    if (!isValidDay(year, month, day)) throw new Error("Data non valida.");
    return [`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`];
  }

  const namedDate = text.match(/\b(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+(\d{4}))?\b/);
  if (namedDate) {
    const day = Number(namedDate[1]);
    const month = months[namedDate[2]];
    const year = Number(namedDate[3] || baseYear);
    if (!isValidDay(year, month, day)) throw new Error("Data non valida.");
    return [`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`];
  }

  const onlyDay = text.match(/\bil\s+(\d{1,2})\b/);
  if (onlyDay) {
    const day = Number(onlyDay[1]);
    if (!isValidDay(baseYear, baseMonth, day)) throw new Error("Giorno non valido per il mese selezionato.");
    return [`${baseYear}-${String(baseMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`];
  }

  return [base];
}

function parseVoiceRanges(rawText) {
  let text = convertItalianNumberWords(normalizeVoiceText(rawText));
  text = text
    .replace(/\bmezzogiorno\b/g, "12")
    .replace(/\bmezzanotte\b/g, "00")
    .replace(/\b(\d{1,2})\s+e\s+(0|00|15|30|45)\b/g, (_, h, m) => `${h}:${String(m).padStart(2, "0")}`)
    .replace(/\b(\d{1,2})\s+(0|00|15|30|45)\b/g, (_, h, m) => `${h}:${String(m).padStart(2, "0")}`);

  const found = [];
  const patterns = [
    /\b(?:dalle|dalla|da)\s+(\d{1,2}(?::\d{1,2})?)\s+(?:alle|alla|a)\s+(\d{1,2}(?::\d{1,2})?)\b/g,
    /\b(\d{1,2}(?::\d{1,2})?)\s*(?:-|–|—)\s*(\d{1,2}(?::\d{1,2})?)\b/g,
    /\b(\d{1,2}(?::\d{1,2})?)\s+(?:alle|alla|a)\s+(\d{1,2}(?::\d{1,2})?)\b/g
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      found.push(buildVoiceRange(match[1], match[2]));
    }
  });

  if (!found.length) {
    let cleaned = text
      .replace(/\b(?:dal|da)\s+\d{1,2}\s+(?:al|a)\s+\d{1,2}\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+\d{4})?\b/g, " ")
      .replace(/\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/g, " ")
      .replace(/\b\d{1,2}\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+\d{4})?\b/g, " ")
      .replace(/\b(?:oggi|domani|dopodomani)\b/g, " ");

    const tokens = cleaned.match(/\b\d{1,2}(?::\d{1,2})?\b/g) || [];
    if (tokens.length >= 2 && tokens.length % 2 === 0) {
      for (let i = 0; i < tokens.length; i += 2) {
        found.push(buildVoiceRange(tokens[i], tokens[i + 1]));
      }
    }
  }

  const slots = rangesToSlots(found);
  return slotsToRanges(slots);
}

function buildVoiceRange(startText, endText) {
  const start = normalizeVoiceTime(startText);
  const end = normalizeVoiceTime(endText);
  const startM = timeToMinutes(start);
  const endM = timeToMinutes(end);

  if (startM % 30 !== 0 || endM % 30 !== 0) {
    throw new Error("Per ora usa orari a mezz'ora: 10:00, 10:30, 11:00.");
  }
  if (endM <= startM) throw new Error("L'orario di fine deve essere dopo l'inizio.");

  return { start, end };
}

function normalizeVoiceTime(value) {
  let text = String(value || "").trim().replace(/[,.]/g, ":");
  if (/^\d{3,4}$/.test(text) && Number(text) > 24) {
    const n = Number(text);
    text = `${Math.floor(n / 100)}:${String(n % 100).padStart(2, "0")}`;
  }

  const [rawH, rawM = "0"] = text.split(":");
  const h = Number(rawH);
  const m = Number(rawM);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    throw new Error(`Orario non valido: ${value}`);
  }

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function rangesToSlots(ranges) {
  const slots = new Set();
  ranges.forEach(range => {
    const startM = timeToMinutes(range.start);
    const endM = timeToMinutes(range.end);
    for (let m = startM; m < endM; m += 30) {
      slots.add(minutesToTime(m));
    }
  });
  return [...slots].sort();
}

function normalizeVoiceText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForMatch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function convertItalianNumberWords(text) {
  const numbers = {
    zero: 0,
    uno: 1,
    un: 1,
    una: 1,
    primo: 1,
    due: 2,
    tre: 3,
    quattro: 4,
    cinque: 5,
    sei: 6,
    sette: 7,
    otto: 8,
    nove: 9,
    dieci: 10,
    undici: 11,
    dodici: 12,
    tredici: 13,
    quattordici: 14,
    quindici: 15,
    sedici: 16,
    diciassette: 17,
    diciotto: 18,
    diciannove: 19,
    venti: 20,
    ventuno: 21,
    ventidue: 22,
    ventitre: 23,
    ventiquattro: 24,
    venticinque: 25,
    ventisei: 26,
    ventisette: 27,
    ventotto: 28,
    ventinove: 29,
    trenta: 30,
    trentuno: 31,
    quarantacinque: 45
  };

  return text.replace(/\b(zero|uno|un|una|primo|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|undici|dodici|tredici|quattordici|quindici|sedici|diciassette|diciotto|diciannove|venti|ventuno|ventidue|ventitre|ventiquattro|venticinque|ventisei|ventisette|ventotto|ventinove|trenta|trentuno|quarantacinque)\b/g, match => String(numbers[match]));
}

function italianMonthsMap() {
  return {
    gennaio: 1,
    febbraio: 2,
    marzo: 3,
    aprile: 4,
    maggio: 5,
    giugno: 6,
    luglio: 7,
    agosto: 8,
    settembre: 9,
    ottobre: 10,
    novembre: 11,
    dicembre: 12
  };
}

function isValidDay(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(year, month, 0).getDate();
}

function addDaysToYMD(ymd, amount) {
  const date = new Date(`${ymd}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return dateToYMD(date);
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
