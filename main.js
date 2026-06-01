import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  serverTimestamp
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
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);

const state = {
  currentUser: null,
  employees: [],
  selectedSlots: new Set(),
};

function pad(n) {
  return String(n).padStart(2, "0");
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthISO() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

function minutesToTime(minutes) {
  if (minutes === 1440) return "24:00";
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

function timeToMinutes(time) {
  if (time === "24:00") return 1440;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function allSlotStarts() {
  return Array.from({ length: 48 }, (_, i) => minutesToTime(i * 30));
}

function allTimeBoundaries() {
  return Array.from({ length: 49 }, (_, i) => minutesToTime(i * 30));
}

function slotToLabel(slot) {
  const start = timeToMinutes(slot);
  return `${slot}-${minutesToTime(start + 30)}`;
}

function calculateHours(slots) {
  return slots.length * 0.5;
}

function selectedUserIdForWork() {
  if (state.currentUser?.role === "admin") {
    return $("workUserSelect").value || state.currentUser.id;
  }
  return state.currentUser?.id;
}

function shiftId(userId, date) {
  return `${userId}_${date}`;
}

function setMessage(el, text, type = "") {
  el.textContent = text;
  el.className = `message ${type}`.trim();
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slotsToRanges(slots) {
  const sorted = [...slots].map(timeToMinutes).sort((a, b) => a - b);
  if (!sorted.length) return "-";

  const ranges = [];
  let start = sorted[0];
  let previous = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    const current = sorted[i];
    if (current !== previous + 30) {
      ranges.push(`${minutesToTime(start)}-${minutesToTime(previous + 30)}`);
      start = current;
    }
    previous = current;
  }

  return ranges.join(" · ");
}

function slotArrayToRangeObjects(slots) {
  const text = slotsToRanges(slots);
  if (text === "-") return [];
  return text.split(" · ").map((part) => {
    const [start, end] = part.split("-");
    return { start, end };
  });
}

async function ensureDefaultAdmin() {
  const q = query(collection(db, "employees"), where("username", "==", "admin"));
  const snap = await getDocs(q);
  if (!snap.empty) return;

  await addDoc(collection(db, "employees"), {
    name: "Amministratore",
    username: "admin",
    password: "admin123",
    role: "admin",
    hourlyRate: 0,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

async function fetchEmployees(includeInactive = false) {
  const snap = await getDocs(collection(db, "employees"));
  const employees = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return employees
    .filter((user) => includeInactive || user.active !== false)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

async function login() {
  const username = $("loginUsername").value.trim().toLowerCase();
  const password = $("loginPassword").value.trim();

  if (!username || !password) {
    setMessage($("loginMessage"), "Inserisci username e password.", "err");
    return;
  }

  setMessage($("loginMessage"), "Accesso in corso…");

  try {
    await ensureDefaultAdmin();

    const q = query(
      collection(db, "employees"),
      where("username", "==", username),
      where("password", "==", password),
      where("active", "==", true)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      setMessage($("loginMessage"), "Credenziali non valide.", "err");
      return;
    }

    const docSnap = snap.docs[0];
    state.currentUser = { id: docSnap.id, ...docSnap.data() };
    await openApp();
  } catch (error) {
    console.error(error);
    setMessage($("loginMessage"), "Errore Firebase. Controlla Firestore e le regole.", "err");
  }
}

async function openApp() {
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  $("logoutBtn").classList.remove("hidden");
  $("currentUserName").textContent = state.currentUser.name;
  $("currentRole").textContent = state.currentUser.role === "admin" ? "Amministratore" : "Dipendente";

  const isAdmin = state.currentUser.role === "admin";
  $("adminPanel").classList.toggle("hidden", !isAdmin);
  $("adminEmployeeSelector").classList.toggle("hidden", !isAdmin);

  $("selectedDate").value = todayISO();
  $("selectedMonth").value = currentMonthISO();

  await refreshAll();
}

function logout() {
  state.currentUser = null;
  state.employees = [];
  state.selectedSlots = new Set();
  $("appView").classList.add("hidden");
  $("logoutBtn").classList.add("hidden");
  $("loginView").classList.remove("hidden");
  $("loginPassword").value = "";
  setMessage($("loginMessage"), "");
}

async function refreshAll() {
  if (!state.currentUser) return;
  await renderEmployees();
  await loadSelectedShift();
  await renderReports();
}

function buildTimeSelects() {
  const start = $("startTime");
  const end = $("endTime");
  start.innerHTML = "";
  end.innerHTML = "";

  allTimeBoundaries().forEach((time, index) => {
    if (index < 48) start.add(new Option(time, time));
    if (index > 0) end.add(new Option(time, time));
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
    button.addEventListener("click", async () => {
      if (state.selectedSlots.has(slot)) state.selectedSlots.delete(slot);
      else state.selectedSlots.add(slot);
      renderSlots();
      await renderReports();
    });
    grid.appendChild(button);
  });
}

function renderSlots() {
  document.querySelectorAll(".slot").forEach((btn) => {
    btn.classList.toggle("selected", state.selectedSlots.has(btn.dataset.slot));
  });
  $("dailyTotalBadge").textContent = `${calculateHours([...state.selectedSlots]).toFixed(1)} ore`;
}

async function loadSelectedShift() {
  if (!state.currentUser) return;

  const userId = selectedUserIdForWork();
  const date = $("selectedDate").value;
  state.selectedSlots = new Set();

  if (userId && date) {
    const shiftSnap = await getDoc(doc(db, "workSessions", shiftId(userId, date)));
    if (shiftSnap.exists()) {
      state.selectedSlots = new Set(shiftSnap.data().slots || []);
    }
  }

  const user = state.employees.find((item) => item.id === userId) || state.currentUser;
  $("hoursTitle").textContent = state.currentUser.role === "admin"
    ? `Orari di ${user?.name || "dipendente"}`
    : "I miei orari";

  renderSlots();
  await renderReports();
}

async function renderEmployees() {
  if (!state.currentUser) return;

  state.employees = await fetchEmployees(true);
  const tbody = $("employeesTable");
  const select = $("workUserSelect");
  tbody.innerHTML = "";
  select.innerHTML = "";

  const activeEmployees = state.employees.filter((user) => user.active !== false && user.role === "employee");

  activeEmployees.forEach((user) => {
    select.add(new Option(user.name, user.id));
  });

  if (!activeEmployees.length) {
    select.add(new Option("Nessun dipendente", ""));
  }

  const visibleRows = state.employees.filter((user) => user.role === "employee");

  visibleRows.forEach((user) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHTML(user.name)}</strong></td>
      <td>${escapeHTML(user.username)}</td>
      <td>${Number(user.hourlyRate || 0).toFixed(2)}</td>
      <td>${user.active === false ? "Disattivato" : "Attivo"}</td>
      <td>
        ${user.active === false
          ? `<button class="btn ghost small-btn" data-reactivate-user="${user.id}">Riattiva</button>`
          : `<button class="btn danger small-btn" data-disable-user="${user.id}">Disattiva</button>`}
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (!visibleRows.length) {
    tbody.innerHTML = `<tr><td colspan="5">Ancora nessun dipendente inserito.</td></tr>`;
  }
}

async function addEmployee() {
  const name = $("employeeName").value.trim();
  const username = $("employeeUsername").value.trim().toLowerCase();
  const password = $("employeePassword").value.trim();
  const hourlyRate = Number($("employeeRate").value || 0);

  if (!name || !username || !password) {
    setMessage($("employeeMessage"), "Compila nome, username e password.", "err");
    return;
  }

  const duplicate = await getDocs(query(collection(db, "employees"), where("username", "==", username)));
  if (!duplicate.empty) {
    setMessage($("employeeMessage"), "Username già esistente.", "err");
    return;
  }

  await addDoc(collection(db, "employees"), {
    name,
    username,
    password,
    role: "employee",
    hourlyRate,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  $("employeeName").value = "";
  $("employeeUsername").value = "";
  $("employeePassword").value = "";
  setMessage($("employeeMessage"), "Dipendente aggiunto su Firestore.", "ok");
  await refreshAll();
}

async function setEmployeeActive(userId, active) {
  const user = state.employees.find((item) => item.id === userId);
  if (!user) return;

  if (!active) {
    const ok = confirm(`Disattivare ${user.name}? Non potrà più fare login, ma gli orari restano nei report.`);
    if (!ok) return;
  }

  await updateDoc(doc(db, "employees", userId), {
    active,
    updatedAt: serverTimestamp(),
  });

  await refreshAll();
}

function applyRange() {
  const start = timeToMinutes($("startTime").value);
  const end = timeToMinutes($("endTime").value);

  if (end <= start) {
    alert("L’orario di fine deve essere successivo all’orario di inizio.");
    return;
  }

  for (let minute = start; minute < end; minute += 30) {
    state.selectedSlots.add(minutesToTime(minute));
  }

  renderSlots();
  renderReports();
}

async function saveSelectedDay() {
  const userId = selectedUserIdForWork();
  const date = $("selectedDate").value;

  if (!userId) {
    setMessage($("saveMessage"), "Prima crea o seleziona un dipendente.", "err");
    return;
  }

  const employee = state.employees.find((item) => item.id === userId) || state.currentUser;
  const slots = [...state.selectedSlots].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  const totalHours = calculateHours(slots);

  setMessage($("saveMessage"), "Salvataggio su Firestore…");

  await setDoc(doc(db, "workSessions", shiftId(userId, date)), {
    employeeId: userId,
    employeeName: employee.name || "Dipendente",
    date,
    slots,
    ranges: slotArrayToRangeObjects(slots),
    totalHours,
    updatedAt: serverTimestamp(),
  });

  setMessage($("saveMessage"), "Orari salvati online.", "ok");
  await renderReports();
}

async function fetchSessions() {
  const snap = await getDocs(collection(db, "workSessions"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function renderReports() {
  if (!state.currentUser) return;

  const date = $("selectedDate").value;
  const month = $("selectedMonth").value;
  const isAdmin = state.currentUser.role === "admin";
  const sessions = await fetchSessions();
  const employeesById = new Map(state.employees.map((u) => [u.id, u]));

  const scoped = isAdmin
    ? sessions
    : sessions.filter((shift) => shift.employeeId === state.currentUser.id);

  const daily = scoped.filter((shift) => shift.date === date);
  const monthly = scoped.filter((shift) => String(shift.date || "").startsWith(month));

  renderDailyReport(daily, employeesById, isAdmin);
  renderMonthlyReport(monthly, employeesById, isAdmin, month);
}

function renderDailyReport(items, employeesById, isAdmin) {
  const target = $("dailyReport");
  if (!items.length) {
    target.innerHTML = `<p class="muted">Nessun orario salvato per questa data.</p>`;
    return;
  }

  if (!isAdmin) {
    const total = items.reduce((sum, item) => sum + Number(item.totalHours || 0), 0);
    target.innerHTML = `
      <div class="report-item featured">
        <strong>Totale giorno</strong>
        <span class="hours">${total.toFixed(1)} ore</span>
        <p>${slotsToRanges(items.flatMap((item) => item.slots || []))}</p>
      </div>
    `;
    return;
  }

  const rows = items
    .sort((a, b) => (a.employeeName || "").localeCompare(b.employeeName || ""))
    .map((item) => {
      const employee = employeesById.get(item.employeeId);
      const name = employee?.name || item.employeeName || "Dipendente";
      return `
        <div class="report-item">
          <strong>${escapeHTML(name)}</strong>
          <span class="hours">${Number(item.totalHours || 0).toFixed(1)} ore</span>
          <p>${escapeHTML(slotsToRanges(item.slots || []))}</p>
        </div>
      `;
    })
    .join("");

  target.innerHTML = `<div class="report-list">${rows}</div>`;
}

function renderMonthlyReport(items, employeesById, isAdmin, month) {
  const target = $("monthlyReport");
  if (!items.length) {
    target.innerHTML = `<p class="muted">Nessun dato salvato per ${escapeHTML(month)}.</p>`;
    return;
  }

  if (!isAdmin) {
    const total = items.reduce((sum, item) => sum + Number(item.totalHours || 0), 0);
    const euro = total * Number(state.currentUser.hourlyRate || 0);
    target.innerHTML = `
      <div class="report-item featured">
        <strong>Totale mese</strong>
        <span class="hours">${total.toFixed(1)} ore</span>
        <p>Stima compenso: <strong>€ ${euro.toFixed(2)}</strong></p>
      </div>
    `;
    return;
  }

  const totals = new Map();
  items.forEach((item) => {
    const id = item.employeeId;
    const current = totals.get(id) || 0;
    totals.set(id, current + Number(item.totalHours || 0));
  });

  const rows = [...totals.entries()]
    .map(([id, hours]) => {
      const employee = employeesById.get(id);
      const name = employee?.name || "Dipendente";
      const euro = hours * Number(employee?.hourlyRate || 0);
      return { name, hours, euro };
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((row) => `
      <div class="report-item">
        <strong>${escapeHTML(row.name)}</strong>
        <span class="hours">${row.hours.toFixed(1)} ore</span>
        <p>Stima compenso: <strong>€ ${row.euro.toFixed(2)}</strong></p>
      </div>
    `)
    .join("");

  target.innerHTML = `<div class="report-list">${rows}</div>`;
}

function wireEvents() {
  $("loginBtn").addEventListener("click", login);
  $("loginPassword").addEventListener("keydown", (event) => {
    if (event.key === "Enter") login();
  });
  $("logoutBtn").addEventListener("click", logout);
  $("addEmployeeBtn").addEventListener("click", addEmployee);
  $("refreshBtn").addEventListener("click", refreshAll);
  $("applyRangeBtn").addEventListener("click", applyRange);
  $("saveDayBtn").addEventListener("click", saveSelectedDay);

  $("selectedDate").addEventListener("change", loadSelectedShift);
  $("selectedMonth").addEventListener("change", renderReports);
  $("workUserSelect").addEventListener("change", loadSelectedShift);

  $("selectAllBtn").addEventListener("click", () => {
    state.selectedSlots = new Set(allSlotStarts());
    renderSlots();
    renderReports();
  });

  $("clearDayBtn").addEventListener("click", () => {
    state.selectedSlots = new Set();
    renderSlots();
    renderReports();
  });

  $("employeesTable").addEventListener("click", (event) => {
    const disableId = event.target?.dataset?.disableUser;
    const reactivateId = event.target?.dataset?.reactivateUser;
    if (disableId) setEmployeeActive(disableId, false);
    if (reactivateId) setEmployeeActive(reactivateId, true);
  });
}

async function init() {
  buildTimeSelects();
  buildSlotsGrid();
  wireEvents();
  try {
    await ensureDefaultAdmin();
    setMessage($("loginMessage"), "Firebase pronto. Puoi entrare.", "ok");
  } catch (error) {
    console.error(error);
    setMessage($("loginMessage"), "Errore collegamento Firestore. Controlla database e regole.", "err");
  }
}

init();
