// index.js — Realtime Database sync + Auth (email/password + Google popup/redirect)
// IMPORTANT: databaseURL points to your project's Realtime Database.

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBWawjroPfOoWvUz4VKstv8gn3UYVpLgC4",
  authDomain: "jomterryy417-c0c.firebaseapp.com",
  databaseURL: "https://jomterryy417-c0c-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "jomterryy417-c0c",
  storageBucket: "jomterryy417-c0c.firebasestorage.app",
  messagingSenderId: "993273611189",
  appId: "1:993273611189:web:baba2cdc4ff30682904ffc"
};

const $ = id => document.getElementById(id);
const LOG = (...args) => console.debug('[OrganizeMe]', ...args);
const WARN = (...args) => console.warn('[OrganizeMe]', ...args);
const ERR = (...args) => console.error('[OrganizeMe]', ...args);

function makeId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

(async function init() {
  try {
    // load modular SDKs
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

    // Initialize Firebase app (databaseURL must be present in config)
    const app = initializeApp(FIREBASE_CONFIG);
    const auth = getAuth(app);
    const db = getDatabase(app);
    const provider = new GoogleAuthProvider();

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

    // Local storage helpers (mirror index.html behavior)
    const STORAGE_KEY = 'organizeMe.tasks.v1';
    function loadLocal(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){ return []; } }
    function saveLocal(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); window.dispatchEvent(new Event('OrganizeMeTasksChanged')); }

    // Merge remote object into local array, preferring newest updatedAt
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
      return Array.from(map.values());
    }

    // Push local array to Realtime DB at /tasks/{uid}
    async function pushLocalToRemote(uid){
      try {
        const local = loadLocal();
        const baseRef = ref(db, `tasks/${uid}`);
        const remoteSnap = await get(baseRef);
        const remoteObj = remoteSnap.exists() ? remoteSnap.val() : {};
        // Upsert local items
        for (const t of local) {
          const id = t.id || makeId();
          const payload = Object.assign({}, t, { id });
          await set(ref(db, `tasks/${uid}/${id}`), payload);
        }
        // Delete remote items not in local
        const localIds = new Set(local.map(x => x.id));
        for (const rid of Object.keys(remoteObj || {})) {
          if (!localIds.has(rid)) {
            try { await remove(ref(db, `tasks/${uid}/${rid}`)); } catch(e){ WARN('remote remove failed', rid, e); }
          }
        }
        LOG('pushLocalToRemote complete');
      } catch(e){ ERR('pushLocalToRemote error', e); }
    }

    // subscribe/unsubscribe housekeeping
    let unsubscribeRemote = null;
    let applyingRemote = false;

    function subscribeToRemote(uid) {
      if (unsubscribeRemote) { try { unsubscribeRemote(); } catch(e){ WARN('unsubscribeRemote failed', e); } unsubscribeRemote = null; }
      const r = ref(db, `tasks/${uid}`);
      const off = onValue(r, (snap) => {
        const data = snap.exists() ? snap.val() : null;
        LOG('onValue snapshot:', data);
        const merged = mergeRemoteAndLocal(data);
        // quick equality check by ids+updatedAt
        const local = loadLocal();
        try {
          const localJSON = JSON.stringify((local||[]).map(x=>({id:x.id, updatedAt:x.updatedAt||''})).sort());
          const mergedJSON = JSON.stringify((merged||[]).map(x=>({id:x.id, updatedAt:x.updatedAt||''})).sort());
          if (localJSON === mergedJSON) { LOG('remote == local — no apply'); return; }
        } catch(e){}
        applyingRemote = true;
        saveLocal(merged);
        setTimeout(()=> applyingRemote = false, 700);
      }, (err) => {
        ERR('Realtime onValue error', err);
        if (err && err.code === 'permission-denied') alert('Realtime DB permission denied — check your rules.');
      });
      // onValue returns an unsubscribe function in the modular SDK
      if (typeof off === 'function') unsubscribeRemote = off;
      LOG('Subscribed to /tasks/' + uid);
    }

    // Auth state changes
    onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const providerIds = (user.providerData || []).map(p => p.providerId || '');
          const usedGoogle = providerIds.includes('google.com');
          LOG('Signed in', user.uid, user.email, providerIds);
          showSignedInUI(user.email || user.displayName, usedGoogle ? 'google' : providerIds[0] || '');
          // Merge/push logic: if remote empty and local has data, push local
          const baseRef = ref(db, `tasks/${user.uid}`);
          const snap = await get(baseRef);
          const remoteObj = snap.exists() ? snap.val() : null;
          const local = loadLocal();
          if ((!remoteObj || Object.keys(remoteObj || {}).length === 0) && Array.isArray(local) && local.length > 0) {
            LOG('Remote empty, pushing local tasks to remote');
            await pushLocalToRemote(user.uid);
          } else {
            if (remoteObj) {
              const merged = mergeRemoteAndLocal(remoteObj);
              saveLocal(merged);
            }
          }
          subscribeToRemote(user.uid);

          // local -> remote debounced
          const handler = () => {
            if (applyingRemote) { LOG('suppress push (applyingRemote)'); return; }
            if (handler._timer) clearTimeout(handler._timer);
            handler._timer = setTimeout(()=> pushLocalToRemote(user.uid), 700);
          };
          window.addEventListener('OrganizeMeTasksChanged', handler);
          // store reference to remove later if needed
          user._organizeMeHandler = handler;
        } else {
          LOG('Signed out');
          showSignedOutUI();
          // cleanup
          if (unsubscribeRemote) { try { unsubscribeRemote(); } catch(e){ WARN('unsubscribeRemote failed', e);} unsubscribeRemote = null; }
          // remove window handler if attached to previous user
          // Note: if handler stored on previous user object it's already out of scope; safe to ignore here
        }
      } catch (err) {
        ERR('onAuthStateChanged error', err);
      }
    });

    // Check redirect result (if using redirect sign-in)
    try {
      const res = await getRedirectResult(auth).catch(e => { throw e; });
      if (res && res.user) LOG('getRedirectResult user', res.user.uid);
    } catch(e) {
      WARN('getRedirectResult error', e && e.code, e && e.message);
      if (e && e.code === 'auth/unauthorized-domain') {
        alert('Firebase: unauthorized domain. Add your site origin to Authorized domains in Firebase Console (Auth → Sign-in method).');
      }
    }

    // Wire UI modal and auth actions (email/password)
    const openSignin = $('open-signin'), openSignup = $('open-signup');
    const authModal = $('auth-modal'), authTitle = $('auth-modal-title'), authEmailInput = $('auth-email-input'), authPasswordInput = $('auth-password-input'), authSubmit = $('auth-submit'), authCancel = $('auth-cancel'), closeAuth = $('close-auth');

    function showAuth(mode){
      if (!authModal) return;
      authModal.style.display = 'block'; authModal.setAttribute('aria-hidden','false');
      authModal.dataset.mode = mode;
      if (authTitle) authTitle.textContent = mode === 'signup' ? 'Sign up' : 'Sign in';
    }
    function hideAuth(){ if (!authModal) return; authModal.style.display = 'none'; authModal.setAttribute('aria-hidden','true'); }

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
        ERR('email auth error', err);
        alert(err.message || 'Auth failed');
      }
    });

    // Google sign-in (popup, fallback to redirect)
    $('google-login')?.addEventListener('click', async () => {
      try {
        LOG('Attempting signInWithPopup');
        await signInWithPopup(auth, provider);
        LOG('signInWithPopup success');
      } catch (err) {
        LOG('signInWithPopup failed', err && err.code);
        if (err && err.code === 'auth/unauthorized-domain') {
          alert('Firebase: unauthorized domain. Add your site origin to Authorized domains in Firebase Console (Auth → Sign-in method).');
          return;
        }
        try {
          LOG('Falling back to signInWithRedirect');
          await signInWithRedirect(auth, provider);
        } catch (e) {
          ERR('signInWithRedirect failed', e);
          alert(e.message || 'Google sign-in failed');
        }
      }
    });

    // sign out
    $('signout-btn')?.addEventListener('click', async ()=> {
      try { await signOut(auth); LOG('Signed out'); } catch(e){ ERR('signOut failed', e); alert('Sign out failed'); }
    });

    LOG('Realtime DB auth module initialized.');
  } catch (err) {
    ERR('Failed to initialize Firebase modules', err);
    const statusEl = $('auth-status'); if (statusEl) statusEl.textContent = 'You are using a guest account (Firebase unavailable).';
  }
})();