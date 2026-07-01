/* ==========================
   Firebase (v9)
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
   Tema Light/Dark
========================== */
const THEME_KEY = "app-theme";
const themeToggle = document.getElementById("themeToggle");

function applySavedTheme(){
  const saved = localStorage.getItem(THEME_KEY); // "light" | "dark" | null
  const preferDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  const useLight = saved ? (saved === "light") : !preferDark;
  document.body.classList.toggle("light-mode", useLight);
}
function toggleTheme(){
  const isLight = !document.body.classList.contains("light-mode");
  document.body.classList.toggle("light-mode", isLight);
  localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
}
themeToggle?.addEventListener("click", toggleTheme);
applySavedTheme();

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

const navToday = document.getElementById("navToday");
const navTop   = document.getElementById("navTop");
const navSave  = document.getElementById("navSave");

/* ==========================
   Stato & Helpers
========================== */
let currentUserId   = null;
let currentUsername = "";
let selectedSlots   = []; // array di "HH:MM"

const pad = n => String(n).padStart(2,"0");
const timeToMinutes = s => { const [h,m] = s.split(":").map(Number); return h*60+m; };
const minutesToTime = v => `${pad(Math.floor(v/60))}:${pad(v%60)}`;
const getAllHalfHourSlots = () => {
  const arr = []; for(let h=0; h<24; h++) for(let m=0; m<60; m+=30) arr.push(`${pad(h)}:${pad(m)}`); return arr;
};
const calculateTotalHours = arr => arr.length * 0.5;

/* ====== Compressione slot (step 30') ====== */
function compressSlots(slots, step=30){
  if(!Array.isArray(slots) || !slots.length) return [];
  const mins = Array.from(new Set(slots.map(timeToMinutes))).sort((a,b)=>a-b);
  const out = [];
  let start = mins[0], prev = mins[0];
  for(let i=1;i<mins.length;i++){
    const cur = mins[i];
    if(cur === prev + step){ prev = cur; continue; }
    out.push({startMin:start, endMin:prev+step});
    start = cur; prev = cur;
  }
  out.push({startMin:start, endMin:prev+step});
  return out;
}
function formatRanges(ranges){
  return ranges.map(r => `${minutesToTime(r.startMin)} - ${minutesToTime(r.endMin)}`).join(" / ");
}
function formatCompressedSlots(slots){
  return formatRanges(compressSlots(slots));
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
    loginUsername.value = ""; loginPassword.value = "";
    loginSection.classList.add("hidden"); mainSection.classList.remove("hidden");

    selectedDate.value = new Date().toISOString().slice(0,10);
    await loadDayData();
  } catch (e) {
    console.error(e);
    loginError.textContent = "Errore di sistema durante il login!";
  }
});
logoutButton.addEventListener("click", () => {
  currentUserId = null; currentUsername = ""; selectedSlots = [];
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
    const map = {};
    for (const id of userIds){
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

      // 👉 Slot compressi: "10:00 - 11:00 / 12:30 - 13:00"
      const tdS = document.createElement("td");
      tdS.textContent = formatCompressedSlots(it.slots || []) || "-";

      const tdT = document.createElement("td"); tdT.textContent = (it.totalHours||0).toFixed(2);

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
   Slots UI (miei)
========================== */
function renderSlots(){
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

  totalHoursSpan.textContent = calculateTotalHours(selectedSlots).toFixed(2);
}

slotsContainer.addEventListener("click", (e) => {
  const btn = e.target.closest(".slot");
  if(!btn) return;
  const t = btn.dataset.time;
  const i = selectedSlots.indexOf(t);
  if (i >= 0) selectedSlots.splice(i,1);
  else { selectedSlots.push(t); selectedSlots.sort(); }
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
  if (!selectedDate.value) selectedDate.value = new Date().toISOString().slice(0,10);
}, {passive:true});