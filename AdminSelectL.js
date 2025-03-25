// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.19.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.19.1/firebase-auth.js";


// Firebase Configuration and Initialization
const firebaseConfig = {
  apiKey: "AIzaSyBsfV19SLzcVelg5Z5bjp3h1EJiStFLeoI",
  authDomain: "ecowarrior-app-1.firebaseapp.com",
  projectId: "ecowarrior-app-1",
  storageBucket: "ecowarrior-app-1.appspot.com",
  messagingSenderId: "204162169811",
  appId: "1:204162169811:web:3c78268b4add17159c0d26",
  measurementId: "G-66HRM9N0KY",
};

const app = initializeApp(firebaseConfig); // Initializes the Firebase app
const auth = getAuth(app); // Initializes Firebase Authentication

// Add event listener for login form submission
document
  .getElementById("admin-login-form")
  .addEventListener("submit", function (e) {
    e.preventDefault(); // Prevent default form submission

    const email = document.getElementById("admin-login-email").value;
    const password = document.getElementById("admin-login-password").value;

    // Sign in using Firebase Authentication
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Redirect to the admin dashboard upon success
        window.location.href = "adminDashboard.html";
      })
      .catch((error) => {
        console.error("Error logging in: ", error);
        alert("Login failed. Please check your credentials and try again.");
      });
  });
