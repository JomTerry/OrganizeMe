// index.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBWawjroPfOoWvUz4VKstv8gn3UYVpLgC4",
  authDomain: "jomterryy417-c0c.firebaseapp.com",
  projectId: "jomterryy417-c0c",
  storageBucket: "jomterryy417-c0c.firebasestorage.app",
  messagingSenderId: "993273611189",
  appId: "1:993273611189:web:baba2cdc4ff30682904ffc"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// UI Elements
const signupBtn = document.getElementById("signup");
const signinBtn = document.getElementById("signin");
const googleBtn = document.getElementById("google-login");

// Sign Up (Email/Password prompt)
signupBtn?.addEventListener("click", async () => {
  const email = prompt("Enter email:");
  const password = prompt("Enter password:");
  if (!email || !password) return;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Account created & signed in!");
  } catch (err) {
    alert(err.message);
  }
});

// Sign In (Email/Password prompt)
signinBtn?.addEventListener("click", async () => {
  const email = prompt("Enter email:");
  const password = prompt("Enter password:");
  if (!email || !password) return;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Signed in successfully!");
  } catch (err) {
    alert(err.message);
  }
});

// Google Sign-In
googleBtn?.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
    alert("Signed in with Google!");
  } catch (err) {
    alert(err.message);
  }
});

// Track Auth State
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User signed in:", user.email || user.displayName);
  } else {
    console.log("No user signed in.");
  }
});

// Optional Sign Out
// signOut(auth);