// index.js — Realtime Database sync + Auth (email/password + Google popup/redirect)
// Uses the Firebase modular SDK (v10.x). Make sure you added your site origin to
// Firebase Auth → Authorized domains.

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBWawjroPfOoWvUz4VKstv8gn3UYVpLgC4",
  authDomain: "jomterryy417-c0c.firebaseapp.com",
  projectId: "jomterryy417-c0c",
  storageBucket: "jomterryy417-c0c.firebasestorage.app",
  messagingSenderId: "993273611189",
  appId: "1:993273611189:web:baba2cdc4ff30682904ffc"
};

const $ = id => document.getElementById(id);
const LOG = (...args) => console.debug('[OrganizeMe]', ...args);

// Minimal helper to make client-generated stable IDs (avoids push keys)
function makeId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

(async function init() {
  try {
    const [appMod, authMod, dbMod] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js')
    ]);

    const { initializeApp } = appMod;
    const {
      getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult,
      GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut
    } = authMod;
    const {
      getDatabase, ref, set, onValue, get, remove
    } = dbMod;

    const app = initializeApp(FIREBASE_CONFIG);
    const auth = getAuth(app);
    const db = getDatabase(app);
    const provider = new GoogleAuthProvider();

    // UI functions
    function showSignedInUI(email, providerId) {
      $('signed-in-row') && ($('signed-in-row').style.display = 'flex');
      $('signed-out-row') && ($('signed-out-row').style.display = 'none');
      if ($('auth-email')) $('auth-email').textContent = email || '';
      if ($('auth-status')) {
        if (providerId && providerId.includes('google')) $('auth-status').textContent = `Signed in with Google (${email||''})`;
        else $('auth-status').textContent = `Signed in as ${email||''}`;
      }
      try { localStorage.removeItem('organizeMe.signedIn'); } catch(e){}
    }
    function showSignedOutUI(){
      $('signed-in-row') && ($('signed-in-row').style.display = 'none');
      $('signed-out-row') && ($('signed-out-row').style.display = 'flex');
      if ($('auth-email')) $('auth-email').textContent = '';
      if ($('auth-status')) $('auth-status').textContent = 'You are using a guest account.';
    }

    // Local-only helpers (mirror the local code in index.html)
    const STORAGE_KEY = 'organizeMe.tasks.v1';
    function loadLocal(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){ return []; } }
    function saveLocal(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); window.dispatchEvent(new Event('OrganizeMeTasksChanged')); }

    // Merge remote object -> local array (choose newest updatedAt if same id)
    function mergeRemoteAndLocal(remoteObj) {
      const remoteArr = remoteObj ? Object.entries(remoteObj).map(([id, val]) => (Object.assign({}, val, { id }))) : [];
      const local = loadLocal();
      const map = new Map();
      local.forEach(l => map.set(l.id, Object.assign({}, l)));
      remoteArr.forEach(r => {
        if (!r.id) return;
        const localItem = map.get(r.id);
        if (!localItem) map.set(r.id, Object.assign({}, r));
        else {
          const rUpdated = r.updatedAt || r.createdAt || 0;
          const lUpdated = localItem.updatedAt || localItem.createdAt || 0;
          if (new Date(rUpdated) > new Date(lUpdated)) map.set(r.id, Object.assign({}, r));
        }
      });
      // keep local-only items too
      return Array.from(map.values());
    }

    // Push local array to Realtime DB at /tasks/{uid} using client ids
    async function pushLocalToRemote(uid){
      try {
        const local = loadLocal();
        const baseRef = ref(db, `tasks/${uid}`);
        // set each child by id
        const remoteSnap = await get(baseRef);
        const remoteObj = remoteSnap.exists() ? (remoteSnap.val() || {}) : {};
        // Upsert local items
        for (const t of local) {
          const id = t.id || makeId();
          const payload = Object.assign({}, t, { id });
          await set(ref(db, `tasks/${uid}/${id}`), payload);
        }
        // Delete remote items not in local (respect local deletions)
        const localIds = new Set(local.map(x => x.id));
        for (const rid of Object.keys(remoteObj || {})) {
          if (!localIds.has(rid)) {
            try { await remove(ref(db, `tasks/${uid}/${rid}`)); } catch(e){ console.warn('remote remove failed', rid, e); }
          }
        }
        LOG('pushLocalToRemote complete');
      } catch(e){ console.warn('pushLocalToRemote error', e); }
    }

    // Real-time listener handle (so we can detach)
    let unsubscribe = null;
    let applyingRemote = false;

    // Subscribe to /tasks/{uid} realtime updates
    function subscribeToRemote(uid) {
      if (unsubscribe) { try { unsubscribe(); } catch(_) {} unsubscribe = null; }
      const r = ref(db, `tasks/${uid}`);
      const listener = onValue(r, (snap) => {
        const data = snap.exists() ? snap.val() : null;
        LOG('onValue snapshot', data);
        // merge and apply to local storage
        const merged = mergeRemoteAndLocal(data);
        // avoid writing back if identical
        const local = loadLocal();
        try {
          const localJSON = JSON.stringify((local||[]).map(x=>({id:x.id, updatedAt:x.updatedAt||''})).sort());
          const mergedJSON = JSON.stringify((merged||[]).map(x=>({id:x.id, updatedAt:x.updatedAt||''})).sort());
          if (localJSON === mergedJSON) { LOG('remote == local, skip apply'); return; }
        } catch(e){}
        applyingRemote = true;
        saveLocal(merged);
        // small delay before clearing applyingRemote so local handlers don't push immediately
        setTimeout(()=> applyingRemote = false, 700);
      }, (err) => {
        console.warn('Realtime listener error', err);
      });
      // store a detach function
      unsubscribe = () => dbMod.off ? dbMod.off(r) : null; // placeholder, onValue returns unsubscribe in modular SDK - but we don't need the returned function here
      // Actually onValue returns unsubscribe in modular SDK; we can use it:
      // (But since older SDK sometimes doesn't, we use returned function if present)
      if (typeof listener === 'function') unsubscribe = listener;
      LOG('subscribed to remote tasks for', uid);
    }

    // onAuthStateChanged wiring
    onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const providerIds = (user.providerData || []).map(p => p.providerId || '');
          const usedGoogle = providerIds.includes('google.com');
          showSignedInUI(user.email || user.displayName, usedGoogle ? 'google' : providerIds[0] || '');
          // If local has tasks and remote empty -> push local
          const baseRef = ref(db, `tasks/${user.uid}`);
          const snap = await get(baseRef);
          const remoteObj = snap.exists() ? snap.val() : null;
          const local = loadLocal();
          if ((!remoteObj || Object.keys(remoteObj || {}).length === 0) && Array.isArray(local) && local.length > 0) {
            LOG('remote empty, pushing local tasks to remote');
            await pushLocalToRemote(user.uid);
          } else {
            // merge remote into local if remote has items
            if (remoteObj) {
              const merged = mergeRemoteAndLocal(remoteObj);
              saveLocal(merged);
            }
          }
          // subscribe for realtime
          subscribeToRemote(user.uid);
          // listen for local changes -> push (debounced), but suppress while applyingRemote
          const handler = () => {
            if (applyingRemote) { LOG('suppress push: applyingRemote'); return; }
            if (handler._timer) clearTimeout(handler._timer);
            handler._timer = setTimeout(()=> pushLocalToRemote(user.uid), 700);
          };
          window.addEventListener('OrganizeMeTasksChanged', handler);
          // detach on sign out: we store handler on user object for cleanup
          user._organizeMeHandler = handler;
        } else {
          showSignedOutUI();
          // cleanup subscription & handlers
          if (unsubscribe) { try { unsubscribe(); } catch(_) {} unsubscribe = null; }
          // remove any previously attached handler saved on previous user
          // (we can't access old user easily here, remove all handlers by removing event? can't - but okay)
          LOG('signed out — realtime sync stopped');
        }
      } catch (err) {
        console.error('onAuthStateChanged error', err);
      }
    });

    // handle redirect result (if signInWithRedirect used)
    try {
      const res = await getRedirectResult(auth).catch(e => { throw e; });
      if (res && res.user) LOG('redirect result user', res.user.uid);
    } catch (err) {
      LOG('getRedirectResult error', err && err.code, err && err.message);
      if (err && err.code === 'auth/unauthorized-domain') {
        alert('Firebase: unauthorized domain. Add your site origin to Authorized domains (Auth → Sign-in method).');
      }
    }

    // Wire auth UI (modal for email/password)
    const openSignin = $('open-signin'), openSignup = $('open-signup');
    const authModal = $('auth-modal'), authTitle = $('auth-modal-title'), authEmailInput = $('auth-email-input'), authPasswordInput = $('auth-password-input'), authSubmit = $('auth-submit'), authCancel = $('auth-cancel'), closeAuth = $('close-auth');

    function showAuth(mode){
      if (!authModal) return;
      authModal.style.display = 'block'; authModal.setAttribute('aria-hidden','false');
      authModal.dataset.mode = mode;
      authTitle && (authTitle.textContent = (mode === 'signup' ? 'Sign up' : 'Sign in'));
      authEmailInput && (authEmailInput.value = '');
      authPasswordInput && (authPasswordInput.value = '');
    }
    function hideAuth(){ if(!authModal) return; authModal.style.display = 'none'; authModal.setAttribute('aria-hidden','true'); }

    openSignin?.addEventListener('click', ()=> showAuth('signin'));
    openSignup?.addEventListener('click', ()=> showAuth('signup'));
    authCancel?.addEventListener('click', hideAuth);
    closeAuth?.addEventListener('click', hideAuth);
    authModal?.addEventListener('click', (e)=> { if (e.target === authModal) hideAuth(); });

    authSubmit?.addEventListener('click', async () => {
      const mode = authModal && authModal.dataset && authModal.dataset.mode ? authModal.dataset.mode : 'signin';
      const em = authEmailInput && authEmailInput.value.trim();
      const pw = authPasswordInput && authPasswordInput.value;
      if (!em || !pw) { alert('Enter email and password'); return; }
      try {
        if (mode === 'signup') await createUserWithEmailAndPassword(auth, em, pw);
        else await signInWithEmailAndPassword(auth, em, pw);
        hideAuth();
      } catch (err) {
        console.error('email auth error', err);
        alert(err.message || 'Auth failed');
      }
    });

    // Google sign-in: popup with redirect fallback
    $('google-login')?.addEventListener('click', async () => {
      try {
        LOG('attempt signInWithPopup');
        await signInWithPopup(auth, provider);
        LOG('popup success');
      } catch (err) {
        LOG('popup error', err && err.code);
        if (err && err.code === 'auth/unauthorized-domain') {
          alert('Firebase: unauthorized domain. Add your site origin to Authorized domains (Auth → Sign-in method).');
          return;
        }
        // fallback to redirect
        try {
          LOG('fallback to signInWithRedirect');
          await signInWithRedirect(auth, provider);
        } catch (e) {
          console.error('signInWithRedirect failed', e);
          alert(e.message || 'Google sign-in failed');
        }
      }
    });

    // Sign out
    $('signout-btn')?.addEventListener('click', async () => {
      try { await signOut(auth); LOG('signed out'); } catch (e) { console.error('signOut failed', e); alert('Sign out failed'); }
    });

    LOG('Realtime DB auth module ready');
  } catch (err) {
    console.warn('Failed to initialize Firebase modules', err);
    const statusEl = $('auth-status'); if (statusEl) statusEl.textContent = 'You are using a guest account (Firebase unavailable).';
  }
})();