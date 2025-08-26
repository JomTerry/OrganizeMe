// index.js (ES module) — Firebase Auth + Google + Firestore sync
// Uses modular Firebase from CDN. Make sure this file sits next to index.html.

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBWawjroPfOoWvUz4VKstv8gn3UYVpLgC4",
  authDomain: "jomterryy417-c0c.firebaseapp.com",
  projectId: "jomterryy417-c0c",
  storageBucket: "jomterryy417-c0c.firebasestorage.app",
  messagingSenderId: "993273611189",
  appId: "1:993273611189:web:baba2cdc4ff30682904ffc"
};

const $ = id => document.getElementById(id);
function log(...args){ console.debug('[OrganizeMe]', ...args); }

(async function init() {
  try {
    // dynamic imports
    const [fbAppMod, fbAuthMod, fbFsMod] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
    ]);

    const { initializeApp } = fbAppMod;
    const { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } = fbAuthMod;
    const { getFirestore, doc, getDoc, setDoc } = fbFsMod;

    const app = initializeApp(FIREBASE_CONFIG);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const provider = new GoogleAuthProvider();

    const statusEl = $('auth-status');

    // UI toggles
    function showSignedInUI(email, providerId) {
      $('signed-in-row') && ($('signed-in-row').style.display = 'flex');
      $('signed-out-row') && ($('signed-out-row').style.display = 'none');
      if ($('auth-email')) $('auth-email').textContent = email || '';
      if (statusEl) {
        if (providerId && providerId.includes('google')) statusEl.textContent = `Signed in with Google (${email || ''})`;
        else statusEl.textContent = `Signed in as ${email || ''}`;
      }
      try { localStorage.removeItem('organizeMe.signedIn'); } catch(_) {}
    }
    function showSignedOutUI() {
      $('signed-in-row') && ($('signed-in-row').style.display = 'none');
      $('signed-out-row') && ($('signed-out-row').style.display = 'flex');
      if ($('auth-email')) $('auth-email').textContent = '';
      if (statusEl) statusEl.textContent = 'You are using a guest account.';
    }

    // Firestore helpers
    async function pushLocalToRemote(uid) {
      if (!window.OrganizeMe || typeof window.OrganizeMe.getTasks !== 'function') { log('No local API to push'); return; }
      try {
        const tasks = window.OrganizeMe.getTasks() || [];
        const ref = doc(db, 'users', uid);
        await setDoc(ref, { tasks }, { merge: true });
        log('pushed tasks', tasks.length);
      } catch (e) { console.warn('pushLocalToRemote failed', e); }
    }
    async function pullRemoteToLocal(uid) {
      if (!window.OrganizeMe || typeof window.OrganizeMe.replaceTasks !== 'function') { log('No local API to pull to'); return; }
      try {
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() || {};
          const remoteTasks = Array.isArray(data.tasks) ? data.tasks : [];
          window.OrganizeMe.replaceTasks(remoteTasks);
          log('pulled remote tasks', remoteTasks.length);
        } else {
          await pushLocalToRemote(uid);
          log('no remote doc; uploaded local');
        }
      } catch (e) { console.warn('pullRemoteToLocal failed', e); }
    }

    // Debounced sync
    let syncTimer = null;
    function createSyncHandler(uid) {
      return () => {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(() => pushLocalToRemote(uid), 800);
      };
    }

    // Auth state listener
    let currentSyncHandler = null;
    onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const pids = (user.providerData || []).map(pd => pd.providerId || '');
          const usedGoogle = pids.includes('google.com');
          showSignedInUI(user.email || user.displayName, usedGoogle ? 'google' : (pids[0] || ''));
          await pullRemoteToLocal(user.uid);
          currentSyncHandler = createSyncHandler(user.uid);
          window.addEventListener('OrganizeMeTasksChanged', currentSyncHandler);
        } else {
          showSignedOutUI();
          if (currentSyncHandler) {
            window.removeEventListener('OrganizeMeTasksChanged', currentSyncHandler);
            currentSyncHandler = null;
          }
        }
      } catch (err) { console.error('onAuthStateChanged error', err); }
    });

    // Modal and auth UI wiring (email/password)
    const openSignin = $('open-signin'), openSignup = $('open-signup');
    const authModal = $('auth-modal'), authTitle = $('auth-modal-title'), authEmailInput = $('auth-email-input'), authPasswordInput = $('auth-password-input'), authSubmit = $('auth-submit'), authCancel = $('auth-cancel'), closeAuth = $('close-auth');

    function showAuth(mode) {
      if (!authModal) return;
      authModal.style.display = 'block'; authModal.setAttribute('aria-hidden','false');
      authModal.dataset.mode = mode;
      if (authTitle) authTitle.textContent = (mode === 'signup' ? 'Sign up' : 'Sign in');
      if (authEmailInput) authEmailInput.value = '';
      if (authPasswordInput) authPasswordInput.value = '';
    }
    function hideAuth() { if (!authModal) return; authModal.style.display = 'none'; authModal.setAttribute('aria-hidden','true'); }

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
        if (mode === 'signup') {
          await createUserWithEmailAndPassword(auth, em, pw);
        } else {
          await signInWithEmailAndPassword(auth, em, pw);
        }
        hideAuth();
      } catch (err) { console.error('auth error', err); alert(err.message || 'Auth failed'); }
    });

    // Google sign-in button
    $('google-login')?.addEventListener('click', async () => {
      try {
        await signInWithPopup(auth, provider);
        // onAuthStateChanged handles the rest
      } catch (err) {
        console.error('Google sign-in error', err);
        alert(err.message || 'Google sign-in failed');
      }
    });

    // Sign out
    $('signout-btn')?.addEventListener('click', async () => {
      try { await signOut(auth); } catch (e) { console.error('signout failed', e); alert('Sign out failed'); }
    });

    log('Firebase auth module loaded');
  } catch (err) {
    console.warn('Firebase module load failed (index.js). Remote features disabled.', err);
    const statusEl = $('auth-status');
    if (statusEl) statusEl.textContent = 'You are using a guest account (offline / Firebase unavailable).';
  }
})();