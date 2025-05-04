// *******************************
// Firebase & Global Setup
// *******************************
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  where,
  doc,
  setDoc,
  getDoc,
  runTransaction,
  onSnapshot,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBsfV19SLzcVelg5Z5bjp3h1EJiStFLeoI",
  authDomain: "ecowarrior-app-1.firebaseapp.com",
  projectId: "ecowarrior-app-1",
  storageBucket: "ecowarrior-app-1",
  messagingSenderId: "204162169811",
  appId: "1:204162169811:web:3c78268b4add17159c0d26",
  measurementId: "G-66HRM9N0KY",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


// UserDashboard Module

const UserDashboard = {
  init: async function () {
   
    this.updateConnectivityStatus();
    window.addEventListener("online", () => {
      this.updateConnectivityStatus();
      this.syncFeedbackQueue();
      this.syncOfflineComments();
      this.fetchAndRenderPractices();
    });
    window.addEventListener("offline", () => {
      this.updateConnectivityStatus();
    });

    // Greet the user.
    await this.greetUser();

    // Load practices with grouping by category.
    this.fetchAndRenderPractices();

    const syncBtn = document.getElementById("syncPracticesBtn");
    if (syncBtn) {
      syncBtn.addEventListener("click", () => {
        this.fetchAndRenderPractices();
      });
    }

    this.setupFeedbackForm();
    const toggleFeedbackBtn = document.getElementById("toggleFeedbackBtn");
    if (toggleFeedbackBtn) {
      toggleFeedbackBtn.setAttribute("aria-expanded", "false");

      toggleFeedbackBtn.addEventListener("click", () => {
        const feedbackForm = document.getElementById("feedbackForm");
        if (feedbackForm) {
          const isHidden = feedbackForm.classList.toggle("hidden");
          feedbackForm.setAttribute("aria-hidden", isHidden);
          toggleFeedbackBtn.setAttribute(
            "aria-expanded",
            (!isHidden).toString()
          );
        }
      });
    }

    // Attach listeners
    this.attachCommentFormListeners();
    this.attachViewCommentsListeners();

    // Search Functionality
    const searchButton = document.getElementById("searchButton");
    const searchModal = document.getElementById("searchModal");
    const closeSearchModal = document.getElementById("closeSearchModal");
    const searchInput = document.getElementById("searchInput");
    const searchResults = document.getElementById("searchResults");

    searchButton.addEventListener("click", () => {
      searchModal.classList.remove("hidden");
      searchInput.focus();
    });

    closeSearchModal.addEventListener("click", () => {
      searchModal.classList.add("hidden");
      searchInput.value = "";
      searchResults.innerHTML = "";
    });

    // Enhance search results to include category information
    searchInput.addEventListener("input", async (e) => {
      const query = e.target.value.toLowerCase().trim();
      searchResults.innerHTML = "<p>Searching...</p>";

      if (!query) {
        searchResults.innerHTML = "";
        return;
      }

      const tipsSnapshot = await getDocs(collection(db, "ecoTips"));
      const practicesSnapshot = await Promise.all([
        getDocs(collection(db, "waterPractices")),
        getDocs(collection(db, "wastePractices")),
        getDocs(collection(db, "energyPractices")),
      ]);

      const tips = tipsSnapshot.docs
        .map((doc) => doc.data())
        .filter((tip) => tip.status === "enabled" && tip.content.toLowerCase().includes(query));

      const practices = practicesSnapshot.flatMap((snapshot, index) => {
        const category = ["water", "waste", "energy"][index];
        return snapshot.docs
          .map((doc) => ({ ...doc.data(), category }))
          .filter((practice) => practice.status === "enabled" && practice.title.toLowerCase().includes(query));
      });

      if (tips.length === 0 && practices.length === 0) {
        searchResults.innerHTML = "<p>No results found.</p>";
        return;
      }

      searchResults.innerHTML = "";

      tips.forEach((tip) => {
        const tipElement = document.createElement("div");
        tipElement.textContent = tip.content;
        searchResults.appendChild(tipElement);
      });

      practices.forEach((practice) => {
        const practiceElement = document.createElement("div");
        practiceElement.textContent = practice.title;
        practiceElement.setAttribute("data-category", practice.category);
        practiceElement.setAttribute("data-practice-id", practice.id);
        practiceElement.classList.add("search-result-item");
        searchResults.appendChild(practiceElement);
      });
    });

    // Handle click on search results
    searchResults.addEventListener("click", (e) => {
      const target = e.target;
      if (target.classList.contains("search-result-item")) {
        const category = target.getAttribute("data-category");
        const practiceId = target.getAttribute("data-practice-id");

        // Navigate to the category and scroll to the practice
        UserDashboard.fetchAndRenderPractices().then(() => {
          const categoryContent = document.getElementById("categoryContent");
          const categoriesContainer = document.getElementById("categoriesContainer");
          const categoryTitle = document.getElementById("categoryTitle");
          const categoryPractices = document.getElementById("categoryPractices");

          // Show the category content
          categoriesContainer.classList.add("hidden");
          categoryContent.classList.remove("hidden");
          categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1) + " Practices";

          // Scroll to the specific practice
          const practiceElement = document.getElementById(`practice-${practiceId}`);
          if (practiceElement) {
            practiceElement.scrollIntoView({ behavior: "smooth" });
            practiceElement.classList.add("highlight"); // Optionally highlight the practice
            setTimeout(() => practiceElement.classList.remove("highlight"), 2000); // Remove highlight after 2 seconds
          }
        });
      }
    });
  },

  // ----------------------------
  // User Greeting
  // ----------------------------
  greetUser: async function () {
    const nameGreet = document.getElementById("nameGreet");
    const ecoWarriorID = document.getElementById("ecowarriorID");

    if (!nameGreet || !ecoWarriorID) {
      console.error("User header elements missing.");
      return;
    }

    const storedID = localStorage.getItem("ecoWarriorID");

    if (!storedID) {
      console.error("No EcoWarrior ID found in localStorage.");
      nameGreet.textContent = "Welcome, Guest!";
      ecoWarriorID.textContent = "Please register to get your EcoWarrior ID.";
      return;
    }

    try {
      console.log(`Fetching user data for EcoWarrior ID: ${storedID}`);
      const userDoc = await getDoc(doc(db, "EcoWarriors", storedID));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("User data retrieved:", userData);
        nameGreet.textContent = `Welcome, ${userData.name || "Guest"}!`;
        ecoWarriorID.textContent = `Your EcoWarrior ID: ${storedID}`;
      } else {
        console.error(`No user found with EcoWarrior ID: ${storedID}`);
        nameGreet.textContent = "Welcome, Guest!";
        ecoWarriorID.textContent = "Please register to get your EcoWarrior ID.";
      }
    } catch (error) {
      console.error("Error fetching user data from Firestore:", error);
      nameGreet.textContent = "Welcome, Guest!";
      ecoWarriorID.textContent = "Please register to get your EcoWarrior ID.";
    }
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

      this.syncFeedbackQueue();
      this.syncOfflineComments();
      this.fetchAndRenderPractices();
    } else {
      statusEl.textContent = "You're in Offline mode";
      statusEl.className = "offline";
    }
  },

 
  // Fetch and Render Practices (Grouped by Category)
 
  async fetchAndRenderPractices() {
    const mainContent = document.getElementById("mainContent");
    const categoryContent = document.getElementById("categoryContent");
    const backToCategoriesBtn = document.getElementById("backToCategoriesBtn");
    const categoryTitle = document.getElementById("categoryTitle");
    const categoryPractices = document.getElementById("categoryPractices");
    const tipsSection = document.getElementById("tipsSection");
    const practiceSection = document.getElementById("practiceSection");
    const categoriesContainer = document.getElementById("categoriesContainer");
    const feedbackSection = document.getElementById("feedbackSection");

    if (!mainContent || !categoryContent) {
      console.error("Main content or category content not found.");
      return;
    }

    const categoriesList = document.getElementById("categoriesList");
    categoriesList.innerHTML = "<p>Loading categories...</p>";

    const categoryMapping = {
      water: { title: "Water Conservation", collection: "waterPractices" },
      waste: { title: "Waste Management", collection: "wastePractices" },
      energy: { title: "Energy Saving", collection: "energyPractices" },
    };

    const categoryKeys = Object.keys(categoryMapping);

    try {
      categoriesList.innerHTML = ""; 

      categoryKeys.forEach((catKey) => {
        const { title } = categoryMapping[catKey];
        const categoryCard = document.createElement("div");
        categoryCard.classList.add("category-card");
        categoryCard.setAttribute("data-category-key", catKey);
        categoryCard.innerHTML = `<h3>${title}</h3>`;
        categoriesList.appendChild(categoryCard);

        categoryCard.addEventListener("click", async () => {
          console.log(`Category clicked: ${catKey}`);

          categoriesContainer.classList.add("hidden");
          categoryContent.classList.remove("hidden");
          mainContent.innerHTML = "";
          mainContent.appendChild(categoryContent); 
          categoryContent.classList.add("active");
          categoryTitle.textContent = title;
          categoryPractices.innerHTML = "<p>Loading practices...</p>";

          // Change background to practicesbg.png
          document.body.style.background = "url('practicesbg.png') no-repeat center center fixed";
          document.body.style.backgroundSize = "cover";
          document.body.style.transition = "background 0.5s ease";

          // Apply transparency to content
          const sections = document.querySelectorAll("header, main, footer, section");
          sections.forEach(section => {
            section.style.background = "rgba(255, 255, 255, 0.1)";
            section.style.borderRadius = "10px";
            section.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
          });

          const { collection: colName } = categoryMapping[catKey];
          try {
            const snapshot = await getDocs(collection(db, colName));
            const practices = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              if (data.status === "enabled" || data.enabled === true) {
                practices.push({ id: doc.id, ...data });
              }
            });

            categoryPractices.innerHTML = practices.length
              ? practices
                  .map(
                    (practice) => `
                  <div class="practice-item" id="practice-${practice.id}">
                    <h3>${practice.title}</h3>
                    <p>${practice.description}</p>
                    <div class="feedback-buttons">
                      <button class="like-btn" data-practice-id="${practice.id}" data-category="${catKey}">
                        👍 <span class="like-count">${practice.like || 0}</span>
                      </button>
                      <button class="dislike-btn" data-practice-id="${practice.id}" data-category="${catKey}">
                        👎 <span class="dislike-count">${practice.dislike || 0}</span>
                      </button>
                    </div>
                    <div class="comments-section">
                      <button class="view-comments-btn" data-practice-id="${practice.id}">
                        View Comments
                      </button>
                      <ul id="commentsList-${practice.id}" class="comments-list hidden"></ul>
                      <form class="comment-form" data-practice-id="${practice.id}">
                        <textarea class="comment-input" placeholder="Add a comment..."></textarea>
                        <button type="submit" class="comment-form-button">Submit</button>
                      </form>
                    </div>
                </div>                    
                `
                  )
                  .join("")
              : "<p>No practices available for this category.</p>";

              UserDashboard.attachViewCommentsListeners();
              UserDashboard.attachCommentFormListeners();

              practices.forEach((practice) => {
                fetchFeedbackCounts(practice.id, catKey); // Pass the category key to fetchFeedbackCounts
              });
              
          } catch (error) {
            console.error("Error fetching practices:", error);
            categoryPractices.innerHTML = "<p>Failed to load practices. Please try again later.</p>";
          }
        });
      });

      backToCategoriesBtn.addEventListener("click", () => {
        categoryContent.classList.add("hidden"); // Hide category content
        categoriesContainer.classList.remove("hidden"); // Show categories list
        tipsSection.classList.remove("hidden"); // Show tips section
        practiceSection.classList.remove("hidden");

        mainContent.innerHTML = "";
        mainContent.appendChild(tipsSection);
        mainContent.appendChild(practiceSection);
        mainContent.appendChild(feedbackSection);
       
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      categoriesList.innerHTML = "<p>Failed to load categories.</p>";
    }
  },

  // ----------------------------
  // Fetch or retrieving comments
  // ----------------------------
  async fetchComments(practiceId) {
    const commentsList = document.getElementById(`commentsList-${practiceId}`);
    if (!commentsList) {
      console.error(`Comments list element not found for practice ID: ${practiceId}`);
      return;
    }

    commentsList.innerHTML = "<li>Loading comments...</li>";

    try {
      const commentsSnapshot = await getDocs(
        query(collection(db, "comments"), where("practiceId", "==", practiceId))
      );

      commentsList.innerHTML = ""; // Clear loading message
      if (commentsSnapshot.empty) {
        commentsList.innerHTML = "<li>No comments available.</li>";
        return;
      }

      commentsSnapshot.forEach((doc) => {
        const commentData = doc.data();
        const listItem = document.createElement("li");
        listItem.textContent = `${commentData.name} (${commentData.ecoWarriorID}): ${commentData.comment}`;
        commentsList.appendChild(listItem);
      });
    } catch (error) {
      console.error("Error fetching comments:", error);
      commentsList.innerHTML = "<li>Failed to load comments.</li>";
    }
  },

  async syncOfflineComments() {
    const offlineComments = JSON.parse(localStorage.getItem("offlineComments"));
    if (offlineComments && offlineComments.length > 0) {
      for (const { practiceId, comment, name, ecoWarriorID } of offlineComments) {
        try {
          await addDoc(collection(db, "comments"), {
            practiceId,
            comment,
            name,
            ecoWarriorID,
            timestamp: new Date(),
          });
        } catch (error) {
          console.error("Error syncing offline comment:", error);
          return;
        }
      }
      localStorage.removeItem("offlineComments");
    }
  },

  // ----------------------------
  // Attach Comment Form Listeners
  // ----------------------------
  attachCommentFormListeners() {
    const commentForms = document.querySelectorAll(".comment-form");
    commentForms.forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const practiceId = form.getAttribute("data-practice-id");
        const commentInput = form.querySelector(".comment-input");
        const comment = commentInput.value.trim();

        if (!comment) {
          alert("Please enter a comment.");
          return;
        }

        const name = localStorage.getItem("nameUser") || "Anonymous";
        const ecoWarriorID = localStorage.getItem("ecoWarriorID") || "Unknown";
        const lastFourDigits = ecoWarriorID.slice(-4);

        await addComment(practiceId, comment, name, lastFourDigits);

        commentInput.value = ""; // Clear the input field
      });
    });
  },

  attachViewCommentsListeners() {
    const viewCommentsButtons = document.querySelectorAll(".view-comments-btn");
    viewCommentsButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const practiceId = button.getAttribute("data-practice-id");
        const commentsSection = document.getElementById(`commentsList-${practiceId}`);
        if (commentsSection) {
          const isHidden = commentsSection.classList.toggle("hidden");
          if (!isHidden) {
            UserDashboard.fetchComments(practiceId); // Corrected reference
          }
        }
      });
    });
  },

  // Feedback Form Handling

  setupFeedbackForm() {
    const feedbackForm = document.getElementById("feedbackForm");
    if (!feedbackForm) {
      console.error("Feedback form element is missing in the DOM.");
      return;
    }

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

      const feedbackId = `FB-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const feedbackObject = {
        feedbackId,
        name: user
          ? user.displayName || localStorage.getItem("nameUser")
          : localStorage.getItem("nameUser") || "Anonymous",
        ecoWarriorID: user
          ? user.uid || localStorage.getItem("ecowarriorID")
          : localStorage.getItem("ecowarriorID"),
        feedback,
        status: "notRead",
        timestamp: new Date(),
      };

      if (!navigator.onLine) {
        this.queueFeedback(feedbackObject);
        showMessage(
          "You're offline. Your feedback has been queued and will be submitted when you're online.",
          "success"
        );
        feedbackForm.reset();
        return;
      }

      try {
        await addDoc(collection(db, "userFeedback"), feedbackObject);
        showMessage("Thank you for your feedback! It has been saved.", "success");
        feedbackForm.reset();
      } catch (error) {
        console.error("Error saving feedback online:", error);
        showMessage(
          "Failed to save feedback. It will be stored and retried later.",
          "error"
        );
        this.queueFeedback(feedbackObject);
      }
    });
  },

  queueFeedback(feedbackObject) {
    const feedbackQueue =
      JSON.parse(localStorage.getItem("feedbackQueue")) || [];
    feedbackQueue.push(feedbackObject);
    localStorage.setItem("feedbackQueue", JSON.stringify(feedbackQueue));
  },

  async syncFeedbackQueue() {
    const feedbackQueue = JSON.parse(localStorage.getItem("feedbackQueue"));
    if (feedbackQueue && feedbackQueue.length > 0) {
      for (const feedbackObject of feedbackQueue) {
        try {
          await addDoc(collection(db, "userFeedback"), feedbackObject);
        } catch (error) {
          console.error("Error syncing feedback:", error);
          return;
        }
      }
      localStorage.removeItem("feedbackQueue");
    }
  },
};


// Handling of Like and Dislike Actions

async function handleFeedback(practiceId, type, category) {
  console.log(`Handling ${type} for practice ID: ${practiceId} in category: ${category}`);

  // Retrieve the user's name and EcoWarrior ID
  const name = auth.currentUser
    ? auth.currentUser.displayName || localStorage.getItem("nameUser") || "Anonymous"
    : localStorage.getItem("nameUser") || "Anonymous";

  const ecoWarriorID = auth.currentUser
    ? auth.currentUser.uid || localStorage.getItem("ecoWarriorID")
    : localStorage.getItem("ecoWarriorID") || "Unknown";

  if (ecoWarriorID === "Unknown") {
    alert("You must be signed in or registered to provide feedback.");
    return;
  }

  const practiceRef = doc(db, `${category}Practices`, practiceId);
  const userFeedbackRef = doc(practiceRef, "userFeedback", ecoWarriorID);

  const likeBtn = document.querySelector(`#practice-${practiceId} .like-btn`);
  const dislikeBtn = document.querySelector(`#practice-${practiceId} .dislike-btn`);
  const likeCountElem = document.querySelector(`#practice-${practiceId} .like-count`);
  const dislikeCountElem = document.querySelector(`#practice-${practiceId} .dislike-count`);

  try {
    const userFeedbackDoc = await getDoc(userFeedbackRef);
    const practiceDoc = await getDoc(practiceRef);

    if (!practiceDoc.exists()) {
      console.error(`Practice with ID ${practiceId} does not exist in Firestore.`);
      alert("The selected practice does not exist.");
      return;
    }

    // Initialize current like and dislike counts
    const practiceData = practiceDoc.data();
    let currentLikeCount = practiceData.like || 0;
    let currentDislikeCount = practiceData.dislike || 0;

    let userAction = null; // Track the user's action (like, dislike, or remove)

    // Optimistic UI Update
    if (type === "like") {
      likeBtn.classList.add("active");
      dislikeBtn.classList.remove("active");
      likeCountElem.textContent = currentLikeCount + 1;
      if (userFeedbackDoc.exists() && userFeedbackDoc.data().type === "dislike") {
        dislikeCountElem.textContent = currentDislikeCount - 1;
      }
    } else if (type === "dislike") {
      dislikeBtn.classList.add("active");
      likeBtn.classList.remove("active");
      dislikeCountElem.textContent = currentDislikeCount + 1;
      if (userFeedbackDoc.exists() && userFeedbackDoc.data().type === "like") {
        likeCountElem.textContent = currentLikeCount - 1;
      }
    }

    if (userFeedbackDoc.exists()) {
      const userFeedback = userFeedbackDoc.data();

      if (userFeedback.type === type) {
        // User is removing their like/dislike
        if (type === "like") {
          currentLikeCount -= 1;
        } else {
          currentDislikeCount -= 1;
        }
        await deleteDoc(userFeedbackRef); // Remove the user's feedback
        userAction = "remove";
      } else {
        // User is switching from like to dislike or vice versa
        if (type === "like") {
          currentLikeCount += 1;
          currentDislikeCount -= 1;
        } else {
          currentLikeCount -= 1;
          currentDislikeCount += 1;
        }
        await setDoc(userFeedbackRef, { type, name, ecoWarriorID }, { merge: true });
        userAction = type;
      }
    } else {
      // User is liking or disliking for the first time
      if (type === "like") {
        currentLikeCount += 1;
      } else {
        currentDislikeCount += 1;
      }
      await setDoc(userFeedbackRef, { type, name, ecoWarriorID });
      userAction = type;
    }

    // Update the practice's like and dislike counts
    await updateDoc(practiceRef, {
      like: currentLikeCount,
      dislike: currentDislikeCount,
    });

    console.log(`${type} updated for practice ID: ${practiceId}`);
    updateFeedbackUI(practiceId, currentLikeCount, currentDislikeCount, userAction);
  } catch (error) {
    console.error("Error updating feedback:", error);
    alert("An error occurred while updating feedback. Please try again.");
  }
}

