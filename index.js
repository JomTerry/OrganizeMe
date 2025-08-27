// index.js (module)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

import {
  getDatabase,
  ref,
  onValue,
  set,
  get,
  child
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyBWawjroPfOoWvUz4VKstv8gn3UYVpLgC4",
  authDomain: "jomterryy417-c0c.firebaseapp.com",
  projectId: "jomterryy417-c0c",
  storageBucket: "jomterryy417-c0c.firebasestorage.app",
  messagingSenderId: "993273611189",
  appId: "1:993273611189:web:baba2cdc4ff30682904ffc",
  databaseURL: "https://jomterryy417-c0c-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getDatabase(app);

const STORAGE_KEY = 'organizeMe.tasks.v2';
let tasks = [];
let currentUser = null;
let syncTimeout = null;

/* DOM refs */
const pageHome = document.getElementById('page-home');
const pageAdd = document.getElementById('page-add');
const pageProfile = document.getElementById('page-profile');
const navHome = document.getElementById('nav-home');
const navAdd = document.getElementById('nav-add');
const navProfile = document.getElementById('nav-profile');

const highList = document.getElementById('high-list');
const medList = document.getElementById('med-list');
const lowList = document.getElementById('low-list');
const todayCount = document.getElementById('today-count');
const sortMode = document.getElementById('sort-mode');
const showComplete = document.getElementById('show-complete');

const guestNote = document.getElementById('guest-note');
const userEmail = document.getElementById('user-email');
const signBtn = document.getElementById('sign-btn');

const taskTitle = document.getElementById('task-title');
const taskNotes = document.getElementById('task-notes');
const taskDate = document.getElementById('task-date');
const taskTime = document.getElementById('task-time');
const taskPriority = document.getElementById('task-priority');
const taskDuration = document.getElementById('task-duration');
const taskReminder = document.getElementById('task-reminder');
const saveTaskBtn = document.getElementById('save-task');
const cancelTaskBtn = document.getElementById('cancel-task');
const backHomeBtn = document.getElementById('back-home');

const profileEmail = document.getElementById('profile-email');
const profileUid = document.getElementById('profile-uid');
const signoutBtn = document.getElementById('signout-btn');
const clearLocalBtn = document.getElementById('clear-local');

const taskTemplate = document.getElementById('task-template');

function uid(){ return Math.random().toString(36).slice(2,9); }
function nowISO(){ return new Date().toISOString(); }
function parseDueToDate(d){ if(!d) return null; if(/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d+'T23:59:59'); return new Date(d); }
function formatDueForDisplay(s){ if(!s) return ''; if(s.includes('T')) return s.replace('T',' '); return s; }
function saveLocal(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); dispatchChange(); }
function loadLocal(){ try{ tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }catch(e){ tasks=[] } }
function dispatchChange(){ window.dispatchEvent(new Event('OrganizeMeTasksChanged')); if(currentUser){ if(syncTimeout) clearTimeout(syncTimeout); syncTimeout = setTimeout(()=> pushTasksToRemote(), 900); } else saveLocal(); }

