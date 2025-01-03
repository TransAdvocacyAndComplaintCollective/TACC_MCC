document.addEventListener("DOMContentLoaded", async () => {
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

    /**
     * Formats a given date string to UK date format with 24-hour time.
     * @param {string} dateString - The date string to format.
     * @returns {string} - Formatted date string.
     */
    function formatDateToUK(dateString) {
      if (!dateString) return "N/A";
      const date = new Date(dateString);
      if (isNaN(date)) return "Invalid Date";

      // Define formatting options for UK locale with 24-hour time
      const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false, // 24-hour format
      };

      return date.toLocaleString('en-GB', options);
    }

    // Function to render the table
    function renderTable() {
      // Clear out existing table rows
      tableBody.innerHTML = "";

      if (bbcComplaints.length === 0) {
        // Display a placeholder row if no complaints exist
        const placeholderRow = document.createElement("tr");
        const placeholderCell = document.createElement("td");
        placeholderCell.colSpan = 4; // Matches the total number of columns
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
        dateCell.textContent = formatDateToUK(complaint.dateRetrieved);
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
    /**
     * Updates the send status text.
     * @param {string} status - The status message to display.
     */
    function updateSendStatus(status) {
      sendStatus.textContent = status;
    }

    /**
     * Displays a list of problematic stories.
     * @param {Array} stories - Array of story objects.
     */
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