// Update the UI for Like and Dislike Counts
function updateFeedbackUI(practiceId, likeCount, dislikeCount, userAction) {
  console.log(`Updating UI for practice ID: ${practiceId}`);
  console.log(`Like count: ${likeCount}, Dislike count: ${dislikeCount}, User action: ${userAction}`);

  const likeBtn = document.querySelector(`#practice-${practiceId} .like-btn`);
  const dislikeBtn = document.querySelector(`#practice-${practiceId} .dislike-btn`);


  const likeCountElem = document.querySelector(`#practice-${practiceId} .like-count`);
  const dislikeCountElem = document.querySelector(`#practice-${practiceId} .dislike-count`);

  // Update the like and dislike counts in the UI
  if (likeCountElem) likeCountElem.textContent = likeCount;
  if (dislikeCountElem) dislikeCountElem.textContent = dislikeCount;

  // Update button states
  if (userAction === "like") {
    likeBtn.classList.add("active");
    dislikeBtn.classList.remove("active");
  } else if (userAction === "dislike") {
    dislikeBtn.classList.add("active");
    likeBtn.classList.remove("active");
  } else if (userAction === "remove") {
    likeBtn.classList.remove("active");
    dislikeBtn.classList.remove("active");
  }
}

// Attach Event Listeners to Like and Dislike Buttons
document.addEventListener("click", (event) => {
  if (event.target.classList.contains("like-btn")) {
    const practiceId = event.target.getAttribute("data-practice-id");
    const category = event.target.getAttribute("data-category");
    console.log(`Like button clicked for practice ID: ${practiceId}`);
    handleFeedback(practiceId, "like", category);
  } else if (event.target.classList.contains("dislike-btn")) {
    const practiceId = event.target.getAttribute("data-practice-id");
    const category = event.target.getAttribute("data-category");
    console.log(`Dislike button clicked for practice ID: ${practiceId}`);
    handleFeedback(practiceId, "dislike", category);
  }
});

