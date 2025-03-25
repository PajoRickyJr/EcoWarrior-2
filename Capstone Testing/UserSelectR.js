// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBsfV19SLzcVelg5Z5bjp3h1EJiStFLeoI",
  authDomain: "ecowarrior-app-1.firebaseapp.com",
  projectId: "ecowarrior-app-1",
  storageBucket: "ecowarrior-app-1.appspot.com",
  messagingSenderId: "204162169811",
  appId: "1:204162169811:web:3c78268b4add17159c0d26",
  measurementId: "G-66HRM9N0KY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('ecowarriorForm');
  const nameUser = document.getElementById('nameUser');
  const confirmCheckbox = document.getElementById('confirmEcowarrior');
  const ecowarriorID = document.getElementById('ecowarriorID');
  const generatedID = document.getElementById('generatedID');
  const loadingSpinner = document.getElementById('loadingSpinner');

  // Check if localStorage is available
  const isLocalStorageAvailable = () => {
    try {
      const testKey = 'test';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  };

  if (!isLocalStorageAvailable()) {
    showMessage('Your browser does not support localStorage. Please enable it to use this app.', 'error');
  }

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent form submission

    // Validate form inputs
    if (!nameUser.value.trim()) {
      showMessage('Please enter your name.', 'error');
      return;
    }

    if (!confirmCheckbox.checked) {
      showMessage('Please confirm your commitment to become an EcoWarrior.', 'error');
      return;
    }

    // Show loading spinner
    loadingSpinner.classList.remove('hidden');

    // Generate a unique EcoWarrior ID
    const uniqueID = `EW-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    try {
      // Add a new document with a generated ID
      const docRef = await addDoc(collection(db, "ecoWarriors"), {
        name: nameUser.value.trim(),
        ecoWarriorID: uniqueID
      });

      console.log("Document written with ID: ", docRef.id);

      // Display the ID
      generatedID.textContent = uniqueID;
      ecowarriorID.classList.remove('hidden');

      // Store the nameUser in localStorage
      localStorage.setItem('nameUser', nameUser.value.trim());

      // Store the ID in localStorage
      localStorage.setItem('ecowarriorID', uniqueID);

      // Show success message
      showMessage(`Thank you, ${nameUser.value.trim()}! You are now part of the EcoWarrior community.`, 'success');

      // Hide loading spinner
      loadingSpinner.classList.add('hidden');

      // Redirect to the mainboard page after 3 seconds
      setTimeout(() => {
        window.location.href = 'userContent.html';
      }, 3000);
    } catch (e) {
      console.error("Error adding document: ", e);
      showMessage('Error adding document. Please try again.', 'error');
      loadingSpinner.classList.add('hidden');
    }
  });

  // Function to generate a unique EcoWarrior ID
  const generateEcoWarriorID = () => {
    return `EW-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  };

  // Function to show messages
  const showMessage = (message, type) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    form.prepend(messageDiv);

    // Remove the message after 4 seconds
    setTimeout(() => {
      messageDiv.remove();
    }, 4000);
  };
});
