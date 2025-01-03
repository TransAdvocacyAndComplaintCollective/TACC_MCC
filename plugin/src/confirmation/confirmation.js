// confirmation.js

// List of fields to manage
const fields = [
  "originUrl",
  "previous_complaint",
  "captcha",
  "dateproblemstarted",
  "description",
  "emailaddress", // Optional
  "firstname",          // Optional
  "lastname",           // Optional
  "salutation",
  "generalissue1",
  "intro_text",
  "iswelsh",
  "liveorondemand",
  "localradio",
  "make",
  "moderation_text",
  "network",
  "outside_the_uk",
  "platform",
  "programme",
  "programmeid",
  "reception_text",
  "redbuttonfault",
  "region",
  "responserequired",
  "servicetv",
  "sounds_text",
  "sourceurl",
  "subject",
  "title",
  "transmissiondate",
  "transmissiontime",
  // "under18": { name: "Under 18", optional: false },
  "verifyform",
  "complaint_nature",
  "complaint_nature_sounds",
];

// Mapping of fields to display names and optional status
const fieldDetails = {
  "originUrl": { name: "Origin URL", optional: false },
  "previous_complaint": { name: "Previous Complaint", optional: false },
  "captcha": { name: "Captcha", optional: false },
  "dateproblemstarted": { name: "Date Problem Started", optional: false },
  "description": { name: "Description", optional: false },
  "emailaddress": { name: "Email Address", optional: true },
  "firstname": { name: "First Name", optional: true },
  "lastname": { name: "Last Name", optional: true },
  "salutation": { name: "Salutation", optional: true },
  "generalissue1": { name: "General Issue", optional: false },
  "intro_text": { name: "Introduction Text", optional: false },
  "iswelsh": { name: "Is Welsh", optional: false },
  "liveorondemand": { name: "Live or On-Demand", optional: false },
  "localradio": { name: "Local Radio", optional: false },
  "make": { name: "Make", optional: false },
  "moderation_text": { name: "Moderation Text", optional: false },
  "network": { name: "Network", optional: false },
  "outside_the_uk": { name: "Outside the UK", optional: false },
  "platform": { name: "Platform", optional: false },
  "programme": { name: "Programme", optional: false },
  "programmeid": { name: "Programme ID", optional: false },
  "reception_text": { name: "Reception Text", optional: false },
  "redbuttonfault": { name: "Red Button Fault", optional: false },
  "region": { name: "Region", optional: false },
  "responserequired": { name: "Response Required", optional: false },
  "servicetv": { name: "Service TV", optional: false },
  "sounds_text": { name: "Sounds Text", optional: false },
  "sourceurl": { name: "Source URL", optional: false },
  "subject": { name: "Subject", optional: false },
  "title": { name: "Title", optional: false },
  "transmissiondate": { name: "Transmission Date", optional: false },
  "transmissiontime": { name: "Transmission Time", optional: false },
  // "under18": { name: "Under 18", optional: false },
  "verifyform": { name: "Verify Form", optional: false },
  "complaint_nature": { name: "Complaint Nature", optional: false },
  "complaint_nature_sounds": { name: "Complaint Nature (Sounds)", optional: false },
};

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const originUrl = urlParams.get("originUrl");
const data = urlParams.get("data") ? decodeURIComponent(urlParams.get("data")) : null;

// Utility function to update content display
function displayContent(content, isError = false) {
  const dataContentEl = document.getElementById("dataContent");
  dataContentEl.textContent = content;
  dataContentEl.style.color = isError ? "red" : "black";
}

// Initialize the form with checkboxes
function initializeFieldSelection(parsedData) {
  const form = document.getElementById("fieldsForm");
  console.log("Initializing field selection form...", parsedData);
  fields.forEach(field => {
    // Only create checkbox if the field exists in the data
    if (parsedData.hasOwnProperty(field)) {
      const label = document.createElement("label");
      
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = field;
      checkbox.name = field;
      checkbox.value = "true";
      // Disable checkbox for fields that are not optional
      checkbox.disabled = !fieldDetails[field]?.optional;
      checkbox.checked = true; // Default to checked

      // Append checkbox to label
      label.appendChild(checkbox);

      // Create label text
      const fieldName = fieldDetails[field]?.name || field;
      if (fieldDetails[field]?.optional) {
        label.appendChild(document.createTextNode(` ${fieldName} `));
        const optionalSpan = document.createElement("span");
        optionalSpan.className = "optional";
        optionalSpan.textContent = "(Optional)";
        label.appendChild(optionalSpan);
      } else {
        label.appendChild(document.createTextNode(` ${fieldName}`));
      }

      // Append label to form
      form.appendChild(label);
    }
  });

  // Add event listeners to checkboxes to update data preview dynamically
  form.addEventListener("change", updateDataPreview);
}

