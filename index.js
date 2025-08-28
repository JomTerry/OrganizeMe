// index.js (module)
// Firebase web SDK v10 imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile
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

// safer $ helper that logs missing elements
const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) console.warn(`DOM element not found: #${id}`);
  return el;
};

// small helpers
function uid(){ return Math.random().toString(36).slice(2,9); }
function nowISO(){ return new Date().toISOString(); }
function parseDueToDate(d){ if(!d) return null; if(/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d+'T23:59:59'); return new Date(d); }
function formatDueForDisplay(s){ if(!s) return ''; if(s.includes('T')) return s.replace('T',' '); return s; }

const toastEl = $('toast');
let toastTimer = null;
function showToast(msg, type='info', ms=3000){
  if(!toastEl) {
    console.warn('toast element missing, message:', msg);
    return;
  }
  toastEl.textContent = msg;
  toastEl.style.background = (type === 'error') ? '#b91c1c' : (type === 'success' ? '#027a48' : '#111');
  toastEl.style.opacity = '1';
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> { toastEl.style.opacity = '0'; }, ms);
}

const STORAGE_KEY = 'organizeMe.tasks.v2';
let tasks = [];
let currentUser = null;
let syncTimeout = null;
let resendCooldown = false;

/* DOM references: these may be null if HTML differs — checks below will report missing ones */
const pageHome = $('page-home'), pageAdd = $('page-add'), pageProfile = $('page-profile');
const navHome = $('nav-home'), navAdd = $('nav-add'), navProfile = $('nav-profile');
const highList = $('high-list'), medList = $('med-list'), lowList = $('low-list'), overdueList = $('overdue-list');
const todayCount = $('today-count');
const sortMode = $('sort-mode'), showComplete = $('show-complete');

const guestNote = $('guest-note'), userEmail = $('user-email'), authButtons = $('auth-buttons');
const googleBtn = $('google-signin'), emailSigninBtn = $('email-signin'), emailSignupBtn = $('email-signup'), accountBtn = $('account-btn');

const taskTitle = $('task-title'), taskNotes = $('task-notes'), taskDate = $('task-date'), taskTime = $('task-time');
const taskPriority = $('task-priority'), taskDuration = $('task-duration'), taskReminder = $('task-reminder');
const saveTaskBtn = $('save-task'), cancelTaskBtn = $('cancel-task'), backHomeBtn = $('back-home');

const profileSignedIn = $('profile-signedin'), profileSignedOut = $('profile-signedout');
const profileEmail = $('profile-email'), profileUid = $('profile-uid'), profileNameInput = $('profile-name-input');
const saveNameBtn = $('save-name-btn'), refreshProfileBtn = $('refresh-profile'), profileSaveStatus = $('profile-save-status');
const signoutBtn = $('signout-btn'), clearLocalBtn = $('clear-local');

const signinForm = $('form-signin'), signupForm = $('form-signup');
const signinEmail = $('signin-email'), signinPassword = $('signin-password'), signinStatus = $('signin-status'), signinSubmit = $('signin-submit');
const signupEmail = $('signup-email'), signupPassword = $('signup-password'), signupConfirm = $('signup-confirm'), signupStatus = $('signup-status'), signupSubmit = $('signup-submit');
const taskTemplateEl = $('task-template');

// quick required-elements check to surface missing IDs in console
(function sanityCheck() {
  const required = [
    'page-home','page-add','page-profile',
    'nav-home','nav-add','nav-profile',
    'task-template','task-duration','save-task',
    'profile-signedin','profile-signedout','toast'
  ];
  required.forEach(id => {
    if (!$(id)) {
      console.error(`Missing required DOM element: #${id} — this can cause blank pages. Verify your index.html has the right IDs.`);
    }
  });
})();

