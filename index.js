// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBWawjroPfOoWvUz4VKstv8gn3UYVpLgC4",
  authDomain: "jomterryy417-c0c.firebaseapp.com",
  projectId: "jomterryy417-c0c",
  storageBucket: "jomterryy417-c0c.firebasestorage.app",
  messagingSenderId: "993273611189",
  appId: "1:993273611189:web:baba2cdc4ff30682904ffc"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Elements
const signupBtn = document.getElementById('signupBtn');
const loginBtn = document.getElementById('loginBtn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const message = document.getElementById('message');

signupBtn.addEventListener('click', () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  auth.createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
      message.textContent = "Signup successful!";
      console.log("User signed up:", userCredential.user);
    })
    .catch(error => {
      message.textContent = error.message;
    });
});

loginBtn.addEventListener('click', () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  auth.signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      message.textContent = "Login successful!";
      console.log("User logged in:", userCredential.user);
    })
    .catch(error => {
      message.textContent = error.message;
    });
});
