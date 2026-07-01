/* ==========================
   Firebase (v9) – stessi parametri del tuo progetto
   ========================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-analytics.js";
import {
  getFirestore, collection, query, where, getDocs, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDdi28KEu1gNvuhzSb0ufGiitZYLuyelSs",
  authDomain: "orari-35422.firebaseapp.com",
  databaseURL: "https://orari-35422-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "orari-35422",
  storageBucket: "orari-35422.firebasestorage.app",
  messagingSenderId: "369409416525",
  appId: "1:369409416525:web:1aaf5e483c5d53b2a26b04",
  measurementId: "G-VP398ZB17K"
};
const app = initializeApp(firebaseConfig);
getAnalytics(app);
const db = getFirestore(app);

/* ==========================
   DOM
   ========================== */
const loginSection = document.getElementById("loginSection");
const mainSection  = document.getElementById("mainSection");
const loginUsername= document.getElementById("loginUsername");
const loginPassword= document.getElementById("loginPassword");
const loginButton  = document.getElementById("loginButton");
const loginError   = document.getElementById("loginError");
const logoutButton = document.getElementById("logoutButton");

const selectedDate   = document.getElementById("selectedDate");
const slotsContainer = document.getElementById("slotsContainer");
const totalHoursSpan = document.getElementById("totalHours");
const addRangeButton = document.getElementById("addRangeButton");
const rangeInput     = document.getElementById("rangeInput");
const saveButton     = document.getElementById("saveButton");
const saveMessage    = document.getElementById("saveMessage");

const allUsersTableBody = document.getElementById("allUsersTableBody");

const selectedMonth = document.getElementById("selectedMonth");
const btnCalcStats  = document.getElementById("btnCalcStats");
const monthlyHours  = document.getElementById("monthlyHours");
const totalHoursAll = document.getElementById("totalHoursAll");

const reportUserSelect = document.getElementById("reportUserSelect");
const reportMonth = document.getElementById("reportMonth");
const btnGenerateReport = document.getElementById("btnGenerateReport");
const btnDownloadPdf = document.getElementById("btnDownloadPdf");
const reportMessage = document.getElementById("reportMessage");
const monthlyReportBody = document.getElementById("monthlyReportBody");
const reportTotalHours = document.getElementById("reportTotalHours");
const reportWorkedDays = document.getElementById("reportWorkedDays");

const navToday = document.getElementById("navToday");
const navTop   = document.getElementById("navTop");
const navSave  = document.getElementById("navSave");

/* ==========================
   Stato
   ========================== */
let currentUserId   = null;
let currentUsername = "";
let selectedSlots   = []; // array di "HH:MM"
let usersMap        = {}; // userId -> username
let currentMonthlyReport = null;

/* ==========================
   Helpers
   ========================== */
const pad = n => String(n).padStart(2,"0");
const timeToMinutes = s => { const [h,m] = s.split(":").map(Number); return h*60+m; };
const minutesToTime = v => `${pad(Math.floor(v/60))}:${pad(v%60)}`;
const getAllHalfHourSlots = () => {
  const arr = []; for(let h=0; h<24; h++) for(let m=0; m<60; m+=30) arr.push(`${pad(h)}:${pad(m)}`); return arr;
};
const calculateTotalHours = arr => arr.length * 0.5;
const dayNames = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