// replace duration input by a select 0..1000
(function replaceDurationWithSelect(maxValue = 1000) {
  const old = document.getElementById('task-duration');
  if (!old) return;
  const sel = document.createElement('select');
  sel.id = old.id;
  sel.name = old.name || old.id;
  sel.className = old.className || '';
  sel.setAttribute('aria-label', 'Estimated duration (hours)');
  for (let i = 0; i <= maxValue; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = i + ' Hours';
    sel.appendChild(opt);
  }
  old.parentNode.replaceChild(sel, old);
})(1000);

/* Storage */
function loadLocal(){ try{ tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }catch(e){ tasks=[]; } }
function saveLocal(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }

function dispatchChange() {
  window.dispatchEvent(new Event('OrganizeMeTasksChanged'));
  if (currentUser && currentUser.emailVerified) {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(pushTasksToRemote, 900);
  } else {
    saveLocal();
  }
}

/* Render logic */
function render() {
  if (!Array.isArray(tasks)) tasks = [];
  const showCompleted = (showComplete && showComplete.checked) || false;

  let baseVisible = tasks.filter(t => showCompleted ? true : !t.done);
  const overdueArr = baseVisible.filter(t => isOverdue(t));
  const nonOverdue = baseVisible.filter(t => !isOverdue(t));

  if (sortMode && sortMode.value === 'date') {
    nonOverdue.sort((a,b) => {
      const da = parseDueToDate(a.due), db = parseDueToDate(b.due);
      if(!da && !db) return 0;
      if(!da) return 1;
      if(!db) return -1;
      return da - db;
    });
  } else {
    const rank = p => ({High:3, Medium:2, Low:1}[p] || 2);
    nonOverdue.sort((a,b) => {
      const r = rank(b.priority) - rank(a.priority);
      if (r) return r;
      const da = parseDueToDate(a.due), db = parseDueToDate(b.due);
      if(!da && !db) return 0;
      if(!da) return 1;
      if(!db) return -1;
      return da - db;
    });
  }

  const dueSoon = nonOverdue.filter(t => {
    if (!t.due) return false;
    const d = parseDueToDate(t.due);
    const diff = d.getTime() - Date.now();
    return diff > 0 && diff <= 1000*60*60*24*2 && !t.done;
  }).length;
  if (todayCount) todayCount.textContent = `You have ${dueSoon} tasks due soon`;

  if (highList) highList.innerHTML = '';
  if (medList) medList.innerHTML = '';
  if (lowList) lowList.innerHTML = '';
  if (overdueList) overdueList.innerHTML = '';

  const high = nonOverdue.filter(t => t.priority === 'High');
  const med  = nonOverdue.filter(t => t.priority === 'Medium');
  const low  = nonOverdue.filter(t => t.priority === 'Low');

  appendTasksTo(highList, high);
  appendTasksTo(medList, med);
  appendTasksTo(lowList, low);
  appendTasksTo(overdueList, overdueArr, 'Good job! You have no overdue! 🥳');
}

