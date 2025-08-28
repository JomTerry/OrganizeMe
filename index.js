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

/* ========== CONFIG - replace if you wish ========== */
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

/* ========== Small UI helpers ========== */
const $ = id => document.getElementById(id);
function uid(){ return Math.random().toString(36).slice(2,9); }
function nowISO(){ return new Date().toISOString(); }
function parseDueToDate(d){ if(!d) return null; if(/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d+'T23:59:59'); return new Date(d); }
function formatDueForDisplay(s){ if(!s) return ''; if(s.includes('T')) return s.replace('T',' '); return s; }

/* Toast */
const toastEl = $('toast');
let toastTimer = null;
function showToast(msg, type='info', ms=3000){
  if(!toastEl) return;
  toastEl.textContent = msg;
  toastEl.style.background = (type === 'error') ? '#b91c1c' : (type === 'success' ? '#027a48' : '#111');
  toastEl.style.opacity = '1';
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> { toastEl.style.opacity = '0'; }, ms);
}

/* ========== STATE & DOM refs ========== */
const STORAGE_KEY = 'organizeMe.tasks.v2';
let tasks = [];
let currentUser = null;
let syncTimeout = null;
let resendCooldown = false;

/* DOM refs */
const pageHome = $('page-home'), pageAdd = $('page-add'), pageProfile = $('page-profile');
const navHome = $('nav-home'), navAdd = $('nav-add'), navProfile = $('nav-profile');
const highList = $('high-list'), medList = $('med-list'), lowList = $('low-list');
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
const taskTemplate = $('task-template');
// select 0-1000 (shows a wheel on mobile)
(function replaceDurationWithSelect(maxValue = 1000) {
  const old = document.getElementById('task-duration');
  if (!old) return;

  const sel = document.createElement('select');
  sel.id = old.id;
  sel.name = old.name || old.id;
  sel.className = old.className || '';
  sel.setAttribute('aria-label', 'Estimated duration (hours)');

  // populate 0..maxValue
  for (let i = 0; i <= maxValue; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = i + ' Hours';
    sel.appendChild(opt);
  }

  // replace old input with the new select in DOM
  old.parentNode.replaceChild(sel, old);
})(1000);

const verifiedWarning = $('verified-warning');

/* ========== Storage functions ========== */
function loadLocal(){ try{ tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }catch(e){ tasks=[]; } }
function saveLocal(){ 
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); 
}

function dispatchChange() {
  window.dispatchEvent(new Event('OrganizeMeTasksChanged'));

  if (currentUser && currentUser.emailVerified) {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(pushTasksToRemote, 900);
  } else {
    saveLocal();
  }
}

