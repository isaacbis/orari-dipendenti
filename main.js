const STORAGE_KEY = "orariDipendenti.v1";

const $ = (id) => document.getElementById(id);

const state = {
  currentUser: null,
  selectedSlots: new Set(),
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

function selectedUserIdForWork() {
  if (state.currentUser?.role === "admin") {
    return $("workUserSelect").value || state.currentUser.id;
  }
  return state.currentUser?.id;
}

function shiftKey(userId, date) {
  return `${userId}_${date}`;
}

function getShift(data, userId, date) {
  return data.shifts[shiftKey(userId, date)] || { userId, date, slots: [] };
}

function setMessage(el, text, type = "") {
  el.textContent = text;
  el.className = `message ${type}`.trim();
}

function getEmployees(data) {
  return data.users.filter((user) => user.role === "employee");
}

function getUserById(data, id) {
  return data.users.find((user) => user.id === id);
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
    button.addEventListener("click", () => {
      if (state.selectedSlots.has(slot)) state.selectedSlots.delete(slot);
      else state.selectedSlots.add(slot);
      renderSlots();
      renderReports();
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

function calculateHours(slots) {
  return slots.length * 0.5;
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

function addEmployee() {
  const data = loadData();
  const name = $("employeeName").value.trim();
  const username = $("employeeUsername").value.trim().toLowerCase();
  const password = $("employeePassword").value.trim();
  const hourlyRate = Number($("employeeRate").value || 0);

  if (!name || !username || !password) {
    setMessage($("employeeMessage"), "Compila nome, username e password.", "err");
    return;
  }

  if (data.users.some((user) => user.username.toLowerCase() === username)) {
    setMessage($("employeeMessage"), "Username già esistente.", "err");
    return;
  }

  data.users.push({
    id: crypto.randomUUID(),
    name,
    username,
    password,
    role: "employee",
    hourlyRate,
  });

  saveData(data);
  $("employeeName").value = "";
  $("employeeUsername").value = "";
  $("employeePassword").value = "";
  setMessage($("employeeMessage"), "Dipendente aggiunto.", "ok");
  renderEmployees();
  loadSelectedShift();
}

function deleteEmployee(userId) {
  const data = loadData();
  const user = getUserById(data, userId);
  if (!user) return;

  const ok = confirm(`Eliminare ${user.name}? Verranno eliminati anche i suoi orari salvati in locale.`);
  if (!ok) return;

  data.users = data.users.filter((item) => item.id !== userId);
  Object.keys(data.shifts).forEach((key) => {
    if (data.shifts[key].userId === userId) delete data.shifts[key];
  });

  saveData(data);
  renderEmployees();
  loadSelectedShift();
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

function saveSelectedDay() {
  const data = loadData();
  const userId = selectedUserIdForWork();
  const date = $("selectedDate").value;

  if (!userId) {
    setMessage($("saveMessage"), "Prima crea o seleziona un dipendente.", "err");
    return;
  }

  const slots = [...state.selectedSlots].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  data.shifts[shiftKey(userId, date)] = { userId, date, slots };
  saveData(data);

  setMessage($("saveMessage"), "Orari salvati.", "ok");
  renderReports();
}

function renderReports() {
  const data = loadData();
  const date = $("selectedDate").value;
  const month = $("selectedMonth").value;

  if (state.currentUser?.role === "admin") {
    renderAdminDailyReport(data, date);
    renderAdminMonthlyReport(data, month);
  } else {
    renderEmployeeDailyReport(data, state.currentUser.id, date);
    renderEmployeeMonthlyReport(data, state.currentUser.id, month);
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

function renderAdminDailyReport(data, date) {
  const employees = getEmployees(data);
  const rows = employees.map((user) => {
    const shift = getShift(data, user.id, date);
    const hours = calculateHours(shift.slots || []);
    return { user, shift, hours, pay: hours * Number(user.hourlyRate || 0) };
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

function renderAdminMonthlyReport(data, month) {
  const employees = getEmployees(data);
  const rows = employees.map((user) => {
    const shifts = Object.values(data.shifts).filter((shift) => shift.userId === user.id && shift.date.startsWith(month));
    const hours = shifts.reduce((sum, shift) => sum + calculateHours(shift.slots || []), 0);
    return { user, hours, pay: hours * Number(user.hourlyRate || 0) };
  });

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
}

function login() {
  const data = loadData();
  const username = $("loginUsername").value.trim().toLowerCase();
  const password = $("loginPassword").value.trim();
  const user = data.users.find((item) => item.username.toLowerCase() === username && item.password === password);

  if (!user) {
    setMessage($("loginMessage"), "Credenziali non valide.", "err");
    return;
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
}

function logout() {
  state.currentUser = null;
  state.selectedSlots = new Set();
  $("loginView").classList.remove("hidden");
  $("appView").classList.add("hidden");
  $("logoutBtn").classList.add("hidden");
  $("loginPassword").value = "";
  setMessage($("loginMessage"), "");
}

function resetLocalData() {
  const ok = confirm("Vuoi cancellare tutti i dati locali e ripartire da zero?");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  loadData();
  renderEmployees();
  loadSelectedShift();
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
}

function init() {
  loadData();
  $("selectedDate").value = todayISO();
  $("selectedMonth").value = currentMonthISO();
  buildTimeSelects();
  buildSlotsGrid();
  bindEvents();
}

init();