// Function to gather selected fields
function getSelectedData() {
  const selectedData = {};
  fields.forEach(field => {
    const checkbox = document.getElementById(field);
    if (checkbox && checkbox.checked && parsedformData.hasOwnProperty(field)) {
      selectedData[field] = parsedformData[field];
    }
  });
  console.log("Selected Data:", selectedData);
  // Always include originUrl
  if (originUrl) {
    selectedData.originUrl = originUrl;
  }
  return selectedData;
}

// Function to send data to your server's /intercept endpoint
async function sendDataToServer(selectedData) {
  try {
    const response = await fetch("https://www.tacc.org.uk/api/intercept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        originUrl: selectedData.originUrl,
        interceptedData: selectedData,
      }),
    });

    if (!response.ok) {
      console.error("Failed to send data to server:", response.statusText);
      alert("Failed to send data. Please try again.");
      return;
    }

    // Parse the server response
    const responseData = await response.json();
    console.log("Data successfully sent to server:", responseData);

    // Display success message with complaint number (if available)
    if (responseData.id) {
      alert(`Data sent successfully! Your complaint number is: ${responseData.id}`);

      // ----------------------------------------------------------
      // UPDATED CODE: Store complaint ID and date in local storage
      // as part of an array (bbcComplaints).
      // ----------------------------------------------------------
      try {
        // 1) Retrieve existing array from storage
        let { bbcComplaints } = await browser.storage.local.get('bbcComplaints');
        if (!bbcComplaints) {
          bbcComplaints = [];
        }

        // 2) Build new complaint object
        const newComplaint = {
          id: responseData.id,
          dateRetrieved: Date.now(), // or new Date().toISOString()
        };

        // 3) Add to array
        bbcComplaints.push(newComplaint);
        console.log("New complaint stored in local storage:", newComplaint);

        // 4) Save updated array back to storage
        await browser.storage.local.set({ bbcComplaints });
        console.log("Complaint ID stored successfully in local storage (array).");

      } catch (err) {
        console.error("Error storing complaint ID:", err);
      }
      // ----------------------------------------------------------

    } else {
      alert("Data sent successfully, but no complaint number was returned.");
    }

  } catch (error) {
    console.error("Error sending data to server:", error);
    alert("An error occurred while sending data. Please check the console for details.");
  }
}

// Function to update data preview based on selected fields
function updateDataPreview() {
  const selectedData = getSelectedData();
  const formattedJson = JSON.stringify(selectedData, null, 2); // Pretty-print JSON
  displayContent(formattedJson);
}

// Validate and display originUrl and data
let parsedData = {};
let parsedformData = {};
if (originUrl && data) {
  try {
    parsedData = JSON.parse(data);
    parsedformData = parsedData.formData || {}; // Ensure formData exists
    initializeFieldSelection(parsedformData);
    console.log("Origin URL:", originUrl);
    console.log("Parsed Data:", parsedformData);
    updateDataPreview(); // Initialize data preview
  } catch (error) {
    displayContent("Invalid JSON format:\n" + data, true);
    console.error("Error parsing JSON:", error);
  }
} else {
  displayContent("No data available to display.", true);
  console.error("Missing originUrl or data in the URL parameters.");
}

// Event listeners for buttons
document.getElementById("sendBtn").addEventListener("click", () => {
  if (originUrl && data) {
    const selectedData = getSelectedData();
    if (Object.keys(selectedData).length === 0) {
      alert("No data selected to send.");
      return;
    }
    console.log("Attempting to send selected data to server...");
    sendDataToServer(selectedData);
  } else {
    alert("Data or origin URL is missing. Cannot send to server.");
  }
});

document.getElementById("cancelBtn").addEventListener("click", () => {
  console.log("Data sending canceled by user.");
  window.close(); // Close the tab
});