function appendTasksTo(container, arr, emptyMessage = 'No tasks yet!') {
  if (!container) {
    console.warn('appendTasksTo: missing container', container, arr);
    return;
  }

  if (!arr || arr.length === 0) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = emptyMessage;
    container.appendChild(e);
    return;
  }

  const tpl = taskTemplateEl;
  if (!tpl || !tpl.content) {
    console.error('task template missing: #task-template — cannot render tasks');
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = 'Task template missing';
    container.appendChild(e);
    return;
  }

  arr.forEach(t=>{
    const node = tpl.content.firstElementChild.cloneNode(true);
    const titleEl = node.querySelector('.task-title');
    if (titleEl) titleEl.textContent = t.title || 'Untitled';
    const metaEl = node.querySelector('.task-meta');
    const metaParts = [];
    if(t.due) metaParts.push(formatDueForDisplay(t.due));
    if (t.duration != null && t.duration !== 0) metaParts.push(`${t.duration} Hours`);
    if (metaEl) metaEl.innerHTML = metaParts.join(' • ') + (t.notes ? ` • ${escapeHtml(t.notes)}` : '');

    node.setAttribute('data-priority', t.priority || 'Medium');

    const overdue = isOverdue(t);
    if (overdue) {
      node.classList.add('overdue');
      node.setAttribute('data-overdue', 'true');
    } else {
      node.removeAttribute('data-overdue');
      node.classList.remove('overdue');
    }

    const doneBtn = node.querySelector('.done-btn');
    if (doneBtn) {
      doneBtn.textContent = t.done ? 'Undo' : 'Done';
      doneBtn.onclick = ()=>{ t.done = !t.done; dispatchChange(); render(); };
    }

    const editBtn = node.querySelector('.edit-btn');
    if (editBtn) editBtn.onclick = ()=> openEdit(t);

    const delBtn = node.querySelector('.del-btn');
    if (delBtn) delBtn.onclick = ()=> { if(confirm('Delete task?')){ tasks = tasks.filter(x=>x.id!==t.id); dispatchChange(); render(); } };

    try {
      const actions = node.querySelector('.task-actions');
      if (actions) {
        const calBtn = document.createElement('a');
        calBtn.className = 'btn ghost small cal-btn';
        calBtn.setAttribute('role','button');
        calBtn.setAttribute('target','_blank');
        calBtn.setAttribute('rel','noopener noreferrer');
        calBtn.textContent = 'Add to Calendar';

        const dates = googleDatesRangeForTask(t.due);
        if (dates) {
          const params = new URLSearchParams();
          params.set('action','TEMPLATE');
          params.set('text', t.title || 'Task');
          if (t.notes) params.set('details', t.notes);
          params.set('dates', dates);
          calBtn.href = 'https://calendar.google.com/calendar/render?' + params.toString();
        } else {
          calBtn.href = '#';
          calBtn.addEventListener('click', (ev) => { ev.preventDefault(); showToast('Task has no due date to add to calendar', 'info'); });
        }

        const editBtnLocal = node.querySelector('.edit-btn');
        if (editBtnLocal) actions.insertBefore(calBtn, editBtnLocal);
        else actions.appendChild(calBtn);
      }
    } catch(err) {
      console.warn('failed to add calendar button', err);
    }

    container.appendChild(node);
  });
}

function isOverdue(task) {
  if (!task || !task.due) return false;
  const d = parseDueToDate(task.due);
  if (!d) return false;
  return d.getTime() < Date.now() && !task.done;
}

function googleDatesRangeForTask(dueStr) {
  if (!dueStr) return null;
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dueStr);
  const parse = parseDueToDate;
  if (isDateOnly) {
    const start = new Date(dueStr + 'T00:00:00');
    const end = new Date(start.getTime() + 1000 * 60 * 60 * 24);
    const fmt = dt => dt.toISOString().slice(0,10).replace(/-/g,'');
    return `${fmt(start)}/${fmt(end)}`;
  } else {
    const d = parse(dueStr);
    if (!d) return null;
    const toUTCString = dt => {
      return dt.toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';
    };
    const start = toUTCString(d);
    const end = toUTCString(new Date(d.getTime() + 60 * 60 * 1000));
    return `${start}/${end}`;
  }
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
  if(!currentUser.emailVerified){
    console.warn('user not verified -> not syncing');
    return;
  }
  try {
    const map = {};
    tasks.forEach(t => { const id = t.id || uid(); map[id] = { title: t.title, notes: t.notes||'', due: t.due||null, priority: t.priority||'Medium', duration: t.duration||null, reminder: !!t.reminder, done: !!t.done, createdAt: t.createdAt||nowISO() }; });
    await set(ref(db, `users/${currentUser.uid}/tasks`), map);
  } catch(e){ console.warn('pushTasksToRemote failed', e); showToast('Sync failed', 'error'); }
}

async function mergeOnSignin(uid){
  try {
    const snap = await get(child(ref(db), `users/${uid}/tasks`));
    const v = snap.exists() ? snap.val() : null;
    if(!v){
      if(tasks && tasks.length) pushTasksToRemote();
      return;
    }
    const arr = Object.keys(v).map(k => { const it = v[k]; it.id = k; return it; });
    tasks = arr;
    saveLocal();
    render();
  } catch(e){ console.warn('mergeOnSignin err', e); }
}

