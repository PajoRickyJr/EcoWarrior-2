// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBsfV19SLzcVelg5Z5bjp3h1EJiStFLeoI",
  authDomain: "ecowarrior-app-1.firebaseapp.com",
  projectId: "ecowarrior-app-1",
  storageBucket: "ecowarrior-app-1",
  messagingSenderId: "204162169811",
  appId: "1:204162169811:web:3c78268b4add17159c0d26",
  measurementId: "G-66HRM9N0KY",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
  const notif = document.getElementById("notif");
  const form = document.getElementById("ecowarriorForm");
  const nameInput = document.getElementById("nameUser");
  const confirmEcowarrior = document.getElementById("confirmEcowarrior");
  const loadingSpinner = document.getElementById("loadingSpinner");

  // Check if the notif element exists
  console.log("Notification element:", notif);
  if (!notif) {
    console.error("Notification element not found.");
    return;
  }

  // Function to show notification
  function showNotification(message, type = "error") {
    if (!notif) return;

    notif.textContent = message;
    notif.className = `${type}`; // Set the class to the type ("error" or "success")
    notif.style.display = "block"; // Ensure it's visible

    setTimeout(() => {
      notif.style.display = "none"; // Hide it after 3 seconds
    }, 3000);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    if (!name) {
      showNotification("Please enter your name.");
      return;
    }

    if (!confirmEcowarrior.checked) {
      showNotification("Please confirm your commitment to become an EcoWarrior.");
      return;
    }

    const uniqueID = `EW-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    try {
      // Show loading spinner
      loadingSpinner.classList.remove("hidden");

      // Store user in Firestore
      await setDoc(doc(db, "EcoWarriors", uniqueID), {
        name,
        ecoWarriorID: uniqueID,
        registrationDate: serverTimestamp(),
      });

      // Store user info in localStorage
      localStorage.setItem("nameUser", name);
      localStorage.setItem("ecoWarriorID", uniqueID);

      // Hide loading spinner
      loadingSpinner.classList.add("hidden");

      // Show success notification
      showNotification(`Welcome, ${name}! Your EcoWarrior ID is ${uniqueID}.`, "success");

      // Redirect to UserContent.html after a short delay
      setTimeout(() => {
        window.location.href = "UserContent.html";
      }, 2000);
    } catch (error) {
      console.error("Error registering user:", error);

      // Hide loading spinner
      loadingSpinner.classList.add("hidden");

      // Show error notification
      showNotification("An error occurred while registering. Please try again.");
    }
  });
});