function render(){
  const showCompleted = showComplete.checked;
  let visible = tasks.filter(t => showCompleted ? true : !t.done);
  if(sortMode.value === 'date'){
    visible.sort((a,b) => { const da = parseDueToDate(a.due), db = parseDueToDate(b.due); if(!da && !db) return 0; if(!da) return 1; if(!db) return -1; return da - db; });
  } else {
    const rank = p => ({High:3,Medium:2,Low:1}[p] || 2);
    visible.sort((a,b) => {
      const r = rank(b.priority) - rank(a.priority);
      if(r) return r;
      const da = parseDueToDate(a.due), db = parseDueToDate(b.due);
      if(!da && !db) return 0;
      if(!da) return 1;
      if(!db) return -1;
      return da - db;
    });
  }
  const dueSoon = visible.filter(t => { if(!t.due) return false; const d = parseDueToDate(t.due); const diff = d.getTime() - Date.now(); return diff > 0 && diff <= 1000*60*60*24*2 && !t.done; }).length;
  todayCount.textContent = `You have ${dueSoon} tasks due soon`;
  highList.innerHTML=''; medList.innerHTML=''; lowList.innerHTML='';
  visible.forEach(t => {
    const node = taskTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('.task-title').textContent = t.title;
    const metaParts = [];
    if(t.due) metaParts.push(formatDueForDisplay(t.due));
    if(t.duration) metaParts.push(`${t.duration} h`);
    node.querySelector('.task-meta').innerHTML = metaParts.join(' • ') + (t.notes ? ` • ${escapeHtml(t.notes)}` : '');
    const doneBtn = node.querySelector('.done-btn');
    doneBtn.textContent = t.done ? 'Undo' : 'Mark';
    doneBtn.onclick = ()=>{ t.done = !t.done; dispatchChange(); render(); };
    node.querySelector('.edit-btn').onclick = ()=> openEdit(t);
    node.querySelector('.del-btn').onclick = ()=> { if(confirm('Delete task?')){ tasks = tasks.filter(x=>x.id!==t.id); dispatchChange(); render(); } };
    if(t.priority === 'High') highList.appendChild(node);
    else if(t.priority === 'Medium') medList.appendChild(node);
    else lowList.appendChild(node);
  });
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function addTaskLocal(data){
  const t = { id: data.id || uid(), title: data.title || 'Untitled', notes: data.notes||'', due: data.due||null, priority: data.priority||'Medium', duration: data.duration||null, reminder: !!data.reminder, done: !!data.done, createdAt: data.createdAt || nowISO() };
  tasks.push(t); dispatchChange(); render(); return t;
}

function openEdit(t){
  const newTitle = prompt('Edit title', t.title); if(newTitle === null) return; t.title = newTitle.trim() || t.title;
  const newNotes = prompt('Edit notes', t.notes || ''); if(newNotes !== null) t.notes = newNotes.trim();
  const newDue = prompt('Due (YYYY-MM-DD or YYYY-MM-DDTHH:MM) blank to remove', t.due || ''); if(newDue !== null) t.due = newDue.trim() || null;
  dispatchChange(); render();
}

function clearAllLocal(){ if(!confirm('Clear all tasks locally?')) return; tasks = []; dispatchChange(); render(); }

async function pushTasksToRemote(){
  if(!currentUser) return;
  try {
    const map = {};
    tasks.forEach(t => { const id = t.id || uid(); map[id] = { title: t.title, notes: t.notes||'', due: t.due||null, priority: t.priority||'Medium', duration: t.duration||null, reminder: !!t.reminder, done: !!t.done, createdAt: t.createdAt||nowISO() }; });
    await set(ref(db, `users/${currentUser.uid}/tasks`), map);
  } catch(e){ console.warn('pushTasksToRemote failed', e); }
}

async function mergeOnSignin(uid){
  try {
    const snap = await get(child(ref(db), `users/${uid}/tasks`));
    const v = snap.exists() ? snap.val() : null;
    if(!v) await pushTasksToRemote();
  } catch(e){ console.warn('mergeOnSignin err', e); }
}

/* Auth UI */
async function handleSignClick(){
  if(!currentUser){
    // default: Google popup
    try { await signInWithPopup(auth, provider); } catch(e){ console.warn('Google sign-in failed', e); alert('Google sign-in failed: '+(e.message||e)); }
  } else {
    try { await signOut(auth); } catch(e){ console.warn(e); }
  }
}

onAuthStateChanged(auth, async user => {
  currentUser = user;
  if(user){
    guestNote.style.display='none';
    userEmail.style.display='block';
    userEmail.textContent = user.email || 'Signed in';
    signBtn.textContent = 'Account';
    profileEmail.textContent = user.email || '';
    profileUid.textContent = user.uid || '';
    await mergeOnSignin(user.uid);
    // start remote listener that replaces local when remote changes
    const r = ref(db, `users/${user.uid}/tasks`);
    onValue(r, snap => {
      const v = snap.val();
      if(!v){
        if(tasks && tasks.length) pushTasksToRemote();
        return;
      }
      const arr = Object.keys(v).map(k => { const it = v[k]; it.id = k; return it; });
      tasks = arr;
      saveLocal();
      render();
    }, err=> console.warn('remote onValue err', err));
  } else {
    guestNote.style.display='block';
    userEmail.style.display='none';
    signBtn.textContent = 'Sign in';
    profileEmail.textContent=''; profileUid.textContent='';
    loadLocal(); render();
  }
});

/* UI wiring */
navHome.addEventListener('click', ()=> showPage('home'));
navAdd.addEventListener('click', ()=> showPage('add'));
navProfile.addEventListener('click', ()=> showPage('profile'));
function setActiveNav(id){ [navHome,navAdd,navProfile].forEach(n=>n.classList.remove('active')); if(id==='home') navHome.classList.add('active'); if(id==='add') navAdd.classList.add('active'); if(id==='profile') navProfile.classList.add('active'); }
function showPage(name){ document.getElementById('page-home').style.display = name==='home' ? '' : 'none'; document.getElementById('page-add').style.display = name==='add' ? '' : 'none'; document.getElementById('page-profile').style.display = name==='profile' ? '' : 'none'; setActiveNav(name); }
backHomeBtn.addEventListener('click', ()=> { showPage('home'); });
navHome.click();
signBtn.addEventListener('click', handleSignClick);
signoutBtn.addEventListener('click', async ()=> { try { await signOut(auth); } catch(e){ console.warn(e); } });

saveTaskBtn.addEventListener('click', ()=>{
  const title = taskTitle.value && taskTitle.value.trim(); if(!title) return alert('Please give the task a name');
  const d = taskDate.value || null; const t = taskTime.value || null; let due = null; if(d && t) due = d + 'T' + t; else if(d) due = d;
  const item = { title, notes: taskNotes.value.trim() || '', due, priority: taskPriority.value, duration: taskDuration.value ? Number(taskDuration.value) : null, reminder: !!taskReminder.checked, done: false };
  addTaskLocal(item);
  taskTitle.value=''; taskNotes.value=''; taskDate.value=''; taskTime.value=''; taskPriority.value='Medium'; taskDuration.value=''; taskReminder.checked=false;
  showPage('home');
});

cancelTaskBtn.addEventListener('click', ()=> { taskTitle.value=''; taskNotes.value=''; taskDate.value=''; taskTime.value=''; taskPriority.value='Medium'; taskDuration.value=''; taskReminder.checked=false; showPage('home'); });

clearLocalBtn.addEventListener('click', ()=> { if(confirm('Clear local tasks and push empty to remote (if signed in)?')){ tasks=[]; dispatchChange(); render(); if(currentUser) pushTasksToRemote(); } });

sortMode.addEventListener('change', render);
showComplete.addEventListener('change', render);

loadLocal(); render();