async function saveDisplayName(name){
  if(!currentUser) return;
  profileSaveStatus.textContent = 'Saving...';
  try {
    await updateProfile(currentUser, { displayName: name });
    await set(ref(db, `users/${currentUser.uid}/profile`), { displayName: name });
    profileSaveStatus.textContent = 'Saved!';
    setTimeout(()=> profileSaveStatus.textContent = '', 2000);
    applyDisplayNameToUI(name);
    showToast('Profile saved', 'success');
  } catch(e){
    console.error('saveDisplayName failed', e);
    profileSaveStatus.textContent = 'Save failed';
    showToast('Profile save failed', 'error');
  }
}

async function loadProfileFromDb(uid){
  try {
    const snap = await get(child(ref(db), `users/${uid}/profile`));
    if(snap.exists()) return snap.val();
  } catch(e){ console.warn('loadProfileFromDb failed', e); }
  return null;
}

function applyDisplayNameToUI(name){
  if(!name) return;
  const gn = $('guest-note');
  if (gn) gn.style.display = 'none';
  const ue = $('user-email');
  if (ue) { ue.style.display = 'block'; ue.textContent = name; }
  const g = $('greeting');
  if (g) g.textContent = `Welcome, ${name.split(' ')[0] || name}! 😌`;
}

function updateAuthUIOnState(signedIn){
  if(signedIn){
    if (authButtons) authButtons.style.display = 'none';
    if (accountBtn) accountBtn.style.display = 'inline-block';
  } else {
    if (authButtons) authButtons.style.display = 'flex';
    if (accountBtn) accountBtn.style.display = 'none';
  }
}

/* Google login */
if (googleBtn) googleBtn.addEventListener('click', async ()=>{
  try {
    await signInWithPopup(auth, provider);
    showToast('Signed in with Google', 'success');
  } catch(e){
    console.error('Google sign-in failed', e);
    showToast('Google sign-in failed', 'error');
  }
});

if (emailSigninBtn) emailSigninBtn.addEventListener('click', ()=> { showPage('profile'); /* showEmailForms('signin'); */ showEmailForms('signin'); });
if (emailSignupBtn) emailSignupBtn.addEventListener('click', ()=> { showPage('profile'); showEmailForms('signup'); });
if (accountBtn) accountBtn.addEventListener('click', ()=> { showPage('profile'); });

function showEmailForms(mode){
  if (profileSignedOut) profileSignedOut.style.display = '';
  if (profileSignedIn) profileSignedIn.style.display = 'none';
  if(mode === 'signin' && signinEmail) signinEmail.focus();
  else if (signupEmail) signupEmail.focus();
  if (signinStatus) signinStatus.textContent = ''; if (signupStatus) signupStatus.textContent = '';
}

/* sign-up */
if (signupSubmit) signupSubmit.addEventListener('click', async ()=>{
  const em = signupEmail.value && signupEmail.value.trim();
  const p1 = signupPassword.value;
  const p2 = signupConfirm.value;
  signupStatus.textContent = '';
  if(!em || !p1){ signupStatus.textContent = 'Enter email and password'; return; }
  if(p1.length < 6){ signupStatus.textContent = 'Password must be at least 6 characters'; return; }
  if(p1 !== p2){ signupStatus.textContent = 'Passwords do not match'; return; }
  try {
    const cred = await createUserWithEmailAndPassword(auth, em, p1);
    try {
      await sendEmailVerification(cred.user);
      signupStatus.textContent = 'Account created — verification email sent. Please check your inbox.';
      showToast('Verification email sent', 'success');
      try { await signOut(auth); } catch(e){/*ignore*/ }
    } catch(sendErr){
      console.warn('verification send failed', sendErr);
      signupStatus.textContent = 'Account created — failed to send verification email (check console).';
      showToast('Verification email send failed', 'error');
    }
  } catch(e){
    console.error('signup failed', e);
    signupStatus.textContent = e.message || 'Sign-up failed';
    showToast('Sign-up failed', 'error');
  }
});