/* ========== Render logic ========== */
function render(){
  const showCompleted = showComplete.checked;
  let visible = tasks.filter(t => showCompleted ? true : !t.done);

  if(sortMode.value === 'date'){
    visible.sort((a,b)=>{ const da = parseDueToDate(a.due), db = parseDueToDate(b.due); if(!da && !db) return 0; if(!da) return 1; if(!db) return -1; return da - db; });
  } else {
    const rank = p => ({High:3,Medium:2,Low:1}[p] || 2);
    visible.sort((a,b)=>{
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

  highList.innerHTML = ''; medList.innerHTML = ''; lowList.innerHTML = '';

  const high = visible.filter(t => t.priority === 'High');
  const med = visible.filter(t => t.priority === 'Medium');
  const low = visible.filter(t => t.priority === 'Low');

  appendTasksTo(highList, high);
  appendTasksTo(medList, med);
  appendTasksTo(lowList, low);
}

function appendTasksTo(container, arr){
  if(!arr.length){
    const e = document.createElement('div'); e.className = 'empty'; e.textContent = 'No tasks yet!'; container.appendChild(e); return;
  }
  arr.forEach(t=>{
    const node = taskTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('.task-title').textContent = t.title;
    const metaParts = [];
    if(t.due) metaParts.push(formatDueForDisplay(t.due));
		if (t.duration != null) metaParts.push(`${t.duration} Hours`);
    node.querySelector('.task-meta').innerHTML = metaParts.join(' • ') + (t.notes ? ` • ${escapeHtml(t.notes)}` : '');
    node.setAttribute('data-priority', t.priority || 'Medium');
    const doneBtn = node.querySelector('.done-btn');
    doneBtn.textContent = t.done ? 'Undo' : 'Done';
    doneBtn.onclick = ()=>{ t.done = !t.done; dispatchChange(); render(); };
    node.querySelector('.edit-btn').onclick = ()=> openEdit(t);
    node.querySelector('.del-btn').onclick = ()=> { if(confirm('Delete task?')){ tasks = tasks.filter(x=>x.id!==t.id); dispatchChange(); render(); } };
    container.appendChild(node);
  });
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ========== Task actions ========== */
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

/* ========== Remote sync (Realtime DB) ========== */
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

/* ========== Profile helpers ========== */
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
  guestNote.style.display = 'none';
  userEmail.style.display = 'block';
  userEmail.textContent = name;
  $('greeting').textContent = `Welcome, ${name.split(' ')[0] || name}! 😌`;
}

/* ========== AUTH flows ========== */

/* toggle header auth buttons visibility */
function updateAuthUIOnState(signedIn){
  if(signedIn){
    authButtons.style.display = 'none';
    accountBtn.style.display = 'inline-block';
  } else {
    authButtons.style.display = 'flex';
    accountBtn.style.display = 'none';
  }
}

/* Google login */
googleBtn.addEventListener('click', async ()=>{
  try {
    await signInWithPopup(auth, provider);
    showToast('Signed in with Google', 'success');
  } catch(e){
    console.error('Google sign-in failed', e);
    showToast('Google sign-in failed', 'error');
  }
});

/* header email buttons: show profile page and forms */
emailSigninBtn.addEventListener('click', ()=> { showPage('profile'); showEmailForms('signin'); });
emailSignupBtn.addEventListener('click', ()=> { showPage('profile'); showEmailForms('signup'); });
accountBtn.addEventListener('click', ()=> { showPage('profile'); });

function showEmailForms(mode){
  profileSignedOut.style.display = '';
  profileSignedIn.style.display = 'none';
  if(mode === 'signin') signinEmail.focus(); else signupEmail.focus();
  signinStatus.textContent = ''; signupStatus.textContent = '';
}

/* sign-up */
signupSubmit.addEventListener('click', async ()=>{
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
      // sign out to force verification flow (optional). We'll sign out to enforce verification.
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
signinSubmit.addEventListener('click', async ()=>{
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
signoutBtn.addEventListener('click', async ()=>{
  try {
    await signOut(auth);
    showToast('Signed out', 'info');
  } catch(e){ console.warn(e); showToast('Sign-out failed', 'error'); }
});

/* resend verification helper (exposed to profile UI via warning area) */
async function resendVerification(){
  if(!auth.currentUser) return showToast('Not signed in', 'error');
  if(resendCooldown) return showToast('Please wait before resending', 'info');
  try {
    await sendEmailVerification(auth.currentUser);
    showToast('Verification email resent', 'success');
    resendCooldown = true;
    setTimeout(()=> { resendCooldown = false; }, 45_000); // 45s cooldown
  } catch(e){
    console.error('resend failed', e);
    showToast('Failed to resend verification', 'error');
  }
}

/* helper to re-check verification after user clicked email */
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

/* called when a user becomes verified */
function updateAfterVerified(){
  verifiedWarning.style.display = 'none';
  // If we have a currentUser now verified, ensure push/subscribe
  if(currentUser && currentUser.emailVerified){
    // push local tasks to remote so other devices receive them
    if(tasks && tasks.length) pushTasksToRemote();
    else pushTasksToRemote();
    showToast('Syncing tasks to remote', 'info');
  }
}

/* ===========================
   Password visibility toggles
   =========================== */
// Wire up any .pw-toggle buttons present in DOM
document.addEventListener('click', (e) => {
  // Delegation: if a pw-toggle was clicked
  const btn = e.target.closest && e.target.closest('.pw-toggle');
  if (!btn) return;
  const targetId = btn.dataset && btn.dataset.target;
  if (!targetId) return;
  const input = document.getElementById(targetId);
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
  // optional: change inner icon to eye/eye-off - here we just flip color via aria-pressed
  input.focus();
});

/* ===========================
   Forgot / reset password
   =========================== */
const signinForgotEl = $('signin-forgot');
if (signinForgotEl) {
  signinForgotEl.addEventListener('click', async (ev) => {
    ev.preventDefault();
    // prefer the email typed into the signin box
    let email = (signinEmail && signinEmail.value && signinEmail.value.trim()) || '';
    if (!email) {
      // prompt if empty
      email = prompt('Enter the email to send password reset to:');
      if (!email) return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      showToast('Password reset email sent — check your inbox', 'success', 6000);
      // give a visible confirmation near signin status (if shown)
      if (signinStatus) signinStatus.textContent = 'Password reset email sent. Check inbox.';
    } catch (err) {
      console.error('sendPasswordResetEmail failed', err);
      const msg = (err && err.message) ? err.message : 'Failed to send reset email';
      showToast(msg, 'error', 5000);
      if (signinStatus) signinStatus.textContent = msg;
    }
  });
}

/* Listen to auth state changes */
onAuthStateChanged(auth, async user => {
  currentUser = user;
  if(user){
    // update header/profile UI
    updateAuthUIOnState(true);
    guestNote.style.display = 'none';
    profileSignedOut.style.display = 'none';
    profileSignedIn.style.display = '';

    // apply name/email
    const nameFromAuth = user.displayName || null;
    userEmail.style.display = 'block';
    userEmail.textContent = nameFromAuth || user.email || 'Signed in';
    profileEmail.textContent = user.email || '';
    profileUid.textContent = user.uid || '';
    accountBtn.style.display = 'inline-block';

    // prefill profile name
    if(nameFromAuth){
      profileNameInput.value = nameFromAuth;
      applyDisplayNameToUI(nameFromAuth);
    } else {
      const p = await loadProfileFromDb(user.uid);
      profileNameInput.value = (p && p.displayName) || '';
      if(profileNameInput.value) applyDisplayNameToUI(profileNameInput.value);
    }

    // If the user is not verified (email provider), block certain actions
    if(!user.emailVerified && user.providerData && user.providerData.some(pd=>pd.providerId === 'password')){
      verifiedWarning.style.display = '';
      verifiedWarning.innerHTML = `Your email is not verified. <button id="resend-verify" class="btn ghost small">Resend verification</button> <button id="check-verified" class="btn small">I verified</button>`;
      // wire those dynamically created buttons:
      setTimeout(()=>{
        const r = $('resend-verify'), c = $('check-verified');
        if(r) r.addEventListener('click', ()=> resendVerification());
        if(c) c.addEventListener('click', ()=> checkVerifiedNow());
      }, 60);
      showToast('You must verify your email to enable full sync', 'info', 5000);
    } else {
      verifiedWarning.style.display = 'none';
    }

    // Merge tasks and subscribe remote -> local updates
    await mergeOnSignin(user.uid);
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
  } else {
    // signed out -> show local-only UI
    updateAuthUIOnState(false);
    guestNote.style.display = '';
    userEmail.style.display = 'none';
    accountBtn.style.display = 'none';
    profileSignedOut.style.display = '';
    profileSignedIn.style.display = 'none';
    profileEmail.textContent = ''; profileUid.textContent = ''; profileNameInput.value = '';
    $('greeting').textContent = 'Welcome! 😌';
    loadLocal(); render();
  }
});

/* ========== Navigation + UI wiring ========== */
navHome.addEventListener('click', ()=> showPage('home'));
navAdd.addEventListener('click', ()=> showPage('add'));
navProfile.addEventListener('click', ()=> showPage('profile'));
function setActiveNav(id){ [navHome,navAdd,navProfile].forEach(n=>n.classList.remove('active')); if(id==='home') navHome.classList.add('active'); if(id==='add') navAdd.classList.add('active'); if(id==='profile') navProfile.classList.add('active'); }
function showPage(name){
  pageHome.style.display = name==='home' ? '' : 'none';
  pageAdd.style.display = name==='add' ? '' : 'none';
  pageProfile.style.display = name==='profile' ? '' : 'none';
  setActiveNav(name);
}
if (backHomeBtn) {
  backHomeBtn.addEventListener('click', ()=> showPage('home'));
}
navHome.click();

/* Add task form */
saveTaskBtn.addEventListener('click', ()=>{
  if(currentUser && currentUser.providerData && currentUser.providerData.some(pd=>pd.providerId === 'password') && !currentUser.emailVerified){
    showToast('Verify your email to add tasks (or sign in via Google).', 'error');
    return;
  }
  const title = taskTitle.value && taskTitle.value.trim();
  if(!title) return showToast('Please give the task a name', 'error');
  const d = taskDate.value || null; const t = taskTime.value || null; let due = null; if(d && t) due = d + 'T' + t; else if(d) due = d;
  const rawDur = taskDuration.value;
  const durNum = rawDur === '' ? null : Number(rawDur);
  const duration = (durNum === 0) ? null : durNum; // treat 0 as "no value"

  const item = {
    title,
    notes: taskNotes.value.trim() || '',
    due,
    priority: taskPriority.value,
    duration,
    reminder: !!taskReminder.checked,
    done: false
  };
  // ===================================================================================

  addTaskLocal(item);
  taskTitle.value=''; taskNotes.value=''; taskDate.value=''; taskTime.value=''; taskPriority.value='Medium'; taskDuration.value='0'; taskReminder.checked=false;
  showPage('home');
  showToast('Task added', 'success');
});

cancelTaskBtn.addEventListener('click', ()=> { taskTitle.value=''; taskNotes.value=''; taskDate.value=''; taskTime.value=''; taskPriority.value='Medium'; taskDuration.value='0'; taskReminder.checked=false; showPage('home'); });

clearLocalBtn.addEventListener('click', ()=> { if(confirm('Clear local tasks and push empty to remote (if signed in)?')){ tasks=[]; dispatchChange(); render(); if(currentUser && currentUser.emailVerified) pushTasksToRemote(); } });

sortMode.addEventListener('change', render);
showComplete.addEventListener('change', render);

/* profile save */
saveNameBtn.addEventListener('click', async ()=>{
  const name = profileNameInput.value && profileNameInput.value.trim();
  if(!name) return showToast('Enter a display name', 'error');
  if(!currentUser) return showToast('Sign in first to save a profile name', 'error');
  await saveDisplayName(name);
});
refreshProfileBtn.addEventListener('click', async ()=>{
  if(!currentUser) return;
  const authName = currentUser.displayName || '';
  const dbProfile = await loadProfileFromDb(currentUser.uid);
  profileNameInput.value = authName || (dbProfile && dbProfile.displayName) || '';
  if(profileNameInput.value) applyDisplayNameToUI(profileNameInput.value);
});

/* form cancel buttons */
$('signin-cancel')?.addEventListener('click', ()=> { signinEmail.value=''; signinPassword.value=''; signinStatus.textContent=''; });
$('signup-cancel')?.addEventListener('click', ()=> { signupEmail.value=''; signupPassword.value=''; signupConfirm.value=''; signupStatus.textContent=''; });

/* initial load */
loadLocal(); render();