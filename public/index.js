// index.js — Auth wiring for OrganizeMe web
(function(){
  const cfg = (window.FIREBASE_CONFIG || {});
  if (!cfg.apiKey) {
    console.warn('[Auth] Missing FIREBASE_CONFIG. Authentication will not work.');
    return;
  }

  // Load Firebase via ESM dynamic import
  const appPromise = (async () => {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    return initializeApp(cfg);
  })();

  const authPromise = (async () => {
    const [app, authMod] = await Promise.all([
      appPromise,
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
    ]);
    const { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } = authMod;
    const auth = getAuth(app);

    const $ = (id) => document.getElementById(id);
    const ui = window.__authUI || {};

    function showSignedIn(email){
      $('signed-in-row').style.display='flex';
      $('signed-out-row').style.display='none';
      $('auth-email').textContent = email || '';
      ui.closeModal && ui.closeModal();
    }
    function showSignedOut(){
      $('signed-in-row').style.display='none';
      $('signed-out-row').style.display='flex';
    }

    onAuthStateChanged(auth, (u)=>{ if(u) showSignedIn(u.email); else showSignedOut(); });

    // Bind buttons (idempotent)
    if (!window.__authHandlersBound) {
      window.__authHandlersBound = true;

      $('modal-signin-btn').addEventListener('click', async (e)=>{
        e.preventDefault();
        try {
          const email = $('modal-signin-email').value.trim();
          const pwd = $('modal-signin-password').value;
          await signInWithEmailAndPassword(auth, email, pwd);
        } catch (err) {
          alert((err && err.message) || 'Sign-in failed');
        }
      });

      $('modal-signup-btn').addEventListener('click', async (e)=>{
        e.preventDefault();
        try {
          const email = $('modal-signup-email').value.trim();
          const p1 = $('modal-signup-password').value;
          const p2 = $('modal-signup-confirm').value;
          if (p1 !== p2) return alert('Passwords do not match');
          await createUserWithEmailAndPassword(auth, email, p1);
        } catch (err) {
          alert((err && err.message) || 'Sign-up failed');
        }
      });

      $('google-btn').addEventListener('click', async ()=>{
        try {
          const provider = new GoogleAuthProvider();
          await signInWithPopup(auth, provider);
        } catch (err) {
          alert((err && err.message) || 'Google sign-in failed');
        }
      });

      $('signout-btn').addEventListener('click', async ()=>{
        try { await signOut(auth); } catch (err) { alert((err && err.message) || 'Sign-out failed'); }
      });
    }

    return auth;
  })();
})();