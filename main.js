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
  }

  await loadSelectedDay();
  await loadMyReports();
}

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

  // Se non ci sono slot, non salvo una giornata a 0: elimino proprio il documento.
  // Così un orario inserito per errore sparisce dai report e non ricompare al ricaricamento.
  if (slots.length === 0) {
    await deleteDoc(ref);
    setMsg(els.saveMsg, "Orario cancellato: giornata senza ore lavorate.", "success");

    if (state.currentUser.role === "admin") {
      await loadAdminDayReport();
      await loadAdminMonthReport();
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
  els.myMonthPay.textContent = `€ ${(monthHours * rate).toFixed(2)}`;
  els.myTotalHours.textContent = totalHours.toFixed(2);
  els.myTotalPay.textContent = `€ ${(totalHours * rate).toFixed(2)}`;
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
    <div class="big">${ranges.map(r => `${r.start}-${r.end}`).join(" • ")}</div>
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

async function loadAdminDayReport() {
  if (!state.currentUser || state.currentUser.role !== "admin") return;
  const date = els.adminDay.value;
  const snap = await getDocs(query(collection(db, "workSessions"), where("date", "==", date)));
  const items = snap.docs.map(d => d.data()).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  els.adminDayReport.innerHTML = "";

  if (!items.length) {
    els.adminDayReport.innerHTML = `<div class="report-item"><strong>Nessun dato</strong><small>Non ci sono orari salvati per ${date}.</small></div>`;
    return;
  }

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

function setMsg(el, text, type = "") {
  el.textContent = text;
  el.className = `msg ${type}`.trim();
}
