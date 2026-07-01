const STORAGE_KEY = "orariDipendenti.v1";
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

const $ = (id) => document.getElementById(id);
const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch {}
const db = getFirestore(app);

const state = {
currentUser: null,
  employees: [],
selectedSlots: new Set(),
  slots: generateSlots(),
};

function defaultData() {
  return {
    users: [
      {
        id: crypto.randomUUID(),
        name: "Amministratore",
        username: "admin",
        password: "admin123",
        role: "admin",
        hourlyRate: 0,
      },
    ],
    shifts: {},
  };
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const data = defaultData();
    saveData(data);
    return data;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.users || !parsed.shifts) throw new Error("Dati non validi");
    return parsed;
  } catch {
    const data = defaultData();
    saveData(data);
    return data;
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function pad(n) {
  return String(n).padStart(2, "0");
}
const $ = (id) => document.getElementById(id);

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
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
};

function currentMonthISO() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}
init();

function minutesToTime(minutes) {
  if (minutes === 1440) return "24:00";
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
async function init() {
  setDefaultDates();
  bindEvents();
  renderSlotGrid();
  await ensureAdminExists();
}

function timeToMinutes(time) {
  if (time === "24:00") return 1440;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
function bindEvents() {
  els.loginBtn.addEventListener("click", handleLogin);
  els.logoutBtn.addEventListener("click", logout);
  els.selectedDate.addEventListener("change", loadSelectedDay);
  els.addRangeBtn.addEventListener("click", addRangeFromInputs);
  els.clearSlotsBtn.addEventListener("click", clearSelection);
  els.saveDayBtn.addEventListener("click", saveSelectedDay);
  els.loadMyReportBtn.addEventListener("click", loadMyReports);
  els.createEmployeeBtn.addEventListener("click", createEmployee);
  els.loadAdminDayBtn.addEventListener("click", loadAdminDayReport);
  els.loadAdminMonthBtn.addEventListener("click", loadAdminMonthReport);

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab, btn));
  });
}