function todayISO(){
  return new Date().toISOString().slice(0,10);
}
function currentMonthISO(){
  return new Date().toISOString().slice(0,7);
}
function formatDateIT(dateStr){
  const d = new Date(`${dateStr}T00:00:00`);
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
}
function getWeekdayIT(dateStr){
  return dayNames[new Date(`${dateStr}T00:00:00`).getDay()];
}
function formatMonthIT(ym){
  const [year, month] = ym.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("it-IT", { month:"long", year:"numeric" });
}
function getMonthDays(ym){
  const [year, month] = ym.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const days = [];
  for(let d=1; d<=lastDay; d++) days.push(`${year}-${pad(month)}-${pad(d)}`);
  return days;
}
function slotsToRanges(slots = []){
  const mins = [...new Set(slots)]
    .filter(Boolean)
    .map(timeToMinutes)
    .filter(v => !Number.isNaN(v))
    .sort((a,b) => a-b);

  if (!mins.length) return "-";

  const ranges = [];
  let start = mins[0];
  let prev = mins[0];

  for (let i=1; i<mins.length; i++){
    const cur = mins[i];
    if (cur === prev + 30){
      prev = cur;
    } else {
      ranges.push(`${minutesToTime(start)} - ${minutesToTime(prev + 30)}`);
      start = cur;
      prev = cur;
    }
  }
  ranges.push(`${minutesToTime(start)} - ${minutesToTime(prev + 30)}`);
  return ranges.join(" / ");
}
function slugify(text){
  return String(text || "utente")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "utente";
}
function setReportMessage(text, ok = true){
  reportMessage.textContent = text;
  reportMessage.className = "msg";
  if (text) reportMessage.classList.add(ok ? "save-ok" : "save-ko");
}

/* ==========================
   Login / Logout
   ========================== */
loginButton.addEventListener("click", async () => {
  const user = loginUsername.value.trim();
  const pass = loginPassword.value.trim();
  if (!user || !pass) { loginError.textContent = "Inserisci username e password!"; return; }
  loginError.textContent = "";

  try {
    const usersRef = collection(db, "users");
    const qUser = query(usersRef, where("username","==",user), where("password","==",pass));
    const snap = await getDocs(qUser);
    if (snap.empty) { loginError.textContent = "Username o password errati!"; return; }

    snap.forEach(d => { currentUserId = d.id; currentUsername = d.data().username || ""; });
    // UI
    loginUsername.value = ""; loginPassword.value = "";
    loginSection.classList.add("hidden"); mainSection.classList.remove("hidden");

    // Default oggi e mese corrente
    selectedDate.value = todayISO();
    selectedMonth.value = currentMonthISO();
    reportMonth.value = currentMonthISO();

    await loadReportUsers();
    await loadDayData();
  } catch (e) {
    console.error(e);
    loginError.textContent = "Errore di sistema durante il login!";
  }
});
logoutButton.addEventListener("click", () => {
  currentUserId = null; currentUsername = ""; selectedSlots = [];
  usersMap = {}; currentMonthlyReport = null;
  reportUserSelect.innerHTML = '<option value="">Seleziona utente</option>';
  monthlyReportBody.innerHTML = "";
  reportTotalHours.textContent = "0";
  reportWorkedDays.textContent = "0";
  btnDownloadPdf.disabled = true;
  mainSection.classList.add("hidden"); loginSection.classList.remove("hidden");
});

/* ==========================
   Giorno corrente
   ========================== */
selectedDate.addEventListener("change", () => loadDayData());

async function loadDayData(){
  if(!currentUserId) return;
  const day = selectedDate.value; if(!day) return;

  // Miei orari
  selectedSlots = [];
  try{
    const wsRef = doc(db, "workSessions", `${currentUserId}_${day}`);
    const wsSnap = await getDoc(wsRef);
    if (wsSnap.exists()) selectedSlots = wsSnap.data().slots || [];
  }catch(e){ console.error("Errore caricamento miei orari:", e); }

  renderSlots();

  // Tutti per il giorno
  await loadAllUsersData(day);
}

