// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAhl63E8726pIofdFIFivXFktCZasdTShQ",
  authDomain: "ecowarrior-app.firebaseapp.com",
  projectId: "ecowarrior-app",
  storageBucket: "ecowarrior-app.firebasestorage.app",
  messagingSenderId: "18277438577",
  appId: "1:18277438577:web:76a10c2281f85f896db7d0",
  measurementId: "G-CTKKXW5F1Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
