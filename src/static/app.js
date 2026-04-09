document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const signupLockedMessage = document.getElementById("signup-locked-message");
  const messageDiv = document.getElementById("message");
  const loginForm = document.getElementById("login-form");
  const logoutButton = document.getElementById("logout-button");
  const sessionActions = document.getElementById("session-actions");
  const authStatus = document.getElementById("auth-status");
  const currentUserLabel = document.getElementById("current-user");
  const authTokenStorageKey = "mergington-auth-token";
  const managementRoles = ["club_admin", "supervisor", "institution_admin"];

  let authToken = localStorage.getItem(authTokenStorageKey);
  let currentUser = null;

  function showMessage(text, tone) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${tone}`;
    messageDiv.classList.remove("hidden");

    window.clearTimeout(showMessage.timeoutId);
    showMessage.timeoutId = window.setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function getAuthHeaders() {
    return authToken
      ? {
          Authorization: `Bearer ${authToken}`,
        }
      : {};
  }

  function canManageActivities() {
    return currentUser && managementRoles.includes(currentUser.role);
  }

  function renderAuthState() {
    const manager = canManageActivities();

    if (currentUser) {
      authStatus.textContent = `${currentUser.name} is signed in as ${currentUser.role}.`;
      currentUserLabel.textContent = `Signed in as ${currentUser.username}`;
      loginForm.classList.add("hidden");
      sessionActions.classList.remove("hidden");
    } else {
      authStatus.textContent =
        "Not signed in. Students can browse, but only staff can manage registrations.";
      currentUserLabel.textContent = "";
      loginForm.classList.remove("hidden");
      sessionActions.classList.add("hidden");
    }

    signupForm.classList.toggle("hidden", !manager);
    signupLockedMessage.classList.toggle("hidden", manager);
  }

  async function loadSession() {
    if (!authToken) {
      currentUser = null;
      renderAuthState();
      return;
    }

    try {
      const response = await fetch("/auth/session", {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Session expired");
      }

      const session = await response.json();
      currentUser = session.user;
    } catch (error) {
      authToken = null;
      currentUser = null;
      localStorage.removeItem(authTokenStorageKey);
    }

    renderAuthState();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        canManageActivities()
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">Remove</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "Login failed", "error");
        return;
      }

      authToken = result.access_token;
      currentUser = result.user;
      localStorage.setItem(authTokenStorageKey, authToken);
      loginForm.reset();
      renderAuthState();
      fetchActivities();
      showMessage(`Signed in as ${result.user.username}.`, "success");
    } catch (error) {
      showMessage("Failed to sign in. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  logoutButton.addEventListener("click", async () => {
    try {
      if (authToken) {
        await fetch("/auth/logout", {
          method: "POST",
          headers: getAuthHeaders(),
        });
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }

    authToken = null;
    currentUser = null;
    localStorage.removeItem(authTokenStorageKey);
    renderAuthState();
    fetchActivities();
    showMessage("Signed out.", "info");
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  async function initializeApp() {
    await loadSession();
    await fetchActivities();
  }

  initializeApp();
});