async function loadAllUsersData(day){
  allUsersTableBody.innerHTML = "";
  try{
    const colRef = collection(db, "workSessions");
    const qDate = query(colRef, where("date","==",day));
    const snap = await getDocs(qDate);

    const docsData = [];
    const userIds = new Set();
    snap.forEach(s => { const d=s.data(); docsData.push(d); userIds.add(d.userId); });

    // mappa userId -> username
    const map = { ...usersMap };
    for (const id of userIds){
      if (map[id]) continue;
      try{
        const u = await getDoc(doc(db, "users", id));
        map[id] = u.exists() ? (u.data().username || "(sconosciuto)") : "(sconosciuto)";
      }catch{ map[id] = "(errore)"; }
    }

    // righe
    const frag = document.createDocumentFragment();
    for (const it of docsData){
      const tr = document.createElement("tr");
      if (it.userId === currentUserId) tr.classList.add("me-row");

      const tdU = document.createElement("td"); tdU.textContent = map[it.userId] || "";
      const tdD = document.createElement("td"); tdD.textContent = it.date || "";
      const tdS = document.createElement("td"); tdS.textContent = (it.slots||[]).join(", ") || "-";
      const tdT = document.createElement("td"); tdT.textContent = (it.totalHours||0).toFixed(2);

      // labels per mobile-cards
      tdU.setAttribute("data-label","Utente");
      tdD.setAttribute("data-label","Data");
      tdS.setAttribute("data-label","Slots");
      tdT.setAttribute("data-label","Ore Tot.");

      tr.append(tdU,tdD,tdS,tdT);
      frag.appendChild(tr);
    }
    allUsersTableBody.appendChild(frag);
  }catch(e){ console.error("Errore caricamento tutti:", e); }
}

/* ==========================
   Slots UI
   ========================== */
function renderSlots(){
  // delega + ricalcolo a frame unico
  slotsContainer.innerHTML = "";
  const frag = document.createDocumentFragment();
  for (const t of getAllHalfHourSlots()){
    const s = document.createElement("button");
    s.type = "button";
    s.className = "slot" + (selectedSlots.includes(t) ? " selected" : "");
    s.textContent = t;
    s.dataset.time = t;
    frag.appendChild(s);
  }
  slotsContainer.appendChild(frag);

  // calcolo ore
  totalHoursSpan.textContent = calculateTotalHours(selectedSlots).toFixed(2);
}

slotsContainer.addEventListener("click", (e) => {
  const btn = e.target.closest(".slot");
  if(!btn) return;
  const t = btn.dataset.time;
  const i = selectedSlots.indexOf(t);
  if (i >= 0) selectedSlots.splice(i,1);
  else { selectedSlots.push(t); selectedSlots.sort(); }
  // toggling senza re-render completo: più veloce
  btn.classList.toggle("selected");
  totalHoursSpan.textContent = calculateTotalHours(selectedSlots).toFixed(2);
}, {passive:true});

/* Range rapido */
addRangeButton.addEventListener("click", () => {
  const val = rangeInput.value.trim();
  if (!val.includes("-")) return;
  const [a,b] = val.split("-").map(s => s.trim());
  const s = timeToMinutes(a), e = timeToMinutes(b);
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s){ alert("Range orario non valido!"); return; }

  for(let cur=s; cur<e; cur+=30){
    const t = minutesToTime(cur);
    if (!selectedSlots.includes(t)) selectedSlots.push(t);
  }
  selectedSlots.sort();
  renderSlots();
  rangeInput.value = "";
});

/* ==========================
   Salvataggio
   ========================== */
async function saveDay(){
  if (!currentUserId) return;
  const day = selectedDate.value; if(!day) return;

  saveMessage.textContent = ""; saveMessage.className = "msg";
  const total = calculateTotalHours(selectedSlots);

  try{
    await setDoc(doc(db, "workSessions", `${currentUserId}_${day}`), {
      userId: currentUserId, date: day, slots: selectedSlots, totalHours: total
    });
    saveMessage.textContent = "Salvato!"; saveMessage.classList.add("save-ok");
    // aggiorna tabella
    await loadAllUsersData(day);
  }catch(e){
    console.error("Errore salvataggio:", e);
    saveMessage.textContent = "Errore nel salvataggio"; saveMessage.classList.add("save-ko");
  }
}
saveButton.addEventListener("click", saveDay);

