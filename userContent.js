// *******************************
// Firebase & Global Setup
// *******************************
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { 
  getAuth, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBsfV19SLzcVelg5Z5bjp3h1EJiStFLeoI",
  authDomain: "ecowarrior-app-1.firebaseapp.com",
  projectId: "ecowarrior-app-1",
  storageBucket: "ecowarrior-app-1.appspot.com",
  messagingSenderId: "204162169811",
  appId: "1:204162169811:web:3c78268b4add17159c0d26",
  measurementId: "G-66HRM9N0KY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// *******************************
// UserDashboard Module
// *******************************
const UserDashboard = {
  init() {
    // Set up connectivity indicator and sync button.
    this.updateConnectivityStatus();
    window.addEventListener("online", () => {
      this.updateConnectivityStatus();
      this.syncFeedbackQueue();
      // Optionally, auto-sync practices:
      // this.fetchAndRenderPractices();
    });
    window.addEventListener("offline", () => {
      this.updateConnectivityStatus();
    });

    // Greet the user.
    this.greetUser();

    // Load practices with grouping by category.
    this.fetchAndRenderPractices();

    // Bind manual Sync button for practices.
    const syncBtn = document.getElementById("syncPracticesBtn");
    if (syncBtn) {
      syncBtn.addEventListener("click", () => {
        this.fetchAndRenderPractices();
      });
    }

    // Set up feedback form and its toggle.
    this.setupFeedbackForm();
    const toggleFeedbackBtn = document.getElementById("toggleFeedbackBtn");
    if (toggleFeedbackBtn) {
      toggleFeedbackBtn.addEventListener("click", () => {
        const feedbackForm = document.getElementById("feedbackForm");
        if (feedbackForm) {
          feedbackForm.classList.toggle("hidden");
          feedbackForm.setAttribute("aria-hidden", feedbackForm.classList.contains("hidden"));
        }
      });
    }
  },

  // ----------------------------
  // User Greeting
  // ----------------------------
  greetUser() {
    const nameGreet = document.getElementById("nameGreet");
    const ecoWarriorID = document.getElementById("ecowarriorID");
    if (!nameGreet || !ecoWarriorID) {
      console.error("User header elements missing.");
      return;
    }
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const displayName = user.displayName || localStorage.getItem("nameUser") || "Guest";
        const userId = user.uid || localStorage.getItem("ecowarriorID");
        nameGreet.textContent = `Welcome, ${displayName}!`;
        ecoWarriorID.textContent = `Your EcoWarrior ID: ${userId}`;
      } else {
        const storedName = localStorage.getItem("nameUser") || "Guest";
        const storedID = localStorage.getItem("ecowarriorID") || "N/A";
        nameGreet.textContent = `Welcome, ${storedName}!`;
        ecoWarriorID.textContent = storedID === "N/A"
          ? "Please sign in or register."
          : `Your EcoWarrior ID: ${storedID}`;
      }
    });
  },

  // ----------------------------
  // Connectivity Indicator
  // ----------------------------
  updateConnectivityStatus() {
    const statusEl = document.getElementById("connectivityStatus");
    if (!statusEl) return;
    if (navigator.onLine) {
      statusEl.textContent = "You're Online";
      statusEl.className = "online";
    } else {
      statusEl.textContent = "You're in Offline mode";
      statusEl.className = "offline";
     // syncBtn.style.display= "none";
    }
  },

  // ----------------------------
  // Fetch and Render Practices (Grouped by Category)
  // ----------------------------
  async fetchAndRenderPractices() {
    const container = document.getElementById("sectionsContainer");
    if (!container) return;
    
    container.innerHTML = "<p>Loading practices...</p>";
    
    // Map categories to their corresponding Firestore collection names.
    const categoryMapping = {
      water: { title: "Water Conservation", collection: "waterPractices" },
      waste: { title: "Waste Management", collection: "wastePractices" },
      energy: { title: "Energy Saving", collection: "energyPractices" },
      recycling: { title: "Recycling", collection: "recyclingPractices" },  // May be empty.
      tips: { title: "Tips", collection: "tipsPractices" }
    };

    if (navigator.onLine) {
      let allFetched = {};
      // Query each collection concurrently.
      const categoryKeys = Object.keys(categoryMapping);
      await Promise.all(categoryKeys.map(async (catKey) => {
        const { title, collection: colName } = categoryMapping[catKey];
        try {
          const snapshot = await getDocs(collection(db, colName));
          const practices = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`Fetched from ${colName}:`, data);
            // Filter practices that are enabled.
            if (data.status === "enabled" || data.enabled === true) {
              practices.push({ id: doc.id, ...data });
            }
          });
          allFetched[catKey] = practices;
        } catch (error) {
          console.error(`Error fetching ${colName}:`, error);
          allFetched[catKey] = []; // Fallback to empty
        }
      }));

      // Render grouped practices by category.
      container.innerHTML = "";
      let anyData = false;
      categoryKeys.forEach(catKey => {
        const { title } = categoryMapping[catKey];
        const practices = allFetched[catKey] || [];
        const catSection = document.createElement("section");
        catSection.classList.add("category-section");

        // Add category heading.
        const heading = document.createElement("h2");
        heading.textContent = title;
        catSection.appendChild(heading);

        if (practices.length > 0) {
          practices.forEach(practice => {
            const practiceElem = document.createElement("div");
            practiceElem.classList.add("practice-item");
            practiceElem.innerHTML = `
              <h3>${practice.title || "Untitled"}</h3>
              <p>${practice.description || ""}</p>
            `;
            catSection.appendChild(practiceElem);
          });
          anyData = true;
        } else {
          const p = document.createElement("p");
          p.textContent = "No practices available.";
          catSection.appendChild(p);
        }
        container.appendChild(catSection);
      });
      if (!anyData) {
        container.innerHTML = "<p>No practices available.</p>";
      }
      // Cache the grouped practices for offline use.
      localStorage.setItem("cachedPracticesGrouped", JSON.stringify(allFetched));
    } else {
      // Offline: load grouped practices from cache.
      const cached = localStorage.getItem("cachedPracticesGrouped");
      if (cached) {
        const allCached = JSON.parse(cached);
        container.innerHTML = "";
        const categoryKeys = Object.keys(categoryMapping);
        categoryKeys.forEach(catKey => {
          const { title } = categoryMapping[catKey];
          const practices = allCached[catKey] || [];
          const catSection = document.createElement("section");
          catSection.classList.add("category-section");

          const heading = document.createElement("h2");
          heading.textContent = title;
          catSection.appendChild(heading);

          if (practices.length > 0) {
            practices.forEach(practice => {
              const practiceElem = document.createElement("div");
              practiceElem.classList.add("practice-item");
              practiceElem.innerHTML = `
                <h3>${practice.title || "Untitled"}</h3>
                <p>${practice.description || ""}</p>
              `;
              catSection.appendChild(practiceElem);
            });
          } else {
            const p = document.createElement("p");
            p.textContent = "No cached practices available.";
            catSection.appendChild(p);
          }
          container.appendChild(catSection);
        });
      } else {
        container.innerHTML = "<p>No cached practices available.</p>";
      }
    }
  },

  // ----------------------------
  // Feedback Form Handling
  // ----------------------------
  setupFeedbackForm() {
    const feedbackForm = document.getElementById("feedbackForm");
    if (!feedbackForm) {
      console.error("Feedback form element is missing in the DOM.");
      return;
    }
    // Create container for messages.
    const messageContainer = document.createElement("div");
    feedbackForm.parentNode.appendChild(messageContainer);
    messageContainer.className = "message-container";

    const showMessage = (text, type) => {
      const message = document.createElement("div");
      message.className = `message ${type}`;
      message.textContent = text;
      messageContainer.innerHTML = "";
      messageContainer.appendChild(message);
      setTimeout(() => {
        messageContainer.innerHTML = "";
      }, 3000);
    };

    feedbackForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const feedback = document.getElementById("feedback").value.trim();
      const user = auth.currentUser;
      if (!feedback) {
        showMessage("Please provide feedback before submitting.", "error");
        return;
      }
      const feedbackObject = {
        name: user
          ? (user.displayName || localStorage.getItem("nameUser"))
          : (localStorage.getItem("nameUser") || "Anonymous"),
        ecoWarriorID: user
          ? (user.uid || localStorage.getItem("ecowarriorID"))
          : localStorage.getItem("ecowarriorID"),
        feedback: feedback,
        timestamp: new Date()
      };

      if (!navigator.onLine) {
        this.queueFeedback(feedbackObject);
        showMessage("You're offline. Your feedback has been queued and will be submitted when you're online.", "success");
        feedbackForm.reset();
        return;
      }

      try {
        await addDoc(collection(db, "userFeedback"), feedbackObject);
        console.log("Feedback stored successfully.");
        showMessage("Thank you for your feedback! It has been saved.", "success");
        feedbackForm.reset();
      } catch (error) {
        console.error("Error saving feedback online:", error);
        showMessage("Failed to save feedback. It will be stored and retried later.", "error");
        this.queueFeedback(feedbackObject);
      }
    });
  },

  // Queue feedback for offline submission.
  queueFeedback(feedbackObject) {
    const feedbackQueue = JSON.parse(localStorage.getItem("feedbackQueue")) || [];
    feedbackQueue.push(feedbackObject);
    localStorage.setItem("feedbackQueue", JSON.stringify(feedbackQueue));
  },

  // Sync queued feedback when online.
  async syncFeedbackQueue() {
    const feedbackQueue = JSON.parse(localStorage.getItem("feedbackQueue"));
    if (feedbackQueue && feedbackQueue.length > 0) {
      for (const feedbackObject of feedbackQueue) {
        try {
          await addDoc(collection(db, "userFeedback"), feedbackObject);
          console.log("Synced feedback:", feedbackObject);
        } catch (error) {
          console.error("Error syncing feedback:", error);
          return; // Exit to try syncing later.
        }
      }
      localStorage.removeItem("feedbackQueue");
    }
  }
};

// *******************************
// Initialize User Dashboard After DOM Loads
// *******************************
document.addEventListener("DOMContentLoaded", () => {
  UserDashboard.init();
});