/* sign-in */
if (signinSubmit) signinSubmit.addEventListener('click', async ()=>{
  const em = signinEmail.value && signinEmail.value.trim();
  const p = signinPassword.value;
  signinStatus.textContent = '';
  if(!em || !p){ signinStatus.textContent = 'Enter email and password'; return; }
  try {
    const cred = await signInWithEmailAndPassword(auth, em, p);
    if(cred.user && !cred.user.emailVerified){
      signinStatus.textContent = 'Signed in — email not verified. Please verify to enable sync.';
      showToast('Signed in but email not verified', 'info', 4000);
    } else {
      showToast('Signed in', 'success');
    }
  } catch(e){
    console.error('signin failed', e);
    signinStatus.textContent = e.message || 'Sign-in failed';
    showToast('Sign-in failed', 'error');
  }
});

/* sign-out */
if (signoutBtn) signoutBtn.addEventListener('click', async ()=>{
  try {
    await signOut(auth);
    showToast('Signed out', 'info');
  } catch(e){ console.warn(e); showToast('Sign-out failed', 'error'); }
});

async function resendVerification(){
  if(!auth.currentUser) return showToast('Not signed in', 'error');
  if(resendCooldown) return showToast('Please wait before resending', 'info');
  try {
    await sendEmailVerification(auth.currentUser);
    showToast('Verification email resent', 'success');
    resendCooldown = true;
    setTimeout(()=> { resendCooldown = false; }, 45_000);
  } catch(e){
    console.error('resend failed', e);
    showToast('Failed to resend verification', 'error');
  }
}

async function checkVerifiedNow(){
  if(!auth.currentUser) return;
  try {
    await auth.currentUser.reload();
    if(auth.currentUser.emailVerified){
      showToast('Email verified! Sync enabled.', 'success');
      updateAfterVerified();
    } else {
      showToast('Still not verified. Check your inbox.', 'info');
    }
  } catch(e){ console.warn(e); showToast('Verification check failed', 'error'); }
}

function updateAfterVerified(){
  const vw = $('verified-warning');
  if (vw) vw.style.display = 'none';
  if(currentUser && currentUser.emailVerified){
    pushTasksToRemote();
    showToast('Syncing tasks to remote', 'info');
  }
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest && e.target.closest('.pw-toggle');
  if (!btn) return;
  const targetId = btn.dataset && btn.dataset.target;
  if (!targetId) return;
  const input = document.getElementById(targetId);
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
  input.focus();
});

const signinForgotEl = $('signin-forgot');
if (signinForgotEl) {
  signinForgotEl.addEventListener('click', async (ev) => {
    ev.preventDefault();
    let email = (signinEmail && signinEmail.value && signinEmail.value.trim()) || '';
    if (!email) {
      email = prompt('Enter the email to send password reset to:');
      if (!email) return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      showToast('Password reset email sent — check your inbox', 'success', 6000);
      if (signinStatus) signinStatus.textContent = 'Password reset email sent. Check inbox.';
    } catch (err) {
      console.error('sendPasswordResetEmail failed', err);
      const msg = (err && err.message) ? err.message : 'Failed to send reset email';
      showToast(msg, 'error', 5000);
      if (signinStatus) signinStatus.textContent = msg;
    }
  });
}