/* ==========================
   Statistiche
   ========================== */
btnCalcStats.addEventListener("click", async () => {
  if (!currentUserId) return;
  monthlyHours.textContent = "0"; totalHoursAll.textContent = "0";
  try{
    const snap = await getDocs(query(collection(db,"workSessions"), where("userId","==",currentUserId)));
    const ym = (selectedMonth.value || "").slice(0,7);
    let mSum = 0, tSum = 0;
    snap.forEach(d => {
      const dat = d.data(); const hrs = dat.totalHours || 0;
      tSum += hrs; if (ym && (dat.date||"").startsWith(ym)) mSum += hrs;
    });
    monthlyHours.textContent = mSum.toFixed(2);
    totalHoursAll.textContent = tSum.toFixed(2);
  }catch(e){ console.error("Err stats:", e); }
});

/* ==========================
   Report mensile utente + PDF
   ========================== */
async function loadReportUsers(){
  usersMap = {};
  reportUserSelect.innerHTML = '<option value="">Seleziona utente</option>';

  try{
    const snap = await getDocs(collection(db, "users"));
    const users = [];
    snap.forEach(d => {
      const data = d.data();
      const username = data.username || d.id;
      users.push({ id: d.id, username });
      usersMap[d.id] = username;
    });

    users.sort((a,b) => a.username.localeCompare(b.username, "it"));

    const frag = document.createDocumentFragment();
    for (const u of users){
      const opt = document.createElement("option");
      opt.value = u.id;
      opt.textContent = u.username;
      if (u.id === currentUserId) opt.selected = true;
      frag.appendChild(opt);
    }
    reportUserSelect.appendChild(frag);
  }catch(e){
    console.error("Errore caricamento utenti report:", e);
    setReportMessage("Errore nel caricamento degli utenti", false);
  }
}

btnGenerateReport.addEventListener("click", generateMonthlyReport);
reportUserSelect.addEventListener("change", () => { btnDownloadPdf.disabled = true; });
reportMonth.addEventListener("change", () => { btnDownloadPdf.disabled = true; });
btnDownloadPdf.addEventListener("click", downloadMonthlyPdf);

async function generateMonthlyReport(){
  const userId = reportUserSelect.value;
  const ym = reportMonth.value;

  currentMonthlyReport = null;
  btnDownloadPdf.disabled = true;
  monthlyReportBody.innerHTML = "";
  reportTotalHours.textContent = "0";
  reportWorkedDays.textContent = "0";

  if (!userId || !ym){
    setReportMessage("Seleziona utente e mese.", false);
    return;
  }

  setReportMessage("Caricamento report...");

  try{
    // Prendo gli orari dell'utente e filtro il mese lato browser.
    // Così evitiamo di dover creare indici composti su Firestore.
    const snap = await getDocs(query(collection(db,"workSessions"), where("userId","==",userId)));
    const sessionsByDate = {};
    snap.forEach(d => {
      const data = d.data();
      if ((data.date || "").startsWith(ym)) sessionsByDate[data.date] = data;
    });

    const rows = getMonthDays(ym).map(date => {
      const session = sessionsByDate[date] || {};
      const slots = session.slots || [];
      const hours = typeof session.totalHours === "number" ? session.totalHours : calculateTotalHours(slots);
      return {
        weekday: getWeekdayIT(date),
        date,
        dateLabel: formatDateIT(date),
        ranges: slotsToRanges(slots),
        hours
      };
    });

    const total = rows.reduce((sum, r) => sum + r.hours, 0);
    const workedDays = rows.filter(r => r.hours > 0).length;
    const username = usersMap[userId] || reportUserSelect.options[reportUserSelect.selectedIndex]?.textContent || "Utente";

    currentMonthlyReport = { userId, username, ym, rows, total, workedDays };
    renderMonthlyReport(rows);

    reportTotalHours.textContent = total.toFixed(2);
    reportWorkedDays.textContent = workedDays;
    btnDownloadPdf.disabled = false;
    setReportMessage("Report generato.");
  }catch(e){
    console.error("Errore generazione report:", e);
    setReportMessage("Errore nella generazione del report.", false);
  }
}