function allSlotStarts() {
  return Array.from({ length: 48 }, (_, i) => minutesToTime(i * 30));
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

function allTimeBoundaries() {
  return Array.from({ length: 49 }, (_, i) => minutesToTime(i * 30));
}
async function handleLogin() {
  const username = els.loginUsername.value.trim();
  const password = els.loginPassword.value.trim();
  if (!username || !password) return setMsg(els.loginMsg, "Inserisci username e password.", "error");

function slotToLabel(slot) {
  const start = timeToMinutes(slot);
  return `${slot}-${minutesToTime(start + 30)}`;
}
  const q = query(collection(db, "employees"), where("username", "==", username));
  const snap = await getDocs(q);
  if (snap.empty) return setMsg(els.loginMsg, "Credenziali non valide.", "error");

function selectedUserIdForWork() {
  if (state.currentUser?.role === "admin") {
    return $("workUserSelect").value || state.currentUser.id;
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
}
  return state.currentUser?.id;
}

function shiftKey(userId, date) {
  return `${userId}_${date}`;
}

function getShift(data, userId, date) {
  return data.shifts[shiftKey(userId, date)] || { userId, date, slots: [] };
  await loadSelectedDay();
  await loadMyReports();
}

function setMessage(el, text, type = "") {
  el.textContent = text;
  el.className = `message ${type}`.trim();
function logout() {
  state.currentUser = null;
  state.selectedSlots = new Set();
  renderSelectedState();
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

function getEmployees(data) {
  return data.users.filter((user) => user.role === "employee");
function toggleSlot(time) {
  if (state.selectedSlots.has(time)) state.selectedSlots.delete(time);
  else state.selectedSlots.add(time);
  renderSelectedState();
}

function getUserById(data, id) {
  return data.users.find((user) => user.id === id);
function clearSelection() {
  state.selectedSlots = new Set();
  renderSelectedState();
}

function buildTimeSelects() {
  const start = $("startTime");
  const end = $("endTime");
  start.innerHTML = "";
  end.innerHTML = "";

  allTimeBoundaries().forEach((time, index) => {
    if (index < 48) start.add(new Option(time, time));
    if (index > 0) end.add(new Option(time, time));
function renderSelectedState() {
  const buttons = [...els.slotGrid.querySelectorAll(".slot-btn")];
  buttons.forEach((btn, i) => {
    const t = state.slots[i];
    btn.classList.toggle("active", state.selectedSlots.has(t));
});

  start.value = "08:00";
  end.value = "13:00";
}

function buildSlotsGrid() {
  const grid = $("slotsGrid");
  grid.innerHTML = "";

  allSlotStarts().forEach((slot) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "slot";
    button.dataset.slot = slot;
    button.textContent = slot;
    button.title = slotToLabel(slot);
    button.addEventListener("click", () => {
      if (state.selectedSlots.has(slot)) state.selectedSlots.delete(slot);
      else state.selectedSlots.add(slot);
      renderSlots();
      renderReports();
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
    grid.appendChild(button);
  });
}
  }

function renderSlots() {
  document.querySelectorAll(".slot").forEach((btn) => {
    btn.classList.toggle("selected", state.selectedSlots.has(btn.dataset.slot));
  });
  $("dailyTotalBadge").textContent = `${calculateHours([...state.selectedSlots]).toFixed(1)} ore`;
  els.slotCount.textContent = String(state.selectedSlots.size);
  els.dayHours.textContent = (state.selectedSlots.size * 0.5).toFixed(2);
  renderMyDaySummary(ranges);
}

function calculateHours(slots) {
  return slots.length * 0.5;
function removeRange(range) {
  for (let m = timeToMinutes(range.start); m < timeToMinutes(range.end); m += 30) {
    state.selectedSlots.delete(minutesToTime(m));
  }
  renderSelectedState();
}

function slotsToRanges(slots) {
  const sorted = [...slots].map(timeToMinutes).sort((a, b) => a - b);
  if (!sorted.length) return "-";

  const ranges = [];
  let start = sorted[0];
  let previous = sorted[0];
function addRangeFromInputs() {
  const start = els.rangeStart.value;
  const end = els.rangeEnd.value;
  if (!start || !end) return alert("Inserisci ora di inizio e fine.");
  const startM = timeToMinutes(start);
  const endM = timeToMinutes(end);
  if (endM <= startM) return alert("L'orario di fine deve essere dopo l'inizio.");
  if (startM % 30 !== 0 || endM % 30 !== 0) return alert("Usa orari a mezz'ora (es. 08:00, 08:30).");

  for (let i = 1; i <= sorted.length; i++) {
    const current = sorted[i];
    if (current !== previous + 30) {
      ranges.push(`${minutesToTime(start)}-${minutesToTime(previous + 30)}`);
      start = current;
    }
    previous = current;
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

  return ranges.join(" · ");
}

function loadSelectedShift() {
  const data = loadData();
  const userId = selectedUserIdForWork();
  const date = $("selectedDate").value;
  const shift = getShift(data, userId, date);
  state.selectedSlots = new Set(shift.slots || []);
  renderSlots();
  renderReports();

  const user = getUserById(data, userId);
  $("hoursTitle").textContent = state.currentUser.role === "admin"
    ? `Orari di ${user?.name || "dipendente"}`
    : "I miei orari";
}
async function saveSelectedDay() {
  if (!state.currentUser) return;
  const date = els.selectedDate.value;
  const slots = [...state.selectedSlots].sort();
  const ranges = slotsToRanges(slots);
  const totalHours = slots.length * 0.5;

function renderEmployees() {
  const data = loadData();
  const tbody = $("employeesTable");
  const select = $("workUserSelect");
  tbody.innerHTML = "";
  select.innerHTML = "";

  const employees = getEmployees(data);

  employees.forEach((user) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHTML(user.name)}</strong></td>
      <td>${escapeHTML(user.username)}</td>
      <td>${Number(user.hourlyRate || 0).toFixed(2)}</td>
      <td><button class="btn danger" data-delete-user="${user.id}">Elimina</button></td>
    `;
    tbody.appendChild(tr);
    select.add(new Option(user.name, user.id));
  });
  if (!date) return alert("Seleziona una data.");

  if (!employees.length) {
    tbody.innerHTML = `<tr><td colspan="4">Ancora nessun dipendente inserito.</td></tr>`;
    select.add(new Option("Nessun dipendente", ""));
  }
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
  const ref = doc(db, "workSessions", `${state.currentUser.id}_${date}`);

function addEmployee() {
  const data = loadData();
  const name = $("employeeName").value.trim();
  const username = $("employeeUsername").value.trim().toLowerCase();
  const password = $("employeePassword").value.trim();
  const hourlyRate = Number($("employeeRate").value || 0);
  // Se non ci sono slot, non salvo una giornata a 0: elimino proprio il documento.
  // Così un orario inserito per errore sparisce dai report e non ricompare al ricaricamento.
  if (slots.length === 0) {
    await deleteDoc(ref);
    setMsg(els.saveMsg, "Orario cancellato: giornata senza ore lavorate.", "success");

  if (!name || !username || !password) {
    setMessage($("employeeMessage"), "Compila nome, username e password.", "err");
    if (state.currentUser.role === "admin") {
      await loadAdminDayReport();
      await loadAdminMonthReport();
    }
    await loadMyReports();
    renderSelectedState();
return;
}

  if (data.users.some((user) => user.username.toLowerCase() === username)) {
    setMessage($("employeeMessage"), "Username già esistente.", "err");
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

  data.users.push({
    id: crypto.randomUUID(),
    name,
    username,
    password,
    role: "employee",
    hourlyRate,
  });
  await setDoc(ref, payload);
  setMsg(els.saveMsg, "Orari salvati correttamente.", "success");

  saveData(data);
  $("employeeName").value = "";
  $("employeeUsername").value = "";
  $("employeePassword").value = "";
  setMessage($("employeeMessage"), "Dipendente aggiunto.", "ok");
  renderEmployees();
  loadSelectedShift();
  if (state.currentUser.role === "admin") {
    await loadAdminDayReport();
    await loadAdminMonthReport();
  }
  await loadMyReports();
}

function deleteEmployee(userId) {
  const data = loadData();
  const user = getUserById(data, userId);
  if (!user) return;
async function loadMyReports() {
  if (!state.currentUser) return;
  const snap = await getDocs(query(collection(db, "workSessions"), where("employeeId", "==", state.currentUser.id)));
  const month = els.reportMonth.value;
  let monthHours = 0;
  let totalHours = 0;

  const ok = confirm(`Eliminare ${user.name}? Verranno eliminati anche i suoi orari salvati in locale.`);
  if (!ok) return;

  data.users = data.users.filter((item) => item.id !== userId);
  Object.keys(data.shifts).forEach((key) => {
    if (data.shifts[key].userId === userId) delete data.shifts[key];
  snap.forEach(d => {
    const data = d.data();
    totalHours += data.totalHours || 0;
    if (month && data.date?.startsWith(month)) monthHours += data.totalHours || 0;
});

  saveData(data);
  renderEmployees();
  loadSelectedShift();
  const rate = Number(state.currentUser.hourlyRate || 0);
  els.myMonthHours.textContent = monthHours.toFixed(2);
  els.myMonthPay.textContent = `€ ${(monthHours * rate).toFixed(2)}`;
  els.myTotalHours.textContent = totalHours.toFixed(2);
  els.myTotalPay.textContent = `€ ${(totalHours * rate).toFixed(2)}`;
}

function applyRange() {
  const start = timeToMinutes($("startTime").value);
  const end = timeToMinutes($("endTime").value);

  if (end <= start) {
    alert("L’orario di fine deve essere successivo all’orario di inizio.");
function renderMyDaySummary(ranges = slotsToRanges([...state.selectedSlots])) {
  els.myDaySummary.innerHTML = "";
  if (!ranges.length) {
    els.myDaySummary.innerHTML = `<div class="summary-item"><strong>${els.selectedDate.value || 'Nessuna data'}</strong><small>Nessun orario registrato per il giorno selezionato.</small></div>`;
return;
}

  for (let minute = start; minute < end; minute += 30) {
    state.selectedSlots.add(minutesToTime(minute));
  }

  renderSlots();
  renderReports();
  const total = ranges.reduce((s, r) => s + rangeHours(r), 0);
  const item = document.createElement("div");
  item.className = "summary-item";
  item.innerHTML = `
    <strong>${els.selectedDate.value}</strong>
    <div class="big">${ranges.map(r => `${r.start}-${r.end}`).join(" • ")}</div>
    <small>Totale giornata: ${total.toFixed(2)} ore</small>
  `;
  els.myDaySummary.appendChild(item);
}

function saveSelectedDay() {
  const data = loadData();
  const userId = selectedUserIdForWork();
  const date = $("selectedDate").value;
async function createEmployee() {
  const name = els.empName.value.trim();
  const username = els.empUsername.value.trim();
  const password = els.empPassword.value.trim();
  const hourlyRate = Number(els.empRate.value || 0);

  if (!userId) {
    setMessage($("saveMessage"), "Prima crea o seleziona un dipendente.", "err");
    return;
  }
  if (!name || !username || !password) return setMsg(els.createEmployeeMsg, "Compila nome, username e password.", "error");

  const slots = [...state.selectedSlots].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  data.shifts[shiftKey(userId, date)] = { userId, date, slots };
  saveData(data);
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

  setMessage($("saveMessage"), "Orari salvati.", "ok");
  renderReports();
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
        <strong>${emp.name}</strong>
        <small>@${emp.username} • ${emp.role === 'admin' ? 'Admin' : 'Dipendente'} • € ${Number(emp.hourlyRate || 0).toFixed(2)}/h</small>
      </div>
      ${emp.role === 'admin' ? '<span class="chip">Admin</span>' : '<button class="btn btn-light btn-sm" type="button">Elimina</button>'}
    `;
    const btn = item.querySelector("button");
    if (btn) btn.addEventListener("click", async () => {
      if (!confirm(`Eliminare ${emp.name}?`)) return;
      await deleteDoc(doc(db, "employees", emp.id));
      await loadEmployees();
    });
    els.employeeList.appendChild(item);
  });
}

function renderReports() {
  const data = loadData();
  const date = $("selectedDate").value;
  const month = $("selectedMonth").value;
async function loadAdminDayReport() {
  if (!state.currentUser || state.currentUser.role !== "admin") return;
  const date = els.adminDay.value;
  const snap = await getDocs(query(collection(db, "workSessions"), where("date", "==", date)));
  const items = snap.docs.map(d => d.data()).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  els.adminDayReport.innerHTML = "";

  if (state.currentUser?.role === "admin") {
    renderAdminDailyReport(data, date);
    renderAdminMonthlyReport(data, month);
  } else {
    renderEmployeeDailyReport(data, state.currentUser.id, date);
    renderEmployeeMonthlyReport(data, state.currentUser.id, month);
  if (!items.length) {
    els.adminDayReport.innerHTML = `<div class="report-item"><strong>Nessun dato</strong><small>Non ci sono orari salvati per ${date}.</small></div>`;
    return;
}
}

function renderEmployeeDailyReport(data, userId, date) {
  const user = getUserById(data, userId);
  const shift = getShift(data, userId, date);
  const hours = calculateHours(shift.slots || []);
  const pay = hours * Number(user?.hourlyRate || 0);

  $("dailyReport").innerHTML = `
    <div class="report-list">
      <div class="report-item">
        <strong>${escapeHTML(user?.name || "Dipendente")}</strong>
        <span>${date}</span>
        <div class="hours">${hours.toFixed(1)} ore</div>
        <p class="muted">Fasce: ${escapeHTML(slotsToRanges(shift.slots || []))}</p>
        <p><strong>Totale stimato:</strong> € ${pay.toFixed(2)}</p>
      </div>
    </div>
  `;
  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "report-item";
    div.innerHTML = `
      <strong>${item.employeeName}</strong>
      <div class="big">${item.ranges?.map(r => `${r.start}-${r.end}`).join(" • ") || '-'}</div>
      <small>${item.totalHours.toFixed(2)} ore</small>
    `;
    els.adminDayReport.appendChild(div);
  });
}

function renderEmployeeMonthlyReport(data, userId, month) {
  const user = getUserById(data, userId);
  const rows = Object.values(data.shifts)
    .filter((shift) => shift.userId === userId && shift.date.startsWith(month))
    .sort((a, b) => a.date.localeCompare(b.date));
  const total = rows.reduce((sum, shift) => sum + calculateHours(shift.slots || []), 0);
  const pay = total * Number(user?.hourlyRate || 0);

  $("monthlyReport").innerHTML = `
    <div class="report-list">
      <div class="report-item">
        <strong>${month}</strong>
        <div class="hours">${total.toFixed(1)} ore</div>
        <p><strong>Totale stimato:</strong> € ${pay.toFixed(2)}</p>
      </div>
      ${rows.map((shift) => `
        <div class="report-item">
          <strong>${shift.date}</strong>
          <span>${calculateHours(shift.slots || []).toFixed(1)} ore</span>
          <p class="muted">${escapeHTML(slotsToRanges(shift.slots || []))}</p>
        </div>
      `).join("") || `<div class="report-item">Nessun orario salvato per questo mese.</div>`}
    </div>
  `;
}
async function loadAdminMonthReport() {
  if (!state.currentUser || state.currentUser.role !== "admin") return;
  const month = els.adminMonth.value;
  const snap = await getDocs(collection(db, "workSessions"));
  const filtered = snap.docs.map(d => d.data()).filter(x => x.date?.startsWith(month));
  const map = new Map();

function renderAdminDailyReport(data, date) {
  const employees = getEmployees(data);
  const rows = employees.map((user) => {
    const shift = getShift(data, user.id, date);
    const hours = calculateHours(shift.slots || []);
    return { user, shift, hours, pay: hours * Number(user.hourlyRate || 0) };
  filtered.forEach(item => {
    if (!map.has(item.employeeId)) map.set(item.employeeId, { name: item.employeeName, hours: 0 });
    map.get(item.employeeId).hours += item.totalHours || 0;
});

  const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);
  const totalPay = rows.reduce((sum, row) => sum + row.pay, 0);

  $("dailyReport").innerHTML = `
    <div class="report-item">
      <strong>Totale giornata ${date}</strong>
      <div class="hours">${totalHours.toFixed(1)} ore</div>
      <p><strong>Totale paghe:</strong> € ${totalPay.toFixed(2)}</p>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Dipendente</th><th>Fasce</th><th>Ore</th><th>€</th></tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHTML(row.user.name)}</td>
              <td>${escapeHTML(slotsToRanges(row.shift.slots || []))}</td>
              <td>${row.hours.toFixed(1)}</td>
              <td>${row.pay.toFixed(2)}</td>
            </tr>
          `).join("") || `<tr><td colspan="4">Nessun dipendente.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}
  els.adminMonthReport.innerHTML = "";

function renderAdminMonthlyReport(data, month) {
  const employees = getEmployees(data);
  const rows = employees.map((user) => {
    const shifts = Object.values(data.shifts).filter((shift) => shift.userId === user.id && shift.date.startsWith(month));
    const hours = shifts.reduce((sum, shift) => sum + calculateHours(shift.slots || []), 0);
    return { user, hours, pay: hours * Number(user.hourlyRate || 0) };
  });
  if (!map.size) {
    els.adminMonthReport.innerHTML = `<div class="report-item"><strong>Nessun dato</strong><small>Non ci sono orari salvati per ${month}.</small></div>`;
    return;
  }

  const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);
  const totalPay = rows.reduce((sum, row) => sum + row.pay, 0);

  $("monthlyReport").innerHTML = `
    <div class="report-item">
      <strong>Totale mese ${month}</strong>
      <div class="hours">${totalHours.toFixed(1)} ore</div>
      <p><strong>Totale paghe:</strong> € ${totalPay.toFixed(2)}</p>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Dipendente</th><th>Ore mese</th><th>€ mese</th></tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHTML(row.user.name)}</td>
              <td>${row.hours.toFixed(1)}</td>
              <td>${row.pay.toFixed(2)}</td>
            </tr>
          `).join("") || `<tr><td colspan="3">Nessun dipendente.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
  [...map.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(row => {
      const employee = state.employees.find(e => e.id === row.id);
      const rate = Number(employee?.hourlyRate || 0);
      const div = document.createElement("div");
      div.className = "report-item";
      div.innerHTML = `
        <strong>${row.name}</strong>
        <div class="big">${row.hours.toFixed(2)} ore</div>
        <small>Compenso stimato: € ${(row.hours * rate).toFixed(2)}</small>
      `;
      els.adminMonthReport.appendChild(div);
    });
}

function login() {
  const data = loadData();
  const username = $("loginUsername").value.trim().toLowerCase();
  const password = $("loginPassword").value.trim();
  const user = data.users.find((item) => item.username.toLowerCase() === username && item.password === password);
function slotsToRanges(slots) {
  const sorted = slots.map(timeToMinutes).sort((a, b) => a - b);
  if (!sorted.length) return [];
  const ranges = [];
  let start = sorted[0];
  let prev = sorted[0];

  if (!user) {
    setMessage($("loginMessage"), "Credenziali non valide.", "err");
    return;
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur !== prev + 30) {
      ranges.push({ start: minutesToTime(start), end: minutesToTime(prev + 30) });
      start = cur;
    }
    prev = cur;
}

  state.currentUser = user;
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  $("logoutBtn").classList.remove("hidden");
  $("currentUserName").textContent = user.name;
  $("currentRole").textContent = user.role === "admin" ? "Amministratore" : "Dipendente";
  $("adminPanel").classList.toggle("hidden", user.role !== "admin");
  $("adminEmployeeSelector").classList.toggle("hidden", user.role !== "admin");

  renderEmployees();
  loadSelectedShift();
  return ranges;
}

function logout() {
  state.currentUser = null;
  state.selectedSlots = new Set();
  $("loginView").classList.remove("hidden");
  $("appView").classList.add("hidden");
  $("logoutBtn").classList.add("hidden");
  $("loginPassword").value = "";
  setMessage($("loginMessage"), "");
function rangeHours(range) {
  return (timeToMinutes(range.end) - timeToMinutes(range.start)) / 60;
}

function resetLocalData() {
  const ok = confirm("Vuoi cancellare tutti i dati locali e ripartire da zero?");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  loadData();
  renderEmployees();
  loadSelectedShift();
function minutesToTime(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function bindEvents() {
  $("loginBtn").addEventListener("click", login);
  $("loginPassword").addEventListener("keydown", (event) => {
    if (event.key === "Enter") login();
  });
  $("logoutBtn").addEventListener("click", logout);
  $("addEmployeeBtn").addEventListener("click", addEmployee);
  $("employeesTable").addEventListener("click", (event) => {
    const id = event.target?.dataset?.deleteUser;
    if (id) deleteEmployee(id);
  });
  $("selectedDate").addEventListener("change", loadSelectedShift);
  $("selectedMonth").addEventListener("change", renderReports);
  $("workUserSelect").addEventListener("change", loadSelectedShift);
  $("applyRangeBtn").addEventListener("click", applyRange);
  $("saveDayBtn").addEventListener("click", saveSelectedDay);
  $("clearDayBtn").addEventListener("click", () => {
    state.selectedSlots = new Set();
    renderSlots();
    renderReports();
  });
  $("selectAllBtn").addEventListener("click", () => {
    state.selectedSlots = new Set(allSlotStarts());
    renderSlots();
    renderReports();
  });
  $("resetDemoBtn").addEventListener("click", resetLocalData);
function timeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function init() {
  loadData();
  $("selectedDate").value = todayISO();
  $("selectedMonth").value = currentMonthISO();
  buildTimeSelects();
  buildSlotsGrid();
  bindEvents();
function dateToYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

init();
function setMsg(el, text, type = "") {
  el.textContent = text;
  el.className = `msg ${type}`.trim();
}