// Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyBWawjroPfOoWvUz4VKstv8gn3UYVpLgC4",
  authDomain: "jomterryy417-c0c.firebaseapp.com",
  projectId: "jomterryy417-c0c",
  storageBucket: "jomterryy417-c0c.firebasestorage.app",
  messagingSenderId: "993273611189",
  appId: "1:993273611189:web:baba2cdc4ff30682904ffc"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// --- DOM Elements ---
const signupBtn = document.getElementById("signup-btn");
const signinBtn = document.getElementById("signin-btn");
const signoutBtn = document.getElementById("signout-btn");
const googleBtn = document.getElementById("google-btn"); // add this to your HTML
const emailField = document.getElementById("email");
const passwordField = document.getElementById("password");

// --- Sign Up ---
if (signupBtn) {
  signupBtn.addEventListener("click", () => {
    const email = emailField.value;
    const password = passwordField.value;
    createUserWithEmailAndPassword(auth, email, password)
      .then(userCredential => {
        alert("✅ Account created for " + userCredential.user.email);
      })
      .catch(err => alert("⚠️ " + err.message));
  });
}

// --- Sign In ---
if (signinBtn) {
  signinBtn.addEventListener("click", () => {
    const email = emailField.value;
    const password = passwordField.value;
    signInWithEmailAndPassword(auth, email, password)
      .then(userCredential => {
        alert("✅ Signed in as " + userCredential.user.email);
      })
      .catch(err => alert("⚠️ " + err.message));
  });
}

// --- Sign Out ---
if (signoutBtn) {
  signoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
      alert("👋 Signed out");
    });
  });
}

// --- Google Sign In ---
if (googleBtn) {
  googleBtn.addEventListener("click", () => {
    signInWithPopup(auth, provider)
      .then(result => {
        alert("✅ Signed in with Google as " + result.user.displayName);
      })
      .catch(err => alert("⚠️ " + err.message));
  });
}

// --- Auth State Listener ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User signed in:", user.email);
    // TODO: load user’s tasks from Firebase later
  } else {
    console.log("No user signed in");
    // TODO: fallback to localStorage tasks
  }
});