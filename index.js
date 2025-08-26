// index.js — robust Firebase Google sign-in with popup -> redirect fallback
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

// IMPORTANT: remove the demo local-only sign-in marker so UI won't show a false "signed in" state
try { localStorage.removeItem('organizeMe.signedIn'); } catch(e){}

/* Wrap in IIFE so we can use await at top-level */
(async function main() {
  try {
    const [fbAppMod, fbAuthMod, fbFsMod] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
    ]);
    const { initializeApp } = fbAppMod;
    const {
      getAuth,
      onAuthStateChanged,
      signInWithPopup,
      signInWithRedirect,
      getRedirectResult,
      GoogleAuthProvider,
      createUserWithEmailAndPassword,
      signInWithEmailAndPassword,
      signOut
    } = fbAuthMod;
    const { getFirestore, doc, getDoc, setDoc } = fbFsMod;

    const app = initializeApp(FIREBASE_CONFIG);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    const db = getFirestore(app);

    const statusEl = $('auth-status');

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

    // Firestore sync helpers (same idea as before)
    async function pushLocalToRemote(uid){
      if (!window.OrganizeMe || typeof window.OrganizeMe.getTasks !== 'function') { L('no local API to push'); return; }
      try {
        const tasks = window.OrganizeMe.getTasks() || [];
        const ref = doc(db, 'users', uid);
        await setDoc(ref, { tasks }, { merge: true });
        L('pushed tasks to Firestore', tasks.length);
      } catch (e){ console.warn('pushLocalToRemote failed', e); }
    }
    async function pullRemoteToLocal(uid){
      if (!window.OrganizeMe || typeof window.OrganizeMe.replaceTasks !== 'function') { L('no local API to pull to'); return; }
      try {
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() || {};
          const remoteTasks = Array.isArray(data.tasks) ? data.tasks : [];
          window.OrganizeMe.replaceTasks(remoteTasks);
          L('pulled remote tasks into local', remoteTasks.length);
        } else {
          // Initialize remote with local
          await pushLocalToRemote(uid);
          L('no remote doc; uploaded local');
        }
      } catch (e){ console.warn('pullRemoteToLocal failed', e); }
    }

    // debounce sync
    let syncTimer = null;
    function createSyncHandler(uid){
      return () => {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(()=> pushLocalToRemote(uid), 700);
      };
    }

    // Auth state handling
    let currentSyncHandler = null;
    onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // provider detection
          const pids = (user.providerData || []).map(pd => pd.providerId || '');
          const usedGoogle = pids.includes('google.com');
          showSignedInUI(user.email || user.displayName, usedGoogle ? 'google' : pids[0] || '');
          // sync remote -> local then watch local changes
          await pullRemoteToLocal(user.uid);
          currentSyncHandler = createSyncHandler(user.uid);
          window.addEventListener('OrganizeMeTasksChanged', currentSyncHandler);
          L('onAuthStateChanged: signed in', user.uid, pids);
        } else {
          showSignedOutUI();
          if (currentSyncHandler) {
            window.removeEventListener('OrganizeMeTasksChanged', currentSyncHandler);
            currentSyncHandler = null;
          }
          L('onAuthStateChanged: signed out');
        }
      } catch(err){ console.error('onAuthStateChanged error', err); }
    });

    // Handle redirect result on load (if we previously used signInWithRedirect)
    try {
      const redirectResult = await getRedirectResult(auth);
      if (redirectResult && redirectResult.user) {
        L('getRedirectResult: completed redirect sign-in', redirectResult.user.uid);
        // onAuthStateChanged will run and sync/pull
      } else {
        L('getRedirectResult: no redirect result');
      }
    } catch (err){
      // detect unauthorized domain early
      L('getRedirectResult error', err && err.code, err && err.message);
      if (err && err.code === 'auth/unauthorized-domain') {
        alert('Firebase: unauthorized domain. Add your site origin to Firebase Authorized domains (Auth → Sign-in method).');
      }
    }

    // Wire modal auth (email/password) to Firebase
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
    authModal?.addEventListener('click', e => { if (e.target === authModal) hideAuth(); });

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
      } catch (err) {
        console.error('email auth error', err);
        alert(err.message || 'Authentication failed');
      }
    });

    // Google sign-in: try popup, fallback to redirect on known failures
    $('google-login')?.addEventListener('click', async () => {
      try {
        L('attempting signInWithPopup');
        await signInWithPopup(auth, provider);
        L('signInWithPopup resolved (popup success)');
        // onAuthStateChanged will handle UI
      } catch (err) {
        L('signInWithPopup error', err && err.code, err && err.message);
        // Common fallback cases:
        // - auth/popup-blocked
        // - auth/operation-not-supported-in-this-environment (embedded webviews)
        // - auth/cancelled-popup-request (race)
        // - auth/unauthorized-domain
        if (err && err.code === 'auth/unauthorized-domain') {
          alert('Firebase error: unauthorized domain. Add your site origin to Firebase Authorized domains (Auth → Sign-in method).');
          return;
        }
        // If popup blocked or environment doesn't support popup, fall back to redirect
        if (err && (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment' || err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user')) {
          try {
            L('falling back to signInWithRedirect');
            await signInWithRedirect(auth, provider);
            // The browser will navigate away to Google and then to the firebase handler/redirectUri.
            // After redirect back, the getRedirectResult() above will complete (and onAuthStateChanged will run).
          } catch (e2) {
            console.error('signInWithRedirect failed', e2);
            alert(e2.message || 'Redirect sign-in failed');
          }
        } else {
          // unknown error — show message
          alert(err && err.message ? err.message : 'Google sign-in failed');
        }
      }
    });

    // Sign out
    $('signout-btn')?.addEventListener('click', async () => {
      try {
        await signOut(auth);
        L('signed out');
      } catch (e) {
        console.error('signOut failed', e); alert('Sign out failed: ' + (e && e.message || e));
      }
    });

    L('index.js initialized — Firebase auth ready');
  } catch (err) {
    console.warn('Firebase imports or init failed', err);
    // If Firebase is offline/unavailable, show guest text
    const statusEl = $('auth-status');
    if (statusEl) statusEl.textContent = 'You are using a guest account (Firebase unavailable).';
  }
})();