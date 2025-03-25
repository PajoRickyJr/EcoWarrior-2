import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Firebase configuration
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
const auth = getAuth(app);

// Logout functionality
document.getElementById("logoutButton").addEventListener("click", () => {
  signOut(auth)
    .then(() => {
      window.location.href = "AdminSelectL.html";
    })
    .catch((error) => {
      console.error("Error logging out: ", error);
    });
});

// -------------------
// Tab Navigation
// -------------------
const tabButtons = document.querySelectorAll(".tab-nav button");
const tabSections = document.querySelectorAll(".tab-section");
tabButtons.forEach(btn => {
  btn.addEventListener("click", function () {
    tabButtons.forEach(btn => btn.classList.remove("active"));
    btn.classList.add("active");
    tabSections.forEach(section => section.classList.remove("active"));
    const targetTab = btn.getAttribute("data-tab");
    const activeSection = document.getElementById(targetTab);
    if (activeSection) {
      activeSection.classList.add("active");
    }
  });
});

// -------------------
// User Data Section (Unchanged)
// -------------------
const userTableBody = document
  .getElementById("userTable")
  .getElementsByTagName("tbody")[0];
const ecoWarriorsRef = collection(db, "ecoWarriors");
getDocs(ecoWarriorsRef)
  .then((querySnapshot) => {
    console.log(`Retrieved ${querySnapshot.size} user document(s).`);
    if (
      querySnapshot.size > 0 &&
      userTableBody.rows[0] &&
      userTableBody.rows[0].cells[0].textContent === "No user data available"
    ) {
      userTableBody.deleteRow(0);
    }
    querySnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      console.log("User doc:", userDoc.id, userData);
      const row = userTableBody.insertRow();
      row.insertCell(0).textContent = userData.name || "No name";
      row.insertCell(1).textContent = userData.ecoWarriorID || "No ID";
      if (userData.registrationDate && userData.registrationDate.seconds) {
        row.insertCell(2).textContent = new Date(
          userData.registrationDate.seconds * 1000
        ).toLocaleDateString();
      } else {
        row.insertCell(2).textContent = "N/A";
      }
    });
  })
  .catch((error) => {
    console.error("Error fetching user data: ", error);
  });

// -------------------
// Feedback Data Section (Unchanged)
// -------------------
const feedbackTableBody = document
  .getElementById("feedbackTable")
  .getElementsByTagName("tbody")[0];
const feedbackRef = collection(db, "userFeedback");
getDocs(feedbackRef)
  .then((querySnapshot) => {
    console.log(`Retrieved ${querySnapshot.size} feedback document(s).`);
    if (
      querySnapshot.size > 0 &&
      feedbackTableBody.rows[0] &&
      feedbackTableBody.rows[0].cells[0].textContent === "No feedback available"
    ) {
      feedbackTableBody.deleteRow(0);
    }
    querySnapshot.forEach((feedbackDoc) => {
      const feedbackData = feedbackDoc.data();
      console.log("Feedback doc:", feedbackDoc.id, feedbackData);
      const row = feedbackTableBody.insertRow();
      row.insertCell(0).textContent = feedbackData.name || "No name";
      row.insertCell(1).textContent = feedbackData.ecoWarriorID || "No ID";
      row.insertCell(2).textContent = feedbackData.feedback || "No feedback";

      const statusCell = row.insertCell(3);
      const statusSelect = document.createElement("select");
      statusSelect.innerHTML = `
          <option value="notRead">Not Read</option>
          <option value="read">Read</option>
          <option value="notResolved">Not Resolved</option>
          <option value="resolved">Resolved</option>
        `;
      statusSelect.value = feedbackData.status || "notRead";
      statusSelect.addEventListener("change", () => {
        const feedbackDocRef = doc(db, "userFeedback", feedbackDoc.id);
        updateDoc(feedbackDocRef, { status: statusSelect.value })
          .then(() => console.log("Feedback status updated for", feedbackDoc.id))
          .catch((error) => {
            console.error("Error updating feedback status:", error);
          });
      });
      statusCell.appendChild(statusSelect);
    });
  })
  .catch((error) => {
    console.error("Error fetching feedback data: ", error);
  });

