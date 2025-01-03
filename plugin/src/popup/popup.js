document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("help-link").addEventListener("click", (e) => {
    e.preventDefault();
    const helpUrl = browser.runtime.getURL("help/help.html");
    browser.tabs.create({ url: helpUrl });
  })

  // -----------------------------
  // Part 1: Complaints Table
  // -----------------------------
  const tableBody = document.querySelector("#complaintsTable tbody");

  // Only proceed if the table actually exists in DOM
  if (tableBody) {
    // Load complaints array from local storage
    let bbcComplaints = [];
    try {
      const result = await browser.storage.local.get("bbcComplaints");
      bbcComplaints = result.bbcComplaints || [];
    } catch (error) {
      console.error("Error loading complaints from storage:", error);
    }

    // Function to render the table
    function renderTable() {
      // Clear out existing table rows
      tableBody.innerHTML = "";

      if (bbcComplaints.length === 0) {
        // Display a placeholder row if no complaints exist
        const placeholderRow = document.createElement("tr");
        const placeholderCell = document.createElement("td");
        placeholderCell.colSpan = 4; // Updated to match the total number of columns
        placeholderCell.textContent = "No complaints stored.";
        placeholderRow.appendChild(placeholderCell);
        tableBody.appendChild(placeholderRow);
        return;
      }

      // Populate the table with complaints
      bbcComplaints.forEach((complaint, index) => {
        const row = document.createElement("tr");

        // **1. Subject Cell**
        const subjectCell = document.createElement("td");
        subjectCell.textContent = complaint.subject || "N/A";
        row.appendChild(subjectCell);

        // **2. ID Cell**
        const idCell = document.createElement("td");
        idCell.textContent = complaint.id || "N/A";
        row.appendChild(idCell);

        // **3. Date Cell**
        const dateCell = document.createElement("td");
        dateCell.textContent = complaint.dateRetrieved 
          ? new Date(complaint.dateRetrieved).toLocaleString()
          : "N/A";
        row.appendChild(dateCell);

        // **4. Action Cell (Delete Button)**
        const actionCell = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";

        // Handle delete button click
        deleteButton.addEventListener("click", async () => {
          // Remove the complaint from the array
          bbcComplaints.splice(index, 1);
          try {
            // Update the storage with the new array
            await browser.storage.local.set({ bbcComplaints });
            // Re-render the table to reflect changes
            renderTable();
          } catch (error) {
            console.error("Error updating storage after deletion:", error);
          }
        });

        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);

        // Append the row to the table body
        tableBody.appendChild(row);
      });
    }

    // Initial render of the complaints table
    renderTable();
  }

  // -----------------------------
  // Part 2: Check Problematic Stories
  // -----------------------------
  const sendStatus = document.getElementById("send-status");
  const checkStoriesBtn = document.getElementById("check-stories-btn");
  const storiesList = document.getElementById("stories-list");

  // Only proceed if these elements exist in DOM
  if (sendStatus && checkStoriesBtn && storiesList) {
    // Function to update the send status
    function updateSendStatus(status) {
      sendStatus.textContent = status;
    }

    // Function to display problematic stories
    function displayStories(stories) {
      storiesList.innerHTML = ""; // Clear previous list
      if (!stories || stories.length === 0) {
        storiesList.textContent = "No problematic stories found.";
        return;
      }

      const ul = document.createElement("ul");
      stories.forEach((story) => {
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

    // Handle check stories button click
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
  }
});
