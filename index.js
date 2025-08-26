// index.js — per-task Firestore storage + realtime sync + migration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBWawjroPfOoWvUz4VKstv8gn3UYVpLgC4",
  authDomain: "jomterryy417-c0c.firebaseapp.com",
  projectId: "jomterryy417-c0c",
  storageBucket: "jomterryy417-c0c.firebasestorage.app",
  messagingSenderId: "993273611189",
  appId: "1:993273611189:web:baba2cdc4ff30682904ffc"
};

const $ = id => document.getElementById(id);
const LOG = (...a) => console.debug('[OrganizeMe]', ...a);

// small helper to compare arrays of tasks (by id & updatedAt) to skip unnecessary updates
function tasksEqualByIdUpdated(a,b){
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const ma = new Map(a.map(t=>[t.id, t.updatedAt || t.createdAt || '']));
  for (const t of b) {
    if (!ma.has(t.id)) return false;
    if (ma.get(t.id) !== (t.updatedAt || t.createdAt || '')) return false;
  }
  return true;
}

(async function main(){
  try {
    const [fbApp, fbAuth, fbFs] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
    ]);
    const { initializeApp } = fbApp;
    const {
      getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult,
      GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut
    } = fbAuth;
    const {
      getFirestore, doc, collection, getDoc, getDocs, setDoc, onSnapshot, addDoc, deleteDoc, updateDoc
    } = fbFs;

    const app = initializeApp(FIREBASE_CONFIG);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const provider = new GoogleAuthProvider();

    const statusEl = $('auth-status');

    function showSignedInUI(email, providerId) {
      $('signed-in-row') && ($('signed-in-row').style.display = 'flex');
      $('signed-out-row') && ($('signed-out-row').style.display = 'none');
      if ($('auth-email')) $('auth-email').textContent = email || '';
      if (statusEl) {
        if (providerId && providerId.includes('google')) statusEl.textContent = `Signed in with Google (${email||''})`;
        else statusEl.textContent = `Signed in as ${email||''}`;
      }
      try { localStorage.removeItem('organizeMe.signedIn'); } catch(e){}
    }
    function showSignedOutUI(){
      $('signed-in-row') && ($('signed-in-row').style.display = 'none');
      $('signed-out-row') && ($('signed-out-row').style.display = 'flex');
      if ($('auth-email')) $('auth-email').textContent = '';
      if (statusEl) statusEl.textContent = 'You are using a guest account.';
    }

    // MIGRATE old array-doc to per-task docs (once)
    async function migrateArrayDocIfExists(uid){
      try {
        const userDocRef = doc(db, 'users', uid);
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) return;
        const data = snap.data() || {};
        if (!Array.isArray(data.tasks) || data.tasks.length === 0) return;
        LOG('Found legacy tasks array — migrating', data.tasks.length);
        const tasks = data.tasks;
        // create per-task docs
        for (const t of tasks){
          const id = t.id || Math.random().toString(36).slice(2,9);
          const docRef = doc(db, 'users', uid, 'tasks', id);
          // ensure createdAt/updatedAt exist
          const payload = Object.assign({}, t, { id, createdAt: t.createdAt || new Date().toISOString(), updatedAt: t.updatedAt || t.createdAt || new Date().toISOString() });
          await setDoc(docRef, payload);
        }
        // mark migrated (optional)
        await setDoc(userDocRef, { migratedAt: new Date().toISOString() }, { merge: true });
        LOG('Migration complete');
      } catch (e) {
        console.warn('Migration failed', e);
      }
    }

    // Push local tasks to per-task docs, and remove remote docs that were deleted locally
    async function pushLocalToRemote(uid){
      if (!window.OrganizeMe || typeof window.OrganizeMe.getTasks !== 'function') { LOG('no local API to push'); return; }
      try {
        const local = window.OrganizeMe.getTasks() || [];
        // upsert local tasks
        for (const t of local){
          if (!t.id) continue;
          const ref = doc(db, 'users', uid, 'tasks', t.id);
          const payload = Object.assign({}, t);
          await setDoc(ref, payload, { merge: true });
        }
        // cleanup remote docs that are not present locally
        const colRef = collection(db, 'users', uid, 'tasks');
        const remoteSnap = await getDocs(colRef);
        const localIds = new Set(local.map(t=>t.id));
        for (const d of remoteSnap.docs){
          if (!localIds.has(d.id)){
            // delete remote doc (user deleted locally)
            try { await deleteDoc(doc(db, 'users', uid, 'tasks', d.id)); }
            catch(e){ console.warn('failed deleting remote orphan', d.id, e); }
          }
        }
        LOG('pushLocalToRemote complete');
      } catch (e){ console.warn('pushLocalToRemote error', e); }
    }

    // Merge remote snapshot into local smartly (prefer newest updatedAt per id)
    let applyingRemote = false;
    function mergeRemoteDocsToLocalAndApply(remoteDocs){
      if (!window.OrganizeMe || typeof window.OrganizeMe.getTasks !== 'function' || typeof window.OrganizeMe.replaceTasks !== 'function') {
        LOG('no local API to merge into'); return;
      }
      const remote = remoteDocs.map(d => d); // already data objects
      const local = window.OrganizeMe.getTasks() || [];
      const map = new Map();
      local.forEach(l => map.set(l.id, Object.assign({}, l)));
      remote.forEach(r => {
        if (!r.id) return;
        const localItem = map.get(r.id);
        if (!localItem) {
          map.set(r.id, Object.assign({}, r));
        } else {
          const rUpdated = r.updatedAt || r.createdAt || '';
          const lUpdated = localItem.updatedAt || localItem.createdAt || '';
          if (new Date(rUpdated) > new Date(lUpdated)) {
            map.set(r.id, Object.assign({}, r));
          }
        }
      });
      const merged = Array.from(map.values());
      if (tasksEqualByIdUpdated(merged, local)) { LOG('Remote merge no-op (equal)'); return; }
      applyingRemote = true;
      try {
        window.OrganizeMe.replaceTasks(merged);
      } catch(e){ console.warn('replaceTasks failed', e); }
      // delay clearing applyingRemote to ensure replaceTasks triggers local save before we push again
      setTimeout(()=>{ applyingRemote = false; }, 600);
      LOG('Applied merged remote -> local, count', merged.length);
    }

    // when signed in: attach snapshot listener to user's tasks collection
    let unsubscribeTasks = null;
    let localChangeHandler = null;

    onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const uid = user.uid;
          const providerIds = (user.providerData || []).map(p=>p.providerId || '');
          const usedGoogle = providerIds.includes('google.com');
          showSignedInUI(user.email || user.displayName, usedGoogle ? 'google' : providerIds[0] || '');
          // migrate if necessary
          await migrateArrayDocIfExists(uid);
          // attach realtime listener
          const colRef = collection(db, 'users', uid, 'tasks');
          if (unsubscribeTasks) unsubscribeTasks();
          unsubscribeTasks = onSnapshot(colRef, (snap) => {
            const docs = snap.docs.map(d => {
              const data = d.data();
              // ensure id present
              data.id = data.id || d.id;
              return data;
            });
            LOG('onSnapshot: got', docs.length, 'docs');
            mergeRemoteDocsToLocalAndApply(docs);
          }, (err) => {
            console.warn('onSnapshot error', err);
          });
          // set up local->remote debounced handler
          if (localChangeHandler) window.removeEventListener('OrganizeMeTasksChanged', localChangeHandler);
          localChangeHandler = () => {
            if (applyingRemote) { LOG('suppress push (applyingRemote)'); return; }
            // debounce push
            if (localChangeHandler._timer) clearTimeout(localChangeHandler._timer);
            localChangeHandler._timer = setTimeout(()=> pushLocalToRemote(uid), 700);
          };
          window.addEventListener('OrganizeMeTasksChanged', localChangeHandler);
          LOG('Sync set up for user', uid);
        } else {
          showSignedOutUI();
          if (unsubscribeTasks) { unsubscribeTasks(); unsubscribeTasks = null; }
          if (localChangeHandler) { window.removeEventListener('OrganizeMeTasksChanged', localChangeHandler); localChangeHandler = null; }
          LOG('Signed out — stopped sync');
        }
      } catch (e) { console.error('onAuthStateChanged handler error', e); }
    });

    // handle redirect result if app returned from redirect sign-in
    try {
      const res = await getRedirectResult(auth).catch(e => { throw e; });
      if (res && res.user) LOG('getRedirectResult user', res.user.uid);
    } catch(e){
      LOG('getRedirectResult error', e && e.code, e && e.message);
      if (e && e.code === 'auth/unauthorized-domain') {
        alert('Firebase: unauthorized domain. Add your site origin to Authorized domains in Firebase Console (Auth → Sign-in method).');
      }
    }

    // wire auth UI
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
      } catch (err) {
        console.error('email auth error', err); alert(err.message || 'Auth failed');
      }
    });

    // Google sign-in: popup -> fallback redirect
    $('google-login')?.addEventListener('click', async () => {
      try {
        LOG('signInWithPopup attempt');
        await signInWithPopup(auth, provider);
        LOG('signInWithPopup success');
      } catch (err) {
        LOG('signInWithPopup error', err && err.code);
        if (err && err.code === 'auth/unauthorized-domain') {
          alert('Firebase: unauthorized domain. Add your site origin to Authorized domains in Firebase Console (Auth → Sign-in method).'); return;
        }
        // fallback to redirect
        try {
          LOG('falling back to signInWithRedirect');
          await signInWithRedirect(auth, provider);
        } catch (e) {
          console.error('signInWithRedirect failed', e); alert(e.message || 'Google sign-in failed');
        }
      }
    });

    // sign out
    $('signout-btn')?.addEventListener('click', async ()=> {
      try { await signOut(auth); LOG('signed out'); } catch(e){ console.error('signOut failed', e); alert('Sign out failed'); }
    });

    LOG('Realtime per-task sync module ready.');
  } catch (err) {
    console.warn('Failed to load firebase modules (index.js). Remote features disabled.', err);
    const statusEl = $('auth-status'); if (statusEl) statusEl.textContent = 'You are using a guest account (Firebase unavailable).';
  }
})();