onAuthStateChanged(auth, async user => {
  currentUser = user;
  if(user){
    updateAuthUIOnState(true);
    const gn = $('guest-note'); if (gn) gn.style.display = 'none';
    if (profileSignedOut) profileSignedOut.style.display = 'none';
    if (profileSignedIn) profileSignedIn.style.display = '';

    const nameFromAuth = user.displayName || null;
    const ue = $('user-email'); if (ue) { ue.style.display = 'block'; ue.textContent = nameFromAuth || user.email || 'Signed in'; }
    if (profileEmail) profileEmail.textContent = user.email || '';
    if (profileUid) profileUid.textContent = user.uid || '';
    if (accountBtn) accountBtn.style.display = 'inline-block';

    if(nameFromAuth){
      if (profileNameInput) profileNameInput.value = nameFromAuth;
      applyDisplayNameToUI(nameFromAuth);
    } else {
      const p = await loadProfileFromDb(user.uid);
      if (profileNameInput) profileNameInput.value = (p && p.displayName) || '';
      if(profileNameInput && profileNameInput.value) applyDisplayNameToUI(profileNameInput.value);
    }

    if(!user.emailVerified && user.providerData && user.providerData.some(pd=>pd.providerId === 'password')){
      const vw = $('verified-warning'); if (vw) { vw.style.display = ''; vw.innerHTML = `Your email is not verified. <button id="resend-verify" class="btn ghost small">Resend verification</button> <button id="check-verified" class="btn small">I verified</button>`; }
      setTimeout(()=>{
        const r = $('resend-verify'), c = $('check-verified');
        if(r) r.addEventListener('click', ()=> resendVerification());
        if(c) c.addEventListener('click', ()=> checkVerifiedNow());
      }, 60);
      showToast('You must verify your email to enable full sync', 'info', 5000);
    } else {
      const vw = $('verified-warning'); if (vw) vw.style.display = 'none';
    }

    await mergeOnSignin(user.uid);
    try {
      const rref = ref(db, `users/${user.uid}/tasks`);
      onValue(rref, snap => {
        const v = snap.val();
        if(!v){
          if(tasks && tasks.length) pushTasksToRemote();
          return;
        }
        const arr = Object.keys(v).map(k => { const it = v[k]; it.id = k; return it; });
        tasks = arr;
        saveLocal();
        render();
      }, err => console.warn('remote onValue err', err));
    } catch(e){
      console.warn('onValue listen failed', e);
    }
  } else {
    updateAuthUIOnState(false);
    const gn = $('guest-note'); if (gn) gn.style.display = '';
    const ue = $('user-email'); if (ue) ue.style.display = 'none';
    if (accountBtn) accountBtn.style.display = 'none';
    if (profileSignedOut) profileSignedOut.style.display = '';
    if (profileSignedIn) profileSignedIn.style.display = 'none';
    if (profileEmail) profileEmail.textContent = ''; if (profileUid) profileUid.textContent = ''; if (profileNameInput) profileNameInput.value = '';
    const g = $('greeting'); if (g) g.textContent = 'Welcome! 😌';
    loadLocal(); render();
  }
});

if (navHome) navHome.addEventListener('click', ()=> showPage('home'));
if (navAdd) navAdd.addEventListener('click', ()=> showPage('add'));
if (navProfile) navProfile.addEventListener('click', ()=> showPage('profile'));

function setActiveNav(id){
  const ids = [navHome, navAdd, navProfile];
  ids.forEach(n => { if(n) n.classList && n.classList.remove('active'); });
  if (id === 'home' && navHome) navHome.classList.add('active');
  if (id === 'add' && navAdd) navAdd.classList.add('active');
  if (id === 'profile' && navProfile) navProfile.classList.add('active');
}

function showPage(name){
  const pages = { home:'page-home', add:'page-add', profile:'page-profile' };
  Object.keys(pages).forEach(k=>{
    const el = $(pages[k]);
    if (!el) return;
    el.style.display = (k === name) ? '' : 'none';
  });
  setActiveNav(name);
}

if (backHomeBtn) backHomeBtn.addEventListener('click', ()=> showPage('home'));
if (navHome && !navHome.classList.contains('active')) navHome.click();

/* Save / cancel */
if (saveTaskBtn) saveTaskBtn.addEventListener('click', ()=>{
  if(currentUser && currentUser.providerData && currentUser.providerData.some(pd=>pd.providerId === 'password') && !currentUser.emailVerified){
    showToast('Verify your email to add tasks (or sign in via Google).', 'error');
    return;
  }
  const title = taskTitle && taskTitle.value && taskTitle.value.trim();
  if(!title) return showToast('Please give the task a name', 'error');
  const d = (taskDate && taskDate.value) || null;
  const t = (taskTime && taskTime.value) || null;
  let due = null; if(d && t) due = d + 'T' + t; else if(d) due = d;
  const rawDur = (document.getElementById('task-duration') && document.getElementById('task-duration').value) || '';
  const durNum = rawDur === '' ? null : Number(rawDur);
  const duration = (durNum === 0) ? null : durNum;

  const item = {
    title,
    notes: (taskNotes && taskNotes.value && taskNotes.value.trim()) || '',
    due,
    priority: (taskPriority && taskPriority.value) || 'Medium',
    duration,
    reminder: !!(taskReminder && taskReminder.checked),
    done: false
  };

  addTaskLocal(item);
  if (taskTitle) taskTitle.value=''; if (taskNotes) taskNotes.value=''; if (taskDate) taskDate.value=''; if (taskTime) taskTime.value=''; if (taskPriority) taskPriority.value='Medium';
  const durEl = document.getElementById('task-duration'); if (durEl) durEl.value='0';
  if (taskReminder) taskReminder.checked=false;
  showPage('home');
  showToast('Task added', 'success');
});

if (cancelTaskBtn) cancelTaskBtn.addEventListener('click', ()=> {
  if (taskTitle) taskTitle.value=''; if (taskNotes) taskNotes.value=''; if (taskDate) taskDate.value=''; if (taskTime) taskTime.value=''; if (taskPriority) taskPriority.value='Medium';
  const durEl = document.getElementById('task-duration'); if (durEl) durEl.value='0';
  if (taskReminder) taskReminder.checked=false;
  showPage('home');
});

if (clearLocalBtn) clearLocalBtn.addEventListener('click', ()=> {
  if(confirm('Clear local tasks and push empty to remote (if signed in)?')){ tasks=[]; dispatchChange(); render(); if(currentUser && currentUser.emailVerified) pushTasksToRemote(); }
});

if (sortMode) sortMode.addEventListener('change', render);
if (showComplete) showComplete.addEventListener('change', render);

if (saveNameBtn) saveNameBtn.addEventListener('click', async ()=>{
  const name = profileNameInput && profileNameInput.value && profileNameInput.value.trim();
  if(!name) return showToast('Enter a display name', 'error');
  if(!currentUser) return showToast('Sign in first to save a profile name', 'error');
  await saveDisplayName(name);
});
if (refreshProfileBtn) refreshProfileBtn.addEventListener('click', async ()=>{
  if(!currentUser) return;
  const authName = currentUser.displayName || '';
  const dbProfile = await loadProfileFromDb(currentUser.uid);
  if (profileNameInput) profileNameInput.value = authName || (dbProfile && dbProfile.displayName) || '';
  if(profileNameInput && profileNameInput.value) applyDisplayNameToUI(profileNameInput.value);
});

/* form cancel */
$('signin-cancel')?.addEventListener('click', ()=> { if (signinEmail) signinEmail.value=''; if (signinPassword) signinPassword.value=''; if (signinStatus) signinStatus.textContent=''; });
$('signup-cancel')?.addEventListener('click', ()=> { if (signupEmail) signupEmail.value=''; if (signupPassword) signupPassword.value=''; if (signupConfirm) signupConfirm.value=''; if (signupStatus) signupStatus.textContent=''; });

/* initial load */
loadLocal(); render();

// register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    console.log('sw registered', reg);
  }).catch(err => console.warn('sw reg failed', err));
}

// helper / notifications
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

async function showNotificationNow(title, options = {}) {
  if (navigator.serviceWorker && navigator.serviceWorker.ready) {
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification(title, options);
  } else if (window.Notification && Notification.permission === 'granted') {
    new Notification(title, options);
  } else {
    console.warn('notifications not available or not permitted');
  }
}

async function testNotification() {
  const ok = await requestNotificationPermission();
  if (!ok) return showToast('Notifications permission denied', 'error');
  showNotificationNow('OrganizeMe — test', { body: 'This is a test notification from your local app.' });
}
window.testNotification = testNotification;