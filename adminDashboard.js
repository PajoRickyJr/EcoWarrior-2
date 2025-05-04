import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  addDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

import { logAuditTrail } from './auditTrail.js';

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

let allFeedbackData = [];

// Tab Navigation Part

document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".tab-nav button");
  const tabSections = document.querySelectorAll(".tab-section");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Removing active class from all buttons and sections
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabSections.forEach((section) => section.classList.remove("active"));

      // Adding active class to the clicked button and corresponding section
      button.classList.add("active");
      const targetTab = button.getAttribute("data-tab");
      const targetSection = document.getElementById(targetTab);
      if (targetSection) {
        targetSection.classList.add("active");
      }
    });
  });

  // Initialize search functionality for the user table
  const userSearchInput = document.getElementById("userSearchInput");
  const userTableBody = document
    .getElementById("userTable")
    .getElementsByTagName("tbody")[0];

  userSearchInput.addEventListener("input", () => {
    const searchTerm = userSearchInput.value.toLowerCase();

    // Loop through all rows in the table body
    Array.from(userTableBody.rows).forEach((row) => {
      const nameCell = row.cells[0]?.textContent.toLowerCase() || "";
      const ecoWarriorIDCell = row.cells[1]?.textContent.toLowerCase() || "";

      // Check if the search term matches the name or EcoWarrior ID
      if (nameCell.includes(searchTerm) || ecoWarriorIDCell.includes(searchTerm)) {
        row.style.display = ""; // Show the row
      } else {
        row.style.display = "none"; // Hide the row
      }
    });
  });
});

// Debugging scroll-based active tab detection
const updateActiveTabOnScroll = () => {
  const sections = document.querySelectorAll(".tab-section");
  const tabButtons = document.querySelectorAll(".tab-nav button");

  let currentSectionId = "";

  sections.forEach((section) => {
    const sectionTop = section.getBoundingClientRect().top;
    const sectionHeight = section.offsetHeight;

    if (sectionTop <= window.innerHeight / 2 && sectionTop + sectionHeight > window.innerHeight / 2) {
      currentSectionId = section.getAttribute("id");
    }
  });



  tabButtons.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-tab") === currentSectionId) {
      btn.classList.add("active");
    }
  });
};

// Attach scroll event listener
window.addEventListener("scroll", updateActiveTabOnScroll);

// User Data Section 

const userTableBody = document
  .getElementById("userTable")
  .getElementsByTagName("tbody")[0];
const ecoWarriorsRef = collection(db, "EcoWarriors");
getDocs(ecoWarriorsRef)
  .then((querySnapshot) => {
    if (
      querySnapshot.size > 0 &&
      userTableBody.rows[0] &&
      userTableBody.rows[0].cells[0].textContent === "No user data available"
    ) {
      userTableBody.deleteRow(0);
    }

    // Convert querySnapshot to an array and sort by registrationDate
    const sortedUsers = querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const dateA = a.registrationDate?.seconds || 0;
        const dateB = b.registrationDate?.seconds || 0;
        return dateB - dateA; // Newest first
      });

    sortedUsers.forEach((userData) => {
      
      const row = userTableBody.insertRow(0); // Prepend row
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

// Add real-time listener for EcoWarriors count
const ecoWarriorsCountElement = document.createElement("p");
ecoWarriorsCountElement.id = "EcoWarriorsCount";
ecoWarriorsCountElement.textContent = "Total EcoWarriors: 0";
const userManagementSection = document.getElementById("userManagement");
userManagementSection.insertBefore(ecoWarriorsCountElement, userManagementSection.querySelector("table"));

// Real-time listener for EcoWarriors collection
onSnapshot(collection(db, "EcoWarriors"), (snapshot) => {
  const EcoWarriorsCount = snapshot.size;
  ecoWarriorsCountElement.textContent = `Total EcoWarriors: ${EcoWarriorsCount}`;
});

// Real-time listener for EcoWarriors collection
onSnapshot(collection(db, "EcoWarriors"), (snapshot) => {
  const userTableBody = document
    .getElementById("userTable")
    .getElementsByTagName("tbody")[0];

  userTableBody.innerHTML = ""; // Clear the table before updating

  const sortedUsers = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const dateA = a.registrationDate?.seconds || 0;
      const dateB = b.registrationDate?.seconds || 0;
      return dateB - dateA; // Newest first
    });

  sortedUsers.forEach((userData) => {
    const row = userTableBody.insertRow(0); // Prepend row
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
});

// Function to add a new user
const addNewUser = async (name, ecoWarriorID) => {
  try {
    const ecoWarriorsRef = collection(db, "EcoWarriors");
    await addDoc(ecoWarriorsRef, {
      name: name,
      ecoWarriorID: ecoWarriorID,
      registrationDate: serverTimestamp(), // Add the current timestamp
    });
    console.log(`New user added: ${name} (${ecoWarriorID})`);
  } catch (error) {
    console.error("Error adding new user:", error);
  }
};


// Feedback Data Section 


// Define status options and their corresponding styles
const statusOptions = {
  notRead: { text: "Not Read", color: "#f44336", background: "#fdecea" },
  read: { text: "Read", color: "#4caf50", background: "#e8f5e9" },
  notResolved: { text: "Not Resolved", color: "#ff9800", background: "#fff3e0" },
  resolved: { text: "Resolved", color: "#2196f3", background: "#e3f2fd" },
};

// Function to update the UI based on the status
const updateStatusUI = (row, badge, status) => {
  const { text, color, background } = statusOptions[status];

  // Update the badge with text and Unicode character
  badge.innerHTML = ""; // Clear previous content
  const icon = document.createElement("span");
  icon.style.marginRight = "5px";

  // Add Unicode characters based on status
  if (status === "notRead") {
    icon.textContent = "✖"; 
  } else if (status === "read") {
    icon.textContent = "✔"; 
  } else if (status === "notResolved") {
    icon.textContent = "⚠";
  } else if (status === "resolved") {
    icon.textContent = "✓✓"; 
  }

  badge.appendChild(icon);
  badge.appendChild(document.createTextNode(text));


  badge.className = `feedback-status feedback-status-${status}`;
  badge.style.color = color;
  badge.style.backgroundColor = background;
};

// Helper function to create dropdown options
const createDropdownOptions = (dropdown, options, selectedValue) => {
  Object.keys(options).forEach((key) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = options[key].text;
    dropdown.appendChild(option);
  });
  dropdown.value = selectedValue;
};

// Function to render feedback data
const renderFeedbackData = (feedbackData) => {
  const row = feedbackTableBody.insertRow(0);
  row.insertCell(0).textContent = feedbackData.feedbackId || "No Feedback ID";
  row.insertCell(1).textContent = feedbackData.name || "No name";
  const ecoWarriorID = feedbackData.ecoWarriorID || "No ID";
  row.insertCell(2).textContent = ecoWarriorID;
  row.insertCell(3).textContent = feedbackData.feedback || "No feedback";

  // Create a status cell with a dropdown
  const statusCell = row.insertCell(4);
  statusCell.setAttribute("data-status", feedbackData.status || "notRead");
  

  const statusDropdown = document.createElement("select");
  statusDropdown.className = "status-dropdown";

  // Populate the dropdown with status options
  Object.keys(statusOptions).forEach((key) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = statusOptions[key].text;
    statusDropdown.appendChild(option);
  });

  // Set initial status
  const currentStatus = feedbackData.status || "notRead";
  statusDropdown.value = currentStatus;
  updateDropdownStyle(statusDropdown, currentStatus);

  // Update status on dropdown change
  statusDropdown.addEventListener("change", async () => {
    const newStatus = statusDropdown.value;
    const feedbackDocRef = doc(db, "userFeedback", feedbackData.id);

    try {
      await updateDoc(feedbackDocRef, { status: newStatus });
      console.log("Feedback status updated for", feedbackData.id);
      updateDropdownStyle(statusDropdown, newStatus); 
      // Log the action in the Audit Trail
     await logAuditTrail(
      "Updated Feedback Status", 
      "Feedback Management",
      { feedbackId: feedbackData.feedbackId, status: currentStatus },
      { feedbackId: feedbackData.feedbackId, status: newStatus}
    );
lly

      // Log the action in the Audit Trail
     await logAuditTrail(
      "Updated Feedback Status", 
      "Feedback Management",
      { feedbackId: feedbackData.feedbackId, status: currentStatus },
      { feedbackId: feedbackData.feedbackId, status: newStatus}
    );
    } catch (error) {
      console.error("Error updating feedback status:", error);
      alert("Failed to update status. Please try again.");
    }
  });

  // Append the dropdown to the status cell
  statusCell.appendChild(statusDropdown);
};


// Function to update the dropdown's style based on the status
const updateDropdownStyle = (dropdown, status) => {
  const { background, color } = statusOptions[status];
  dropdown.style.backgroundColor = background;
  dropdown.style.color = color;
};
const feedbackTableBody = document
  .getElementById("feedbackTable")
  .getElementsByTagName("tbody")[0];
const feedbackRef = collection(db, "userFeedback");
getDocs(feedbackRef)
  .then((querySnapshot) => {
    if (
      querySnapshot.size > 0 &&
      feedbackTableBody.rows[0] &&
      feedbackTableBody.rows[0].cells[0].textContent === "No feedback available"
    ) {
      feedbackTableBody.deleteRow(0);
    }

    // Convert querySnapshot to an array and sort by timestamp
    const sortedFeedback = querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const dateA = a.timestamp?.seconds || 0;
        const dateB = b.timestamp?.seconds || 0;
        return dateB - dateA; // New feedback will be on top 
      }); 

    sortedFeedback.forEach((feedbackData) => {
      renderFeedbackData(feedbackData);
    });
  })
  .catch((error) => {
    console.error("Error fetching feedback data: ", error);
  });

// Ensure feedback data is sorted and displayed at the top
onSnapshot(collection(db, "userFeedback"), (snapshot) => {
  const feedbackTableBody = document
    .getElementById("feedbackTable")
    .getElementsByTagName("tbody")[0];

  feedbackTableBody.innerHTML = ""; // Clear the table before updating

  // Convert snapshot to an array and sort by timestamp
  const sortedFeedback = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const dateA = a.timestamp?.seconds || 0;
      const dateB = b.timestamp?.seconds || 0;
      return dateB - dateA; // Newest first
    });

  sortedFeedback.forEach((feedbackData) => {
    renderFeedbackData(feedbackData);
  });
});

//for sorting based on status the feedback
onSnapshot(collection(db, "userFeedback"), (snapshot) => {
  allFeedbackData = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const dateA = a.timestamp?.seconds || 0;
      const dateB = b.timestamp?.seconds || 0;
      return dateB - dateA; // Newest first
    });
  renderFilteredFeedback();
});

// Adjusted placement of the refresh button
const addRefreshButton = (sectionId, refreshFunction) => {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const tableHeader = section.querySelector("table thead");
  if (tableHeader) {
    const refreshButton = document.createElement("button");
    refreshButton.textContent = "Refresh";
    refreshButton.className = "refresh-button";
    refreshButton.style.marginLeft = "10px";
    refreshButton.addEventListener("click", refreshFunction);

    const headerRow = tableHeader.querySelector("tr");
    if (headerRow) {
      const refreshCell = document.createElement("th");
      refreshCell.appendChild(refreshButton);
      headerRow.appendChild(refreshCell);
    }
  }
};

// Refresh user data
const refreshUserData = async () => {
  const userTableBody = document
    .getElementById("userTable")
    .getElementsByTagName("tbody")[0];
  userTableBody.innerHTML = "<tr><td colspan='3'>Loading...</td></tr>";

  try {
    const querySnapshot = await getDocs(collection(db, "ecoWarriors"));
    userTableBody.innerHTML = "";

    // Convert querySnapshot to an array and sort by registrationDate
    const sortedUsers = querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const dateA = a.registrationDate?.seconds || 0;
        const dateB = b.registrationDate?.seconds || 0;
        return dateB - dateA; 
      });

    sortedUsers.forEach((userData) => {
      const row = userTableBody.insertRow(0); // Prepend row
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
  } catch (error) {
    console.error("Error refreshing user data: ", error);
    userTableBody.innerHTML = "<tr><td colspan='3'>Failed to load data.</td></tr>";
  }
};

// Refresh feedback data
const refreshFeedbackData = async () => {
  const feedbackTableBody = document
    .getElementById("feedbackTable")
    .getElementsByTagName("tbody")[0];
  feedbackTableBody.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";

  try {
    const querySnapshot = await getDocs(collection(db, "userFeedback"));
    feedbackTableBody.innerHTML = "";

    // Convert querySnapshot to an array and sort by timestamp
    const sortedFeedback = querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const dateA = a.timestamp?.seconds || 0;
        const dateB = b.timestamp?.seconds || 0;
        return dateB - dateA; // Newest first
      });

    sortedFeedback.forEach((feedbackData) => {
      renderFeedbackData(feedbackData);
    });
  } catch (error) {
    console.error("Error refreshing feedback data:", error);
    feedbackTableBody.innerHTML = "<tr><td colspan='4'>Failed to load data.</td></tr>";
  }
};

// Add refresh buttons to sections
addRefreshButton("userManagement", refreshUserData);
addRefreshButton("feedbackManagement", refreshFeedbackData);



// Log an action when feedback status is updated
const updateFeedbackStatus = async (feedbackId, newStatus) => {
  try {
    const feedbackDocRef = doc(db, "userFeedback", feedbackId);
    const feedbackdoc = await getDoc(feedbackDocRef);

    if (!feedbackdoc.exists()) {
      console.error(`Feedback with ID ${feedbackId} does not exist.`);
      return;
    }

    const feedbackData = feedbackdoc.data();
    const oldStatus = feedbackData.status || "Unknown";

    //updating now the feedback status on Firestore
    await updateDoc(feedbackDocRef, { status: newStatus });
    console.log(`Feedback status updated for ${feedbackId} to ${newStatus}`);

      //Log the action in the Audit Trail
    await logAuditTrail(
      "Updated Feedback Status",
      "Feedback Management",
      { feedbackId, status: oldStatus },
      { feedbackId, status: newStatus }
    );
  } catch (error) {
    console.error("Error updating feedback status:", error);
    alert("Failed to update status. Please try again.");
  }
};

// Add Audit Trail Section to Navigation
document.addEventListener("DOMContentLoaded", () => {
  const auditTrailButton = document.createElement("button");
  auditTrailButton.textContent = "Audit Trail Section";
  auditTrailButton.addEventListener("click", () => {
    window.location.href = "auditTrail.html";
  });

  const tabNavContainer = document.querySelector(".tab-nav");
  if (tabNavContainer) {
    tabNavContainer.appendChild(auditTrailButton);
  }

  document.getElementById("feedbackSortDropdown").addEventListener("change", renderFilteredFeedback);

});

function renderFilteredFeedback() {
  const feedbackTableBody = document
    .getElementById("feedbackTable")
    .getElementsByTagName("tbody")[0];
  feedbackTableBody.innerHTML = "";

  const selectedStatus = document.getElementById("feedbackSortDropdown").value;

  const filtered = selectedStatus === "all"
    ? allFeedbackData
    : allFeedbackData.filter(fb => (fb.status || "notRead") === selectedStatus);

  if (filtered.length === 0) {
    feedbackTableBody.innerHTML = "<tr><td colspan='5'>No feedback available for this status.</td></tr>";
    return;
  }

  filtered.forEach(renderFeedbackData);
}