function renderMonthlyReport(rows){
  const frag = document.createDocumentFragment();
  for (const r of rows){
    const tr = document.createElement("tr");

    const tdG = document.createElement("td"); tdG.textContent = r.weekday;
    const tdD = document.createElement("td"); tdD.textContent = r.dateLabel;
    const tdO = document.createElement("td"); tdO.textContent = r.ranges;
    const tdT = document.createElement("td"); tdT.textContent = r.hours.toFixed(2);

    tdG.setAttribute("data-label", "Giorno");
    tdD.setAttribute("data-label", "Data");
    tdO.setAttribute("data-label", "Orario da - a");
    tdT.setAttribute("data-label", "Ore Tot.");

    tr.append(tdG, tdD, tdO, tdT);
    frag.appendChild(tr);
  }
  monthlyReportBody.appendChild(frag);
}

function downloadMonthlyPdf(){
  if (!currentMonthlyReport){
    setReportMessage("Prima genera il report.", false);
    return;
  }

  if (!window.jspdf?.jsPDF){
    setReportMessage("Libreria PDF non caricata. Controlla la connessione e riprova.", false);
    return;
  }

  const { jsPDF } = window.jspdf;
  const docPdf = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const r = currentMonthlyReport;
  const generatedAt = new Date().toLocaleDateString("it-IT");

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(16);
  docPdf.text("Report orari mensile", 14, 16);

  docPdf.setFont("helvetica", "normal");
  docPdf.setFontSize(10);
  docPdf.text(`Utente: ${r.username}`, 14, 25);
  docPdf.text(`Mese: ${formatMonthIT(r.ym)}`, 14, 31);
  docPdf.text(`Totale ore: ${r.total.toFixed(2)}   -   Giorni lavorati: ${r.workedDays}`, 14, 37);
  docPdf.text(`Generato il: ${generatedAt}`, 14, 43);

  docPdf.autoTable({
    startY: 50,
    head: [["Giorno", "Data", "Orario da - a", "Ore Tot."]],
    body: r.rows.map(row => [row.weekday, row.dateLabel, row.ranges, row.hours.toFixed(2)]),
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [255, 138, 44], textColor: [17, 17, 17] },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 26 },
      2: { cellWidth: 95 },
      3: { cellWidth: 25, halign: "right" }
    },
    didDrawPage: function(){
      const pageSize = docPdf.internal.pageSize;
      const pageHeight = pageSize.height || pageSize.getHeight();
      docPdf.setFontSize(8);
      docPdf.text(`Pagina ${docPdf.internal.getNumberOfPages()}`, 14, pageHeight - 8);
    }
  });

  docPdf.save(`report-orari-${slugify(r.username)}-${r.ym}.pdf`);
}

/* ==========================
   Bottom bar (mobile)
   ========================== */
navToday.addEventListener("click", () => {
  document.querySelectorAll(".card")[1]?.scrollIntoView({behavior:"smooth"}); // slots card
  navToday.classList.add("active");
});
navTop.addEventListener("click", () => window.scrollTo({top:0, behavior:"smooth"}));
navSave.addEventListener("click", saveDay);

/* ==========================
   Boot
   ========================== */
document.addEventListener("DOMContentLoaded", () => {
  // focus management & piccoli tocchi
  const today = todayISO();
  const month = currentMonthISO();
  if (!selectedDate.value) selectedDate.value = today;
  if (!selectedMonth.value) selectedMonth.value = month;
  if (!reportMonth.value) reportMonth.value = month;
}, {passive:true});