// Fetch and Display Initial Like and Dislike Counts
async function fetchFeedbackCounts(practiceId, category) {
  const practiceRef = doc(db, `${category}Practices`, practiceId); // Use the correct category collection
  try {
    const practiceDoc = await getDoc(practiceRef);
    if (practiceDoc.exists()) {
      const data = practiceDoc.data();
      document.querySelector(
        `#practice-${practiceId} .like-count`
      ).textContent = data.like || 0;
      document.querySelector(
        `#practice-${practiceId} .dislike-count`
      ).textContent = data.dislike || 0;
    } else {
      console.warn(`Practice with ID ${practiceId} does not exist in ${category}Practices.`);
    }
  } catch (error) {
    console.error(`Error fetching feedback counts for practice ID ${practiceId}:`, error);
  }
}

// Real-time updates for Like and Dislike Counts
function setupRealTimeUpdates(category) {
  const practicesRef = collection(db, `${category}Practices`);
  onSnapshot(practicesRef, (snapshot) => {
    if (snapshot.empty) {
      console.warn(`No practices found in the '${category}Practices' collection.`);
      return;
    }
    snapshot.forEach((doc) => {
      const data = doc.data();
      const practiceId = doc.id;
      const likeCountElem = document.querySelector(`#practice-${practiceId} .like-count`);
      const dislikeCountElem = document.querySelector(`#practice-${practiceId} .dislike-count`);
      if (likeCountElem) likeCountElem.textContent = data.like || 0;
      if (dislikeCountElem) dislikeCountElem.textContent = data.dislike || 0;
    });
  });
}


// Initializing User Dashboard After DOM Loads

document.addEventListener("DOMContentLoaded", () => {
  const nameGreet = document.getElementById("nameGreet");
  const ecoWarriorID = document.getElementById("ecowarriorID");
  const exitBtn = document.getElementById("exitBtn");

  UserDashboard.init();

  if (!nameGreet || !ecoWarriorID) {
    console.error("User header elements missing.");
  } else {
    console.log("User header elements found.");
  }

  if (!exitBtn) {
    console.error("Exit button not found in the DOM.");
  } else {
    console.log("Exit button found.");
    exitBtn.addEventListener("click", () => {
      const confirmExit = confirm("Are you sure you want to exit?");
      if (confirmExit) {
        window.location.href = "UserSelectR.html";
      }
    });
  }

  UserDashboard.greetUser();
  fetchAndRenderTips();
});

// Attach View Comments Listeners
function attachViewCommentsListeners() {
  const viewCommentsButtons = document.querySelectorAll(".view-comments-btn");
  viewCommentsButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      const practiceId = button.getAttribute("data-practice-id");
      const commentsSection = document.getElementById(`commentsList-${practiceId}`);
      if (commentsSection) {
        const isHidden = commentsSection.classList.toggle("hidden");
        if (!isHidden) {
          UserDashboard.fetchComments(practiceId); 
        }
      }
    });
  });
}


//Comment Function Area

async function addComment(practiceId, comment, name, ecoWarriorID) {
  try {
    await addDoc(collection(db, "comments"), {
      practiceId,
      comment,
      name,
      ecoWarriorID,
      timestamp: new Date(),
    });
    console.log("Comment added successfully.");
    UserDashboard.fetchComments(practiceId); 
  } catch (error) {
    console.error("Error adding comment:", error);
  }
}

async function fetchAndRenderTips() {
  const categories = ["water", "energy", "waste"];
  const tipsContainer = document.getElementById("tipsContainer");

  // Clear the container before rendering
  tipsContainer.innerHTML = "";

  try {
    for (const category of categories) {
      // Fetch tips for the current category
      const querySnapshot = await getDocs(
        query(
          collection(db, "ecoTips"),
          where("category", "==", category),
          where("status", "==", "enabled")
        )
      );

      const tips = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Skip rendering if no tips are available for the category
      if (tips.length === 0) continue;

      // Create a container for the category
      const categoryContainer = document.createElement("div");
      categoryContainer.className = "tips-category";
      categoryContainer.innerHTML = `<h3>${category.charAt(0).toUpperCase() + category.slice(1)} Tips</h3>`;

      // Create a swiper container for the tips
      const swiper = document.createElement("div");
      swiper.className = "swiper";

      // Render each tip as a card
      tips.forEach((tip) => {
        const card = document.createElement("div");
        card.className = "tip-card";
        card.textContent = tip.content;
        swiper.appendChild(card);
      });

      categoryContainer.appendChild(swiper);
      tipsContainer.appendChild(categoryContainer);
    }
  } catch (error) {
    console.error("Error fetching tips:", error);
    tipsContainer.innerHTML = "<p>Failed to load tips. Please try again later.</p>";
  }
}

