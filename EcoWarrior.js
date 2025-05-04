(function() {
  // Role Selection Events
  document.getElementById('userBox').addEventListener('click', function () {
    localStorage.setItem('role', 'user');
    window.location.href = 'UserSelectR.html';
  });

  document.getElementById('adminBox').addEventListener('click', function () {
    localStorage.setItem('role', 'admin');
    window.location.href = 'AdminSelectL.html';
  });

  // Offline Practices Data
  const practices = {
    water: [
      "Fix leaks in faucets and pipes.",
      "Collect rainwater for gardening.",
      "Install water-efficient fixtures.",
      "Turn off the tap while brushing your teeth.",
      "Reuse greywater for landscaping.",
      "Use a bucket instead of a hose for washing.",
      "Monitor your water usage.",
      "Water plants early in the morning.",
      "Educate your family on water conservation.",
      "Opt for drought-resistant plants."
    ],
    electricity: [
      "Turn off lights when not in use.",
      "Unplug electronics when idle.",
      "Use energy-efficient LED bulbs.",
      "Wash clothes in cold water.",
      "Use smart power strips.",
      "Maintain AC units regularly.",
      "Optimize computer settings for energy saving.",
      "Consider solar-powered lights.",
      "Replace old appliances with efficient ones.",
      "Maximize natural light during the day."
    ],
    waste: [
      "Recycle paper, plastic, and metal.",
      "Compost your kitchen waste.",
      "Reduce single-use plastics.",
      "Carry reusable bags.",
      "Donate unused items.",
      "Buy in bulk to reduce packaging waste.",
      "Participate in community cleanups.",
      "Avoid disposable utensils.",
      "Repair items instead of discarding them.",
      "Dispose of hazardous waste properly."
    ]
  };

  // Populate Offline Content
  function populateOfflineContent() {
    const waterList = document.getElementById("water-list");
    const electricityList = document.getElementById("electricity-list");
    const wasteList = document.getElementById("waste-list");

    practices.water.forEach(practice => {
      const li = document.createElement("li");
      li.textContent = practice;
      waterList.appendChild(li);
    });

    practices.electricity.forEach(practice => {
      const li = document.createElement("li");
      li.textContent = practice;
      electricityList.appendChild(li);
    });

    practices.waste.forEach(practice => {
      const li = document.createElement("li");
      li.textContent = practice;
      wasteList.appendChild(li);
    });
  }

  // Show Online Prompt
  function showOnlinePrompt() {
    const onlineNotification = document.getElementById("online-notification");
    onlineNotification.style.display = "block";

    document.getElementById("switchOnline").addEventListener("click", () => {
      sessionStorage.setItem("preferredMode", "online");
      location.reload(); // Refresh the page to load online content
    });

    document.getElementById("stayOffline").addEventListener("click", () => {
      onlineNotification.style.display = "none";
    });
  }

  // Update Connectivity Status
  function updateConnectivityStatus() {
    console.log("Connectivity status updated. Online:", navigator.onLine);
    if (navigator.onLine) {
      if (sessionStorage.getItem("preferredMode") !== "online") {
        sessionStorage.removeItem("preferredMode");
        document.getElementById("online-content").style.display = "none";
        document.getElementById("offline-content").style.display = "block";
        showOnlinePrompt(); // Show the online notification banner
      } else {
        document.getElementById("online-content").style.display = "block";
        document.getElementById("offline-content").style.display = "none";
      }
    } else {
      document.getElementById("online-content").style.display = "none";
      document.getElementById("offline-content").style.display = "block";
      sessionStorage.removeItem("preferredMode");
    }
  }

  // Event Listeners
  window.addEventListener("load", () => {
    console.log("Page loaded.");
    populateOfflineContent();
    updateConnectivityStatus();
  });

  window.addEventListener("online", () => {
    console.log("Online event fired.");
    updateConnectivityStatus();
  });

  window.addEventListener("offline", () => {
    console.log("Offline event fired.");
    updateConnectivityStatus();
  });
})();

// Service Worker Registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(function (registration) {
        console.log("ServiceWorker successful with scope: ", registration.scope);
      })
      .catch(function (err) {
        console.log("ServiceWorker registration failed:", err);
      });
  });
}
