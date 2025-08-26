// index.js — Firestore realtime sync + merge + auth

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBWawjroPfOoWvUz4VKstv8gn3UYVpLgC4",
  authDomain: "jomterryy417-c0c.firebaseapp.com",
  projectId: "jomterryy417-c0c",
  storageBucket: "jomterryy417-c0c.firebasestorage.app",
  messagingSenderId: "993273611189",
  appId: "1:993273611189:web:baba2cdc4ff30682904ffc"
};

const $ = id => document.getElementById(id);
function L(...args){ console.debug('[OrganizeMe]', ...args); }

(async function init() {
  try {
    const [fbAppMod, fbAuthMod, fbFsMod] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
    ]);

    const { initializeApp } = fbAppMod;
    const {
      getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult,
      GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut
    } = fbAuthMod;
    const { getFirestore, doc, getDoc, setDoc, onSnapshot } = fbFsMod;

    const app = initializeApp(FIREBASE_CONFIG);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const provider = new GoogleAuthProvider();

    const statusEl = $('auth-status');

    function tasksEqual(a,b){
      try {
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        // compare by JSON of sorted ids (cheap)
        const fa = JSON.stringify(a.slice().sort((x,y)=> (x.id||'').localeCompare(y.id||'')));
        const fb = JSON.stringify(b.slice().sort((x,y)=> (x.id||'').localeCompare(y.id||'')));
        return fa === fb;
      } catch(e){ return false; }
    }

    function showSignedInUI(email, providerId){
      $('signed-in-row') && ($('signed-in-row').style.display='flex');
      $('signed-out-row') && ($('signed-out-row').style.display='none');
      if ($('auth-email')) $('auth-email').textContent = email || '';
      if (statusEl) {
        if (providerId && providerId.includes('google')) statusEl.textContent = `Signed in with Google (${email || ''})`;
        else statusEl.textContent = `Signed in as ${email || ''}`;
      }
      try { localStorage.removeItem('organizeMe.signedIn'); } catch(_) {}
    }
    function showSignedOutUI(){
      $('signed-in-row') && ($('signed-in-row').style.display='none');
      $('signed-out-row') && ($('signed-out-row').style.display='flex');
      if ($('auth-email')) $('auth-email').textContent = '';
      if (statusEl) statusEl.textContent = 'You are using a guest account.';
    }

    // Firestore helpers
    async function pushLocalToRemote(uid){
      if (!window.OrganizeMe || typeof window.OrganizeMe.getTasks !== 'function') { L('no local API to push'); return; }
      try {
        const tasks = window.OrganizeMe.getTasks() || [];
        // ensure each item has updatedAt
        tasks.forEach(t => { if (!t.updatedAt) t.updatedAt = new Date().toISOString(); if (!t.createdAt) t.createdAt = new Date().toISOString(); });
        const ref = doc(db, 'users', uid);
        await setDoc(ref, { tasks }, { merge: true });
        L('pushed tasks to Firestore', tasks.length);
      } catch (e) { console.warn('pushLocalToRemote failed', e); }
    }

    async function pullRemoteToLocal(uid){
      if (!window.OrganizeMe || typeof window.OrganizeMe.replaceTasks !== 'function') { L('no local API to pull to'); return; }
      try {
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() || {};
          const remoteTasks = Array.isArray(data.tasks) ? data.tasks : [];
          mergeRemoteIntoLocal(remoteTasks);
          L('pulled remote tasks', remoteTasks.length);
        } else {
          // initialize remote with local
          await pushLocalToRemote(uid);
          L('no remote doc; uploaded local');
        }
      } catch(e){ console.warn('pullRemoteToLocal failed', e); }
    }

    // Merge strategy: keep newest by updatedAt for tasks with same id; add missing tasks.
    function mergeRemoteIntoLocal(remoteTasks){
      if (!window.OrganizeMe || typeof window.OrganizeMe.getTasks !== 'function') return;
      const local = window.OrganizeMe.getTasks() || [];
      // map local by id
      const map = new Map();
      local.forEach(t => map.set(t.id, Object.assign({}, t)));
      // merge remote
      (remoteTasks || []).forEach(rt => {
        if (!rt || !rt.id) return;
        const localItem = map.get(rt.id);
        // normalize timestamps
        const rUpdated = rt.updatedAt || rt.createdAt || 0;
        if (!localItem) {
          map.set(rt.id, Object.assign({}, rt));
        } else {
          const lUpdated = localItem.updatedAt || localItem.createdAt || 0;
          // prefer the newer one
          if (new Date(rUpdated) > new Date(lUpdated)) {
            map.set(rt.id, Object.assign({}, rt));
          } // else keep local
        }
      });
      // also keep any local-only items (already in map)
      const merged = Array.from(map.values());
      // If merged equals current local, skip to avoid loops
      if (tasksEqual(merged, local)) { L('merged == local; skip replace'); return; }
      window.OrganizeMe.replaceTasks(merged);
      L('mergeRemoteIntoLocal completed, merged count', merged.length);
    }

    // Debounced sync handler for local changes
    let syncHandler = null;
    function createSyncHandler(uid){
      return () => {
        if (syncHandler) clearTimeout(syncHandler);
        syncHandler = setTimeout(()=> pushLocalToRemote(uid), 700);
      };
    }

    // Real-time listener unsub
    let unsubscribeUserDoc = null;
    let currentLocalSyncHandler = null;

    // Auth state listener: attach onSnapshot on sign-in, detach on sign-out
    onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const pids = (user.providerData || []).map(pd => pd.providerId || '');
          const usedGoogle = pids.includes('google.com');
          showSignedInUI(user.email || user.displayName, usedGoogle ? 'google' : (pids[0] || ''));
          const uid = user.uid;
          // initial pull & then subscribe
          await pullRemoteToLocal(uid);
          // attach realtime listener
          const ref = doc(db, 'users', uid);
          if (unsubscribeUserDoc) unsubscribeUserDoc();
          unsubscribeUserDoc = onSnapshot(ref, (snap) => {
            if (!snap.exists()) {
              L('snapshot: no doc');
              return;
            }
            const data = snap.data() || {};
            const remoteTasks = Array.isArray(data.tasks) ? data.tasks : [];
            // if remote equals local, skip
            const local = (window.OrganizeMe && window.OrganizeMe.getTasks) ? window.OrganizeMe.getTasks() : [];
            if (tasksEqual(remoteTasks, local)) {
              L('snapshot: remote == local; nothing to do');
              return;
            }
            L('snapshot: remote changed; merging into local');
            mergeRemoteIntoLocal(remoteTasks);
          }, (err) => {
            console.warn('onSnapshot error', err);
          });
          // set up local->remote watcher
          if (currentLocalSyncHandler) {
            window.removeEventListener('OrganizeMeTasksChanged', currentLocalSyncHandler);
            currentLocalSyncHandler = null;
          }
          currentLocalSyncHandler = createSyncHandler(uid);
          window.addEventListener('OrganizeMeTasksChanged', currentLocalSyncHandler);
        } else {
          showSignedOutUI();
          if (unsubscribeUserDoc) { unsubscribeUserDoc(); unsubscribeUserDoc = null; }
          if (currentLocalSyncHandler) { window.removeEventListener('OrganizeMeTasksChanged', currentLocalSyncHandler); currentLocalSyncHandler = null; }
        }
      } catch(err){ console.error('onAuthStateChanged error', err); }
    });

    // handle redirect result (in case of signInWithRedirect)
    try {
      const { getRedirectResult } = fbAuthMod;
      if (typeof getRedirectResult === 'function') {
        const res = await getRedirectResult(auth);
        if (res && res.user) L('redirect result user', res.user.uid);
      }
    } catch(e){ L('getRedirectResult failed', e); }

    // Auth UI wiring (modal)
    const openSignin = $('open-signin'), openSignup = $('open-signup');
    const authModal = $('auth-modal'), authTitle = $('auth-modal-title'), authEmailInput = $('auth-email-input'), authPasswordInput = $('auth-password-input'), authSubmit = $('auth-submit'), authCancel = $('auth-cancel'), closeAuth = $('close-auth');

    function showAuth(mode){
      if (!authModal) return;
      authModal.style.display = 'block'; authModal.setAttribute('aria-hidden','false');
      authModal.dataset.mode = mode;
      if (authTitle) authTitle.textContent = (mode === 'signup' ? 'Sign up' : 'Sign in');
      if (authEmailInput) authEmailInput.value = '';
      if (authPasswordInput) authPasswordInput.value = '';
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
      } catch (err) { console.error('email auth error', err); alert(err.message || 'Auth failed'); }
    });

    // Google sign-in (popup -> fallback redirect)
    $('google-login')?.addEventListener('click', async () => {
      try {
        L('signInWithPopup attempt');
        await signInWithPopup(auth, provider);
      } catch (err) {
        L('signInWithPopup error', err && err.code);
        if (err && err.code === 'auth/unauthorized-domain') {
          alert('Firebase: unauthorized domain. Add your origin to Authorized domains (Auth → Sign-in method).');
          return;
        }
        // fallback to redirect
        try {
          L('falling back to signInWithRedirect');
          await signInWithRedirect(auth, provider);
        } catch (e) {
          console.error('signInWithRedirect failed', e);
          alert(e.message || 'Google sign-in failed');
        }
      }
    });

    // Sign out
    $('signout-btn')?.addEventListener('click', async () => {
      try {
        await signOut(auth);
        L('signed out');
      } catch (e) { console.error('signOut failed', e); alert('Sign out failed'); }
    });

    L('index.js: initialized and ready');
  } catch (err) {
    console.warn('Firebase init/import failed (index.js). Remote features disabled.', err);
    const statusEl = $('auth-status');
    if (statusEl) statusEl.textContent = 'You are using a guest account (Firebase unavailable).';
  }
})();