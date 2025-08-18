// index.js (ES module) - Firebase Auth (email/password) + Firestore sync
// Uses Firebase modular SDK v10.x - non-blocking and defensive

// --- Firebase config (REPLACED WITH YOUR VALUES) ---
const cfg = {
  apiKey: "AIzaSyBWawjroPfOoWvUz4VKstv8gn3UYVpLgC4",
  authDomain: "jomterryy417-c0c.firebaseapp.com",
  projectId: "jomterryy417-c0c",
  storageBucket: "jomterryy417-c0c.firebasestorage.app",
  messagingSenderId: "993273611189",
  appId: "1:993273611189:web:baba2cdc4ff30682904ffc"
};

// --- small DOM helper ---
const $ = id => document.getElementById(id);

// debug helper (safe)
function showDebug(msg) {
  console.debug('[OrganizeMe Firebase]', msg);
}

// --- main init (wrapped to avoid top-level crashes) ---
(async function initFirebase() {
  try {
    // dynamic imports so page still works offline if network blocked
    const fbAppMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const fbAuthMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const fbFsMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    const { initializeApp } = fbAppMod;
    const { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } = fbAuthMod;
    const { getFirestore, doc, getDoc, setDoc } = fbFsMod;

    // initialize Firebase
    let app;
    try {
      app = initializeApp(cfg);
      showDebug(`Firebase initialized (project: ${cfg.projectId || 'unknown'})`);
    } catch (err) {
      console.warn('Firebase initialization failed:', err);
      return;
    }

    const auth = getAuth(app);
    const db = getFirestore(app);

    // --- UI helpers ---
    function showSignedIn(email) {
      try {
        if ($('signed-in-row')) $('signed-in-row').style.display = 'flex';
        if ($('signed-out-row')) $('signed-out-row').style.display = 'none';
        if ($('auth-email')) $('auth-email').textContent = email || '';
        if ($('signin-form')) $('signin-form').style.display = 'none';
        if ($('signup-form')) $('signup-form').style.display = 'none';
      } catch (e) { console.warn('showSignedIn UI update failed', e); }
    }
    function showSignedOut() {
      try {
        if ($('signed-in-row')) $('signed-in-row').style.display = 'none';
        if ($('signed-out-row')) $('signed-out-row').style.display = 'flex';
        if ($('signin-form')) $('signin-form').style.display = 'flex';
        if ($('signup-form')) $('signup-form').style.display = 'none';
        if ($('auth-email')) $('auth-email').textContent = '';
      } catch (e) { console.warn('showSignedOut UI update failed', e); }
    }

    // --- Firestore sync helpers ---
    async function pushLocalToRemote(uid) {
      if (!db || !uid) return;
      try {
        if (!window.OrganizeMe || typeof window.OrganizeMe.getTasks !== 'function') {
          showDebug('No OrganizeMe API found to push tasks.');
          return;
        }
        const tasks = window.OrganizeMe.getTasks() || [];
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, { tasks }, { merge: true });
        showDebug('Uploaded local tasks to Firestore for ' + uid);
      } catch (e) {
        console.warn('pushLocalToRemote failed', e);
      }
    }

    async function pullRemoteToLocal(uid) {
      if (!db || !uid) return;
      try {
        if (!window.OrganizeMe || typeof window.OrganizeMe.replaceTasks !== 'function') {
          showDebug('No OrganizeMe API found to receive tasks.');
          return;
        }
        const userRef = doc(db, 'users', uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() || {};
          const remoteTasks = Array.isArray(data.tasks) ? data.tasks : [];
          window.OrganizeMe.replaceTasks(remoteTasks);
          showDebug('Pulled remote tasks into local for ' + uid);
        } else {
          // no remote doc -> upload local as initial
          await pushLocalToRemote(uid);
          showDebug('No remote doc; uploaded local tasks for ' + uid);
        }
      } catch (e) {
        console.warn('pullRemoteToLocal failed', e);
      }
    }

    // Debounced sync handler factory
    let syncTimer = null;
    function createSyncHandler(uid) {
      return () => {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
          pushLocalToRemote(uid);
        }, 700);
      };
    }

    // --- Auth state handling ---
    let currentSyncHandler = null;
    onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          showSignedIn(user.email);
          await pullRemoteToLocal(user.uid);
          currentSyncHandler = createSyncHandler(user.uid);
          window.addEventListener('OrganizeMeTasksChanged', currentSyncHandler);
          showDebug('User signed in: ' + user.uid);
        } else {
          showSignedOut();
          if (currentSyncHandler) {
            window.removeEventListener('OrganizeMeTasksChanged', currentSyncHandler);
            currentSyncHandler = null;
          }
          showDebug('User signed out');
        }
      } catch (e) {
        console.error('onAuthStateChanged handler error', e);
      }
    });

    // --- DOM wiring for email/password flows ---
    try {
      const signinBtn = $('signin-btn');
      const signupBtn = $('signup-btn');
      const signoutBtn = $('signout-btn');
      const toSignup = $('to-signup');
      const toSignin = $('to-signin');

      if (signinBtn) {
        signinBtn.addEventListener('click', async () => {
          try {
            const em = ($('signin-email') && $('signin-email').value.trim()) || '';
            const pw = ($('signin-password') && $('signin-password').value) || '';
            if (!em || !pw) return alert('Enter email and password');
            await signInWithEmailAndPassword(auth, em, pw);
          } catch (err) {
            console.error('Sign-in error', err);
            alert(err.message || 'Sign-in failed');
          }
        });
      }

      if (signupBtn) {
        signupBtn.addEventListener('click', async () => {
          try {
            const em = ($('signup-email') && $('signup-email').value.trim()) || '';
            const p1 = ($('signup-password') && $('signup-password').value) || '';
            const p2 = ($('signup-confirm') && $('signup-confirm').value) || '';
            if (!em || !p1) return alert('Enter email and password');
            if (p1 !== p2) return alert('Passwords do not match');
            await createUserWithEmailAndPassword(auth, em, p1);
          } catch (err) {
            console.error('Sign-up error', err);
            alert(err.message || 'Sign-up failed');
          }
        });
      }

      if (signoutBtn) {
        signoutBtn.addEventListener('click', async () => {
          try {
            await signOut(auth);
          } catch (err) {
            console.error('Sign-out error', err);
            alert(err.message || 'Sign-out failed');
          }
        });
      }

      if (toSignup) toSignup.addEventListener('click', () => {
        if ($('signin-form')) $('signin-form').style.display = 'none';
        if ($('signup-form')) $('signup-form').style.display = 'flex';
      });
      if (toSignin) toSignin.addEventListener('click', () => {
        if ($('signup-form')) $('signup-form').style.display = 'none';
        if ($('signin-form')) $('signin-form').style.display = 'flex';
      });
    } catch (e) {
      console.warn('DOM wiring for auth failed', e);
    }

    showDebug('Firebase auth+firestore module loaded');
  } catch (err) {
    console.warn('Firebase module load failed (index.js). Remote features disabled.', err);
    // local fallback remains functional
  }
})();