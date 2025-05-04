// AdminDashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { logAuditTrail } from "./auditTrail.js";

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
  allTips:[],
  // Initialize the dashboard.
  init() {
    this.setupDynamicDashboard();
    this.initSignOut();
    this.setupScrollHighlight();
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
 
  // Practice Listeners & Modal
 
  attachPracticeListeners(category, practiceElem) {
    const editBtn = practiceElem.querySelector(".editPractice");
    const toggleBtn = practiceElem.querySelector(".togglePractice");

    if (editBtn) {
      editBtn.addEventListener("click", () => {
        this.openEditModal(category, practiceElem);
      });
    }
    if (toggleBtn) {
      toggleBtn.addEventListener("click", async () => {
        const statusSpan = practiceElem.querySelector(".practice-status");
        const title = practiceElem.querySelector(".practice-details h3").textContent;
        if (statusSpan) {
          const currentStatus = statusSpan.textContent.trim().toLowerCase();
          const newStatus = currentStatus === "enabled" ? "disabled" : "enabled";
          statusSpan.textContent =
            newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
          toggleBtn.textContent = newStatus === "enabled" ? "Disable" : "Enable";

          //Logging the action in the audit trail
          const previousState = { status: currentStatus};
          const newState = { status: newStatus};
          await logAuditTrail(
            "Change the practice status",
            `Practice Management:  (${category})`,
            {  title, ...previousState},
            {  title, ...newState}
          
          );

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
      const modalContent = document.createElement("div");
      modalContent.id = "editPracticeModalContent";
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

    //edit and submit changes for the practice
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const previousTitle = practiceElem.querySelector(".practice-details h3").textContent.trim();
      const previousDescription = practiceElem.querySelector(".practice-description")?.textContent.trim() || "";

      const newTitle = document.getElementById("editPracticeTitle").value.trim();
      const newDescription = document.getElementById("editPracticeDescription").value.trim();

       // Logging the action of editing practice in the Audit Trail
       await logAuditTrail (
        "Edit Practice",
        `Practice Management: (${category})`,
       { title: previousTitle, description: previousDescription },
       { title: newTitle, description: newDescription}
       );

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
    
    document.getElementById(formId).addEventListener("submit", async (e) => {
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

      //logging the action of adding new practice to audit trail
      const newPractice = {title, description, status};
      await logAuditTrail(
        "Add New Practice", `Practice Management: (${category})`, null, newPractice
      );
      
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

        
          document.body.style.background = "#f4f4f4"; 
          document.body.style.transition = "background 0.5s ease";

          
          const sections = document.querySelectorAll("header, main, footer, section");
          sections.forEach(section => {
            section.style.background = ""; 
            section.style.borderRadius = ""; 
            section.style.boxShadow = ""; 
          });
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
    this.createTipsSection();
  },

  // Enhanced scroll-based sub-tab highlighting
  setupScrollHighlight() {
    const subTabButtons = document.querySelectorAll("#tabNavContainer button");
    const subTabSections = document.querySelectorAll(".practice-section");

    window.addEventListener("scroll", () => {
      let activeSectionId = "";

      subTabSections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
          activeSectionId = section.id;
        }
      });

      subTabButtons.forEach((btn) => {
        btn.classList.remove("active");
        if (btn.getAttribute("data-tab") === activeSectionId) {
          btn.classList.add("active");
        }
      });
    });
  },

  // Add a new section for managing tips
  createTipsSection() {
    let tipsSection = document.getElementById("tipsSection");

    if (!tipsSection) {
    tipsSection = document.createElement("div");
    tipsSection.id = "tipsSection";
    document.getElementById("sectionsContainer").appendChild(tipsSection);
    }

    //the content of the tips section
    tipsSection.innerHTML = `
      <h3>Manage Eco Tips</h3>
      <div class ="searchTipAd">
        <input type="text" id = "tipSearchInput" placeholder = "Search tips..">
        <label><input type ="checkbox" id="showEnabledTips" checked> Enabled </label>
        <label><input type = "checkbox" id = "showDisabledTips" checked> Disabled </label>
      </div>
      <button id="addNewTipBtn" class="add-button">Add New Tip</button>
      <form id="newTipForm" class="new-practice-form">
        <select id="tipCategory">
          <option value="water">Water</option>
          <option value="energy">Energy</option>
          <option value="waste">Waste</option>
        </select>
        <textarea id="tipContent" placeholder="Enter your eco tip here..." required></textarea>
        <button type="submit">Save Tip</button>
        <button type="button" id="cancelNewTip">Cancel</button>
      </form>
      <div id="tipsList" class="practices-list">
        <p class="no-practice-message">No tips available</p>
      </div>
    `;

    // Add event listeners for the form
    const newTipForm = document.getElementById("newTipForm");
    const addNewTipBtn = document.getElementById("addNewTipBtn");
    const cancelNewTip = document.getElementById("cancelNewTip");

    addNewTipBtn.addEventListener("click", () => {
      newTipForm.style.display = "flex";
    });

    cancelNewTip.addEventListener("click", () => {
      newTipForm.style.display = "none";
    });

    newTipForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const category = document.getElementById("tipCategory").value;
      const content = document.getElementById("tipContent").value.trim();

      if (!content) {
        alert("Please enter a tip.");
        return;
      }

      try {
        const newTip = {
          category,
          content,
          status: "enabled",
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Add the tip to Firestore
        const docRef = await addDoc(collection(db, "ecoTips"), newTip);

        // Add the tip to the UI
        this.renderTip({ id: docRef.id, ...newTip });

        // Reset and hide the form
        newTipForm.reset();
        newTipForm.style.display = "none";
        alert("New tip added successfully.");
      } catch (error) {
        console.error("Error adding new tip:", error);
        alert("Failed to add the tip. Please try again.");
      }
    });

    // Fetch and render existing tips
    this.fetchAndRenderTips();

    const searchInput = document.getElementById("tipSearchInput");
    const showEnabled = document.getElementById("showEnabledTips");
    const showDisabled = document.getElementById("showDisabledTips");

    searchInput.addEventListener("input", () => this.renderFilteredTips());
    showEnabled.addEventListener("change", () => this.renderFilteredTips());
    showDisabled.addEventListener("change", () => this.renderFilteredTips());
  },

  // Open a modal for editing tips
  openEditTipModal(tip, tipElem) {
    let modalOverlay = document.getElementById("editTipModal");
    if (!modalOverlay) {
      modalOverlay = document.createElement("div");
      modalOverlay.id = "editTipModal";

      const modalContent = document.createElement("div");
      modalContent.id = "editTipModalContent";
      modalOverlay.appendChild(modalContent);
      document.body.appendChild(modalOverlay);

      // Attach cancel button listener once
      modalOverlay.addEventListener("click", (e) => {
        if (e.target.id === "editTipModal") {
          this.closeEditTipModal();
        }
      });
    }

    const modalContent = document.getElementById("editTipModalContent");
    modalContent.innerHTML = `
      <h2>Edit Tip</h2>
      <form id="editTipForm">
        <label>Category:</label>
        <select id="editTipCategory">
          <option value="water" ${tip.category === "water" ? "selected" : ""}>Water</option>
          <option value="energy" ${tip.category === "energy" ? "selected" : ""}>Energy</option>
          <option value="waste" ${tip.category === "waste" ? "selected" : ""}>Waste</option>
        </select>
        <label>Content:</label>
        <textarea id="editTipContent">${tip.content}</textarea>
        <div style="text-align:right;">
          <button type="button" id="cancelEditTip">Cancel</button>
          <button type="submit" id="saveEditTip">Save</button>
        </div>
      </form>
    `;

    modalOverlay.style.display = "flex";

    // Attach save button listener
    const form = document.getElementById("editTipForm");
    form.onsubmit = async (e) => {
      e.preventDefault();

      const newCategory = document.getElementById("editTipCategory").value;
      const newContent = document.getElementById("editTipContent").value.trim();

      if (newContent === "") {
        alert("Please enter tip content.");
        return;
      }

      try {
        await updateDoc(doc(db, "ecoTips", tip.id), {
          category: newCategory,
          content: newContent,
          updatedAt: new Date(),
        });

        tipElem.querySelector(".practice-details p").textContent = newContent;
        tipElem.querySelector(".practice-details p:nth-child(2)").textContent = `Category: ${newCategory.charAt(0).toUpperCase() + newCategory.slice(1)}`;

        alert("Tip updated successfully.");
        this.closeEditTipModal();
      } catch (error) {
        console.error("Error updating tip:", error);
        alert("Failed to update the tip. Please try again.");
      }
    };

    // Attach cancel button listener
    document.getElementById("cancelEditTip").onclick = () => {
      this.closeEditTipModal();
    };
  },

  closeEditTipModal() {
    const modalOverlay = document.getElementById("editTipModal");
    if (modalOverlay) {
      modalOverlay.style.display = "none";
    }
  },

  // Render a single tip in the UI
  renderTip(tip) {
    const tipsList = document.getElementById("tipsList");
    const placeholder = tipsList.querySelector(".no-practice-message");
    if (placeholder) placeholder.remove();

    const tipElem = document.createElement("div");
    tipElem.className = "practice-item";
    tipElem.id = `tip-${tip.id}`;
    tipElem.innerHTML = `
      <div class="practice-details">
        <p>Tip: ${tip.content}</p>
        <p>Category: ${tip.category.charAt(0).toUpperCase() + tip.category.slice(1)}</p>
        <p>Status: <span class="practice-status">${tip.status.charAt(0).toUpperCase() + tip.status.slice(1)}</span></p>
      </div>
      <div class="practice-actions">
        <button class="editTip">Edit</button>
        <button class="toggleTip">${tip.status === "enabled" ? "Disable" : "Enable"}</button>
      </div>
    `;

    // Attach event listeners for the buttons
    const editButton = tipElem.querySelector(".editTip");
    editButton.addEventListener("click", () => {
      this.openEditTipModal(tip, tipElem);
    });

    const toggleButton = tipElem.querySelector(".toggleTip");
    toggleButton.addEventListener("click", () => {
      const newStatus = tip.status === "enabled" ? "disabled" : "enabled";

      updateDoc(doc(db, "ecoTips", tip.id), { status: newStatus, updatedAt: new Date() })
        .then(() => {
          tip.status = newStatus;
          tipElem.querySelector(".practice-status").textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
          toggleButton.textContent = newStatus === "enabled" ? "Disable" : "Enable";
          alert("Tip status updated successfully.");
        })
        .catch((error) => {
          console.error("Error updating tip status:", error);
          alert("Failed to update the tip status. Please try again.");
        });
    });

    tipsList.appendChild(tipElem);
  },

  fetchAndRenderTips() {
    const tipsList = document.getElementById("tipsList");
    if (!tipsList) {
      console.error("Tips list element not found.");
      return;
    }

    tipsList.innerHTML = "<p>Loading tips...</p>";

    getDocs(collection(db, "ecoTips"))
      .then(querySnapshot => {
        tipsList.innerHTML = ""; // Clear the tips list

        if (querySnapshot.empty) {
          tipsList.innerHTML = "<p class='no-practice-message'>No tips available</p>";
          this.allTips = [];
          return;
        }
        
        this.allTips = [];
        querySnapshot.forEach(doc => {
          const tipData = doc.data();
          this.allTips.push({ id: doc.id, ...tipData});
        });
        this.renderFilteredTips();
      })
      .catch(error => {
        console.error("Error fetching EcoTips:", error);
        tipsList.innerHTML = "<p class='no-practice-message'>Failed to load tips. Please try again later.</p>";
      });
  },
  
  renderFilteredTips() {
    const tipsList = document.getElementById("tipsList");
    if (!tipsList) return;
    
    // Safely get filter elements
    const searchInput = document.getElementById("tipSearchInput");
    const showEnabledCheckbox = document.getElementById("showEnabledTips");
    const showDisabledCheckbox = document.getElementById("showDisabledTips");
    
    // If any filter elements are missing, show all tips
    if (!searchInput || !showEnabledCheckbox || !showDisabledCheckbox) {
      this.allTips.forEach(tip => this.renderTip(tip));
      return;
    }
    
    const searchValue = searchInput.value.trim().toLowerCase();
    const showEnabled = showEnabledCheckbox.checked;
    const showDisabled = showDisabledCheckbox.checked;
    
    tipsList.innerHTML = ""; // Clear current tips
  
    let filtered = this.allTips.filter(tip => {
      const matchesSearch = tip.content.toLowerCase().includes(searchValue);
      const isEnabled = tip.status === "enabled";
      const isDisabled = tip.status === "disabled";
      
      // Show tips that match search AND match enabled/disabled filters
      return matchesSearch && (
        (showEnabled && isEnabled) || 
        (showDisabled && isDisabled)
      );
    });
    
    if (filtered.length === 0) {
      tipsList.innerHTML = "<p class='no-practice-message'>No tips found.</p>";
      return;
    }
    
    filtered.forEach(tip => this.renderTip(tip));
  }
  
};

// Initialize on DOMContentLoaded.
document.addEventListener("DOMContentLoaded", () => {
  AdminDashboard.init();
});
