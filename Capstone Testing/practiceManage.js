// AdminDashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBsfV19SLzcVelg5Z5bjp3h1EJiStFLeoI",
  authDomain: "ecowarrior-app-1.firebaseapp.com",
  projectId: "ecowarrior-app-1",
  storageBucket: "ecowarrior-app-1.appspot.com",
  messagingSenderId: "204162169811",
  appId: "1:204162169811:web:3c78268b4add17159c0d26",
  measurementId: "G-66HRM9N0KY"
};

// Initialize Firebase and Firestore.
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Encapsulate global admin state and functions in one object.
const AdminDashboard = {
  loadedPractices: {},
  pendingPracticeChanges: {},

  // Initialize the dashboard.
  init() {
    this.setupDynamicDashboard();
    this.initSignOut();
  },

  // ----------------------------
  // Firebase & Global Helpers
  // ----------------------------

  initSignOut() {
    const signOutBtn = document.getElementById("signOutBtn");
    if (signOutBtn) {
      signOutBtn.addEventListener("click", () => {
        signOut(auth)
          .then(() => {
            window.location.href = "login.html";
          })
          .catch((error) => {
            console.error("Error signing out:", error);
          });
      });
    }
  },

  // ----------------------------
  // Practice Listeners & Modal
  // ----------------------------

  attachPracticeListeners(category, practiceElem) {
    const editBtn = practiceElem.querySelector(".editPractice");
    const toggleBtn = practiceElem.querySelector(".togglePractice");

    if (editBtn) {
      editBtn.addEventListener("click", () => {
        this.openEditModal(category, practiceElem);
      });
    }
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const statusSpan = practiceElem.querySelector(".practice-status");
        if (statusSpan) {
          const currentStatus = statusSpan.textContent.trim().toLowerCase();
          const newStatus = currentStatus === "enabled" ? "disabled" : "enabled";
          statusSpan.textContent =
            newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
          toggleBtn.textContent = newStatus === "enabled" ? "Disable" : "Enable";
          // Mark the change.
          this.pendingPracticeChanges[practiceElem.id] = "toggle";
          // Show the unsaved indicator.
          const marker = practiceElem.querySelector(".unsaved-indicator");
          if (marker) marker.style.display = "inline";
        }
      });
    }
  },

  openEditModal(category, practiceElem) {
    let modalOverlay = document.getElementById("editPracticeModal");
    if (!modalOverlay) {
      modalOverlay = document.createElement("div");
      modalOverlay.id = "editPracticeModal";
      Object.assign(modalOverlay.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: "1000"
      });
      const modalContent = document.createElement("div");
      modalContent.id = "editPracticeModalContent";
      Object.assign(modalContent.style, {
        backgroundColor: "#fff",
        padding: "20px",
        borderRadius: "8px",
        minWidth: "300px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.3)"
      });
      modalOverlay.appendChild(modalContent);
      document.body.appendChild(modalOverlay);
    }

    const modalContent = document.getElementById("editPracticeModalContent");
    modalContent.innerHTML = ""; // Clear previous content.

    const modalTitle = document.createElement("h2");
    modalTitle.textContent = "Edit Practice";
    modalContent.appendChild(modalTitle);

    const form = document.createElement("form");
    form.innerHTML = `
      <label>Title:</label>
      <input type="text" id="editPracticeTitle" value="${practiceElem.querySelector('.practice-details h3').textContent}" required style="width:100%; margin-bottom:10px;">
      <label>Description:</label>
      <textarea id="editPracticeDescription" style="width:100%; margin-bottom:10px;">${
        practiceElem.querySelector('.practice-description')
          ? practiceElem.querySelector('.practice-description').textContent
          : ""
      }</textarea>
      <div style="text-align:right;">
        <button type="button" id="cancelEditPractice">Cancel</button>
        <button type="submit" id="saveEditPractice">Save</button>
      </div>
    `;
    modalContent.appendChild(form);
    modalOverlay.style.display = "flex";

    document.getElementById("cancelEditPractice").addEventListener("click", this.closeEditModal);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const newTitle = document.getElementById("editPracticeTitle").value.trim();
      const newDescription = document.getElementById("editPracticeDescription").value.trim();
      if (newTitle !== "") {
        practiceElem.querySelector(".practice-details h3").textContent = newTitle;
      }
      let descElem = practiceElem.querySelector(".practice-description");
      if (descElem) {
        descElem.textContent = newDescription;
      } else {
        descElem = document.createElement("p");
        descElem.className = "practice-description";
        descElem.textContent = newDescription;
        practiceElem.querySelector(".practice-details").appendChild(descElem);
      }
      // Mark change as edit.
      this.pendingPracticeChanges[practiceElem.id] = "edit";
      const marker = practiceElem.querySelector(".unsaved-indicator");
      if (marker) marker.style.display = "inline";
      this.closeEditModal();
    });
  },

  closeEditModal() {
    const modalOverlay = document.getElementById("editPracticeModal");
    if (modalOverlay) {
      modalOverlay.style.display = "none";
    }
  },

  // ----------------------------
  // Confirm Changes: Sync with Firestore
  // ----------------------------
  async confirmChanges(category) {
    const collectionName = category + "Practices";
    for (const practiceId in this.pendingPracticeChanges) {
      if (!practiceId.startsWith(category + "-")) continue;
      const changeType = this.pendingPracticeChanges[practiceId];
      const practiceElem = document.getElementById(practiceId);
      if (!practiceElem) continue;
      const title = practiceElem.querySelector(".practice-details h3").textContent;
      const description = practiceElem.querySelector(".practice-description")?.textContent || "";
      const status = practiceElem.querySelector(".practice-status").textContent.toLowerCase();
      
      try {
        if (changeType === "add") {
          const docRef = await addDoc(collection(db, collectionName), {
            title, description, status, createdAt: new Date()
          });
          practiceElem.setAttribute("data-doc-id", docRef.id);
        } else if (changeType === "edit" || changeType === "toggle") {
          const docId = practiceElem.getAttribute("data-doc-id");
          if (docId) {
            const practiceDocRef = doc(db, collectionName, docId);
            await updateDoc(practiceDocRef, {
              title, description, status, updatedAt: new Date()
            });
          }
        }
        // Hide the unsaved change indicator.
        const marker = practiceElem.querySelector(".unsaved-indicator");
        if (marker) marker.style.display = "none";
      } catch (error) {
        console.error("Error saving practice", practiceId, error);
      }
    }
    // Clear pending changes for this category.
    for (const key in this.pendingPracticeChanges) {
      if (key.startsWith(category + "-")) delete this.pendingPracticeChanges[key];
    }
    alert(`${category.charAt(0).toUpperCase() + category.slice(1)} practice changes saved.`);
  },

  // ----------------------------
  // UI Generation for Dashboard
  // ----------------------------

  createSectionElements(category) {
    // Create sub-tab button.
    const tabNav = document.getElementById("tabNavContainer");
    const tabButton = document.createElement("button");
    tabButton.textContent = category.title;
    tabButton.setAttribute("data-tab", category.id + "Section");
    tabNav.appendChild(tabButton);
    
    // Create the section container.
    const sectionsContainer = document.getElementById("sectionsContainer");
    const section = document.createElement("div");
    section.id = category.id + "Section";
    section.className = "practice-section";
    section.innerHTML = `
      <h3>Manage ${category.title}</h3>
      <button id="showNewPracticeForm-${category.id}" class="add-button">Add New Practice</button>
      <form id="newPracticeForm-${category.id}" class="new-practice-form">
        <input type="text" id="newPracticeTitle-${category.id}" placeholder="Practice Title" required>
        <textarea id="newPracticeDescription-${category.id}" placeholder="Practice Description" required></textarea>
        <select id="newPracticeStatus-${category.id}">
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
        <button type="submit">Save New Practice</button>
        <button type="button" id="cancelNewPractice-${category.id}">Cancel</button>
      </form>
      <div id="practicesList-${category.id}" class="practices-list">
        <p class="no-practice-message">No practice available</p>
      </div>
      <div class="global-changes">
        <button id="confirmChanges-${category.id}">Save Changes</button>
        <span id="unsavedIndicator-${category.id}" class="global-unsaved-indicator">0 pending changes</span>
      </div>
    `;
    sectionsContainer.appendChild(section);
  },

  setupNewPracticeForm(category) {
    const formId = "newPracticeForm-" + category;
    const showBtnId = "showNewPracticeForm-" + category;
    const cancelBtnId = "cancelNewPractice-" + category;
    
    document.getElementById(showBtnId).addEventListener("click", () => {
      document.getElementById(formId).style.display = "flex";
    });
    
    document.getElementById(cancelBtnId).addEventListener("click", () => {
      document.getElementById(formId).style.display = "none";
    });
    
    document.getElementById(formId).addEventListener("submit", (e) => {
      e.preventDefault();
      const titleInput = document.getElementById("newPracticeTitle-" + category);
      const descriptionInput = document.getElementById("newPracticeDescription-" + category);
      const statusSelect = document.getElementById("newPracticeStatus-" + category);
      
      const title = titleInput.value.trim();
      const description = descriptionInput.value.trim();
      const status = statusSelect.value;
      
      if (!title) {
        alert("Please enter a practice title.");
        return;
      }
      
      // Generate a temporary ID.
      const practiceId = category + "-" + Date.now();
      const toggleText = status === "enabled" ? "Disable" : "Enable";
      
      const newPracticeElem = document.createElement("div");
      newPracticeElem.className = "practice-item";
      newPracticeElem.id = practiceId;
      newPracticeElem.innerHTML = `
        <div class="practice-details">
          <h3>${title}</h3>
          <p class="practice-description">${description}</p>
          <p>Status: <span class="practice-status">${status.charAt(0).toUpperCase() + status.slice(1)}</span></p>
        </div>
        <div class="practice-actions">
          <button class="editPractice">Edit</button>
          <button class="togglePractice">${toggleText}</button>
          <span class="unsaved-indicator" title="This practice has unsaved changes" style="display:none;">*</span>
        </div>
      `;
      
      const practicesList = document.getElementById("practicesList-" + category);
      const placeholder = practicesList.querySelector(".no-practice-message");
      if (placeholder) placeholder.remove();
      practicesList.appendChild(newPracticeElem);
      
      // Mark as a pending addition.
      this.pendingPracticeChanges[newPracticeElem.id] = "add";
      this.attachPracticeListeners(category, newPracticeElem);
      
      // Reset and hide the form.
      titleInput.value = "";
      descriptionInput.value = "";
      statusSelect.value = "enabled";
      document.getElementById(formId).style.display = "none";
      alert("New practice added. Remember to save changes.");
    });
  },

  async loadPractices(category) {
    if (this.loadedPractices[category]) {
      console.log(`Practices for ${category} already loaded.`);
      return;
    }
    
    const practicesList = document.getElementById("practicesList-" + category);
    practicesList.innerHTML = "";
    const collectionName = category + "Practices";
    
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      if (querySnapshot.empty) {
        const placeholder = document.createElement("p");
        placeholder.className = "no-practice-message";
        placeholder.textContent = "No practice available";
        practicesList.appendChild(placeholder);
      } else {
        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          const practiceElem = document.createElement("div");
          practiceElem.className = "practice-item";
          practiceElem.id = category + "-" + docSnapshot.id;
          practiceElem.setAttribute("data-doc-id", docSnapshot.id);
          const toggleText = data.status === "enabled" ? "Disable" : "Enable";
          practiceElem.innerHTML = `
            <div class="practice-details">
              <h3>${data.title}</h3>
              <p class="practice-description">${data.description || ""}</p>
              <p>Status: <span class="practice-status">${data.status.charAt(0).toUpperCase() + data.status.slice(1)}</span></p>
            </div>
            <div class="practice-actions">
              <button class="editPractice">Edit</button>
              <button class="togglePractice">${toggleText}</button>
              <span class="unsaved-indicator" title="This practice has unsaved changes" style="display:none;">*</span>
            </div>
          `;
          this.attachPracticeListeners(category, practiceElem);
          practicesList.appendChild(practiceElem);
        });
      }
      this.loadedPractices[category] = true;
    } catch (error) {
      console.error(`Error loading ${category} practices from Firestore:`, error);
    }
  },

  setupSubTabNavigation() {
    const subTabButtons = document.querySelectorAll("#tabNavContainer button");
    const subTabSections = document.querySelectorAll(".practice-section");
  
    subTabButtons.forEach(btn => {
      btn.addEventListener("click", function () {
        // Remove active class from all sub-tab buttons and sections.
        subTabButtons.forEach(b => b.classList.remove("active"));
        subTabSections.forEach(section => section.classList.remove("active"));
  
        // Mark the clicked button as active.
        this.classList.add("active");
        
        // Retrieve the target section's ID.
        const targetId = this.getAttribute("data-tab");
        const targetSection = document.getElementById(targetId);
        
        if (targetSection) {
          targetSection.classList.add("active");
          targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          console.warn("No section with ID '" + targetId + "' found.");
        }
      });
    });
    // Activate the first tab by default.
    if (subTabButtons.length > 0) {
      subTabButtons[0].click();
    }
  },

  setupDynamicDashboard() {
    // Define category data.
    const sectionsConfig = [
      { id: "water", title: "Water Conservation" },
      { id: "waste", title: "Waste Management" },
      { id: "energy", title: "Energy Saving" },
      { id: "recycling", title: "Recycling" },
      { id: "tips", title: "Tips" }
    ];
    
    // Generate UI for each category.
    sectionsConfig.forEach(category => {
      this.createSectionElements(category);
      this.setupNewPracticeForm(category.id);
      this.loadPractices(category.id);
      document.getElementById("confirmChanges-" + category.id)
        .addEventListener("click", async () => {
          await this.confirmChanges(category.id);
        });
    });
  
    this.setupSubTabNavigation();
  }
};

// Initialize on DOMContentLoaded.
document.addEventListener("DOMContentLoaded", () => {
  AdminDashboard.init();
});
