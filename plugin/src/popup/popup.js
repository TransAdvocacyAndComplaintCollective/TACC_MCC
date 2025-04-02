// Use the chrome API for compatibility
if (typeof browser === "undefined") {
  var browser = chrome;
}

document.addEventListener("DOMContentLoaded", async () => {
  // -------------------------------
  // Check privacy policy acceptance
  // -------------------------------
  const container = document.getElementById("container");
  let privacyPolicyAccepted = false;
  try {
    const result = await browser.storage.local.get("privacyPolicyAccepted");
    privacyPolicyAccepted = result.privacyPolicyAccepted || false;
  } catch (error) {
    console.error("Error checking privacy policy status:", error);
  }
  if (!privacyPolicyAccepted) {
    const privacyPolicyDiv = document.createElement("div");
    privacyPolicyDiv.id = "privacy-policy-notice";
    privacyPolicyDiv.style.backgroundColor = "#f8d7da";
    privacyPolicyDiv.style.border = "1px solid #f5c2c7";
    privacyPolicyDiv.style.color = "#842029";
    privacyPolicyDiv.style.padding = "10px";
    privacyPolicyDiv.style.marginTop = "30px";
    privacyPolicyDiv.style.marginBottom = "30px";
    privacyPolicyDiv.style.textAlign = "center";
    privacyPolicyDiv.style.fontSize = "16px";
    const privacyPolicyLink = document.createElement("a");
    privacyPolicyLink.href = "init/init.html";
    privacyPolicyLink.target = "_blank";
    privacyPolicyLink.textContent = "To enable this extension please CLICK HERE to accept our Privacy Policy.";
    privacyPolicyDiv.appendChild(privacyPolicyLink);
    container.prepend(privacyPolicyDiv);
    return; // Stop further execution until privacy policy is accepted
  }

  // -------------------------------
  // Help link
  // -------------------------------
  const helpLink = document.getElementById("help-link");
  if (helpLink) {
    helpLink.addEventListener("click", (e) => {
      e.preventDefault();
      const helpUrl = browser.runtime.getURL("help/help.html");
      browser.tabs.create({ url: helpUrl });
    });
  }

  // -------------------------------
  // Update version text (optional Easter Egg)
  // -------------------------------
  const versionElement = document.getElementById("version");
  // (Optional: add your easter egg logic here)

  // -------------------------------
  // PART 1: Load and Render Complaints Table
  // -------------------------------
  const tableBody = document.querySelector("#complaintsTable tbody");

  // Define the storage keys for each complaint type.
  const complaintKeys = [
    "bbcComplaints",
    "ipsoComplaints",
    "ofcomComplaints",
    "policeComplaints"
  ];

  // Function to load complaints from all keys
  async function loadComplaints() {
    let allComplaints = [];
    try {
      const storageData = await browser.storage.local.get(complaintKeys);
      complaintKeys.forEach(key => {
        const complaints = storageData[key] || [];
        // Add a property 'source' indicating which key they came from.
        complaints.forEach(c => {
          c.source = key.replace("Complaints", ""); // e.g. "bbc", "ipso", etc.
        });
        allComplaints = allComplaints.concat(complaints);
      });
    } catch (error) {
      console.error("Error loading complaints from storage:", error);
    }
    return allComplaints;
  }

  // Function to render the complaints table
  async function renderTable() {
    const complaints = await loadComplaints();
    tableBody.innerHTML = "";
    if (complaints.length === 0) {
      const placeholderRow = document.createElement("tr");
      const placeholderCell = document.createElement("td");
      placeholderCell.colSpan = 6;
      placeholderCell.textContent = "No complaints stored.";
      placeholderRow.appendChild(placeholderCell);
      tableBody.appendChild(placeholderRow);
      return;
    }
    // Optionally, sort by dateRetrieved descending
    complaints.sort((a, b) => b.dateRetrieved - a.dateRetrieved);
    complaints.forEach((complaint, index) => {
      const row = document.createElement("tr");
      // Subject
      const subjectCell = document.createElement("td");
      subjectCell.textContent = complaint.subject || "N/A";
      row.appendChild(subjectCell);
      // TACC Record ID (complaint id)
      const idCell = document.createElement("td");
      const idLink = document.createElement("a");
      idLink.href = "https://tacc.org.uk/media-complaints-response-form/?uuid=" + complaint.id;
      idLink.textContent = complaint.id || "N/A";
      idLink.target = "_blank";
      idCell.appendChild(idLink);
      row.appendChild(idCell);
      // Source
      const sourceCell = document.createElement("td");
      sourceCell.textContent = complaint.source ? complaint.source.toUpperCase() : "Unknown";
      row.appendChild(sourceCell);
      // Date
      const dateCell = document.createElement("td");
      dateCell.textContent = complaint.dateRetrieved
        ? new Date(complaint.dateRetrieved).toLocaleString()
        : "N/A";
      row.appendChild(dateCell);
      // Action (Delete button)
      const actionCell = document.createElement("td");
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", async () => {
        // Delete complaint from the appropriate storage key
        const sourceKey = complaint.source + "Complaints"; // e.g. "bbcComplaints"
        try {
          const storageData = await browser.storage.local.get(sourceKey);
          let complaintsArray = storageData[sourceKey] || [];
          // Filter out the complaint with the matching id
          complaintsArray = complaintsArray.filter(c => c.id !== complaint.id);
          await browser.storage.local.set({ [sourceKey]: complaintsArray });
          // Re-render table
          renderTable();
        } catch (error) {
          console.error("Error updating storage after deletion:", error);
        }
      });
      actionCell.appendChild(deleteButton);
      row.appendChild(actionCell);
      tableBody.appendChild(row);
    });
  }
  renderTable();

  // -------------------------------
  // PART 2: Check Problematic Stories
  // -------------------------------
  const sendStatus = document.getElementById("send-status");
  const checkStoriesBtn = document.getElementById("check-stories-btn");
  const storiesList = document.getElementById("stories-list");

  function updateSendStatus(status) {
    sendStatus.textContent = status;
  }

  function displayStories(stories) {
    storiesList.innerHTML = "";
    if (!stories || stories.length === 0) {
      storiesList.textContent = "No problematic stories found.";
      return;
    }
    const ul = document.createElement("ul");
    stories.forEach(story => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = story.url;
      link.textContent = story.title;
      link.target = "_blank";
      li.appendChild(link);
      ul.appendChild(li);
    });
    storiesList.appendChild(ul);
  }

  checkStoriesBtn.addEventListener("click", async () => {
    checkStoriesBtn.disabled = true;
    checkStoriesBtn.textContent = "Checking...";
    try {
      updateSendStatus("Fetching...");
      const response = await fetch("https://tacc.org.uk/api/problematic");
      if (response.ok) {
        const data = await response.json();
        displayStories(data);
        updateSendStatus("Done");
      } else {
        storiesList.textContent = "Failed to fetch problematic stories.";
        updateSendStatus("Error");
      }
    } catch (error) {
      console.error("Error fetching problematic stories:", error);
      storiesList.textContent = "Error fetching stories.";
      updateSendStatus("Error");
    } finally {
      checkStoriesBtn.disabled = false;
      checkStoriesBtn.textContent = "Check Problematic Stories";
    }
  });
});
