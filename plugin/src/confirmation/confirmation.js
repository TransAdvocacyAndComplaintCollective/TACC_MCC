"use strict";
console.log("[extractAllReviewTableData] No review tables found.");
// Define fields for IPSO and BBC complaints.
const fieldsIPSO = [
  "email_address",
  "first_name",
  "last_name",
];
const fieldDetailsIPSO = {
  email_address: { name: "Email Address", optional: true },
  first_name: { name: "First Name", optional: true },
  last_name: { name: "Last Name", optional: true },
};

const fieldsBBC = [
  "originUrl",
  "previous_complaint",
  "captcha",
  "dateproblemstarted",
  "description",
  "emailaddress", // Optional
  "firstname", // Optional
  "lastname", // Optional
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
  "under18",
  "verifyform",
  "complaint_nature",
  "complaint_nature_sounds",
];
const fieldDetailsBBC = {
  originUrl: { name: "Origin URL", optional: false },
  previous_complaint: { name: "Previous Complaint", optional: false },
  captcha: { name: "Captcha", optional: false },
  dateproblemstarted: { name: "Date Problem Started", optional: false },
  description: { name: "Description", optional: false },
  emailaddress: { name: "Email Address", optional: true },
  firstname: { name: "First Name", optional: true },
  lastname: { name: "Last Name", optional: true },
  salutation: { name: "Salutation", optional: true },
  generalissue1: { name: "General Issue", optional: false },
  intro_text: { name: "Introduction Text", optional: false },
  iswelsh: { name: "Is Welsh", optional: false },
  liveorondemand: { name: "Live or On-Demand", optional: false },
  localradio: { name: "Local Radio", optional: false },
  make: { name: "Make", optional: false },
  moderation_text: { name: "Moderation Text", optional: false },
  network: { name: "Network", optional: false },
  outside_the_uk: { name: "Outside the UK", optional: false },
  platform: { name: "Platform", optional: false },
  programme: { name: "Programme", optional: false },
  programmeid: { name: "Programme ID", optional: false },
  reception_text: { name: "Reception Text", optional: false },
  redbuttonfault: { name: "Red Button Fault", optional: false },
  region: { name: "Region", optional: false },
  responserequired: { name: "Response Required", optional: false },
  servicetv: { name: "Service TV", optional: false },
  sounds_text: { name: "Sounds Text", optional: false },
  sourceurl: { name: "Source URL", optional: false },
  subject: { name: "Subject", optional: false },
  title: { name: "Title", optional: false },
  transmissiondate: { name: "Transmission Date", optional: false },
  transmissiontime: { name: "Transmission Time", optional: false },
  under18: { name: "Under 18", optional: false },
  verifyform: { name: "Verify Form", optional: false },
  complaint_nature: { name: "Complaint Nature", optional: false },
  complaint_nature_sounds: { name: "Complaint Nature (Sounds)", optional: false },
};

// Use the Firefox extension API (or fallback to chrome if needed)
const extension = (typeof browser !== "undefined") ? browser : chrome;

// Retrieve URL parameters
const urlParams = new URLSearchParams(window.location.search);
console.log("URL Parameters:", urlParams.toString());
const originUrl = urlParams.get("originUrl");
let rawData = urlParams.get("data");
console.log("urlParams", urlParams);

let data = null;
if (rawData) {
  try {
    data = decodeURIComponent(rawData);
  } catch (error) {
    console.error("Error decoding data parameter:", error);
    data = rawData;
  }
}

// Global variables to store parsed data and complaint type
let parsedData = {};
// pass json into the formData variable
let formData = {};
// Initialize complaintType to null
let complaintType = null; // "BBC" or "IPSO"

// Helper function to create a checkbox with a label
function createFieldCheckbox(field, valueExists, type = "BBC") {
  const fieldMapping = type === "IPSO" ? fieldDetailsIPSO : fieldDetailsBBC;
  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = field;
  checkbox.name = field;
  checkbox.value = "true";
  checkbox.disabled = !fieldMapping[field]?.optional; // disable if not optional
  checkbox.checked = Boolean(!fieldMapping[field]?.optional);
  label.appendChild(checkbox);
  const fieldName = fieldMapping[field]?.name || field;
  label.appendChild(document.createTextNode(` ${fieldName}`));
  if (fieldMapping[field]?.optional) {
    const optionalSpan = document.createElement("span");
    optionalSpan.className = "optional";
    optionalSpan.textContent = " (Optional)";
    label.appendChild(optionalSpan);
  }
  return label;
}

// Initialize the form with checkboxes based on complaint type
function initializeFieldSelection(dataObj, type) {
  const form = document.getElementById("fieldsForm");
  form.innerHTML = ""; // clear previous content

  if (type === "IPSO") {
    const c = document.querySelector(".notification")
    if (c) { c.style.display = "none"; }
    if (dataObj.contactDetails) {
      fieldsIPSO.forEach((field) => {
        if (dataObj.contactDetails.hasOwnProperty(field)) {
          const label = createFieldCheckbox(field, dataObj.contactDetails[field], type);
          form.appendChild(label);
        }
      });
    }
  } else if (type === "BBC") {
    fieldsBBC.forEach((field) => {
      if (dataObj.hasOwnProperty(field)) {
        const label = createFieldCheckbox(field, dataObj[field], type);
        form.appendChild(label);
      }
    });
  }
  // Attach change listener to update preview whenever any checkbox is toggled
  form.addEventListener("change", () => updateDataPreview(type));
}

// Update the JSON preview of the selected data
function updateDataPreview(type) {
  const selectedData = getSelectedData(type);
  const formattedJson = JSON.stringify(selectedData, null, 2);
  displayContent(formattedJson);
}

// Display content or error messages in the designated element
function displayContent(content, isError = false) {
  const dataContentEl = document.getElementById("dataContent");
  dataContentEl.textContent = content;
  dataContentEl.style.color = isError ? "red" : "black";
}

// Handle successful submission – updates the UI to show success and a complaint ID.
function handleSuccess(complaintId) {
  const fieldSelection = document.querySelector(".field-selection");
  if (fieldSelection) fieldSelection.style.display = "none";

  const sendBtn = document.getElementById("sendBtn");
  sendBtn.disabled = true;
  sendBtn.style.display = "none";

  const cancelBtn = document.getElementById("cancelBtn");
  cancelBtn.textContent = "Close Page";
  cancelBtn.style.backgroundColor = "#4caf50";
  cancelBtn.style.marginTop = "30px";

  const dataContentEl = document.getElementById("dataContent");
  dataContentEl.innerHTML = "";

  const successSpan = document.createElement("span");
  successSpan.id = "success";
  const strongSuccess = document.createElement("strong");
  strongSuccess.textContent = "Success!";
  successSpan.appendChild(strongSuccess);
  successSpan.appendChild(document.createTextNode(" Your data has been sent successfully."));
  dataContentEl.appendChild(successSpan);

  if (complaintId) {
    const complaintText = document.createElement("div");
    complaintText.id = "complaintText";
    const complaintStrong = document.createElement("strong");
    complaintStrong.textContent = "Your TACC Record ID is: ";
    complaintText.appendChild(complaintStrong);
    complaintText.appendChild(document.createTextNode(complaintId));
    dataContentEl.appendChild(document.createElement("br"));
    dataContentEl.appendChild(complaintText);
  }
  dataContentEl.appendChild(document.createElement("br"));
  dataContentEl.appendChild(document.createElement("br"));
}

// NEW: Handle errors by showing a message in the HTML and updating buttons.
function handleError(errorMessage) {
  const dataContentEl = document.getElementById("dataContent");
  dataContentEl.innerHTML = "";
  const errorSpan = document.createElement("span");
  errorSpan.style.color = "red";
  // Use a generic message if no specific error message is provided.
  errorSpan.textContent = errorMessage || "An error occurred. Please try again later.";
  dataContentEl.appendChild(errorSpan);

  // Disable the send button and change the cancel button to act as a Return button.
  const sendBtn = document.getElementById("sendBtn");
  sendBtn.disabled = true;
  sendBtn.style.display = "none";

  const cancelBtn = document.getElementById("cancelBtn");
  cancelBtn.textContent = "Return";
  cancelBtn.style.backgroundColor = "#4caf50";
}

// Gather selected fields from the form based on complaint type
function getSelectedData(type) {
  const selectedData = {};
  if (type === "IPSO") {
    selectedData.contactDetails = {};
    fieldsIPSO.forEach((field) => {
      const checkbox = document.getElementById(field);
      if (checkbox?.checked && formData.contactDetails && formData.contactDetails.hasOwnProperty(field)) {
        selectedData.contactDetails[field] = formData.contactDetails[field];
      }
    });
    if (formData.complaintDetails) {
      selectedData.complaintDetails = formData.complaintDetails;
    }
    if (formData.codeBreaches) {
      selectedData.codeBreaches = formData.codeBreaches;
    }
    if (originUrl) selectedData.originUrl = originUrl;
  } else if (type === "BBC") {
    fieldsBBC.forEach((field) => {
      const checkbox = document.getElementById(field);
      if (checkbox?.checked && formData.hasOwnProperty(field)) {
        selectedData[field] = formData[field];
      }
    });
    if (originUrl) selectedData.originUrl = originUrl;
  }
  return selectedData;
}

// Helper to get stored values using the Promise-based API
async function getStorageValue(key) {
  try {
    const result = await extension.storage.local.get(key);
    return result[key];
  } catch (error) {
    console.error("Error accessing storage:", error);
    throw error;
  }
}

// Send selected data to the server with enhanced error handling.
async function sendDataToServer(selectedData) {
  try {
    const privacyPolicyAccepted = await getStorageValue("privacyPolicyAccepted");
    if (typeof privacyPolicyAccepted === "undefined") {
      throw new Error("Privacy policy acceptance not found.");
    }

    // Make the POST request.
    const response = await fetch("https://www.tacc.org.uk/api/intercept/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        where: complaintType,
        originUrl: selectedData.originUrl || originUrl || "MISSING",
        interceptedData: selectedData,
        privacyPolicyAccepted: privacyPolicyAccepted,
      }),
    });

    if (!response.ok) {
      let errorResponse;
      try {
        errorResponse = await response.json();
      } catch (e) {
        // Ignore JSON parse errors.
      }
      const errorMessage =
        (errorResponse && errorResponse.error) ||
        "Failed to send data. Please try again later.";
      handleError(errorMessage);
      return;
    }

    const responseData = await response.json();
    handleSuccess(responseData.id);

    // Store BBC or IPSO complaints in local storage.
    if (complaintType === "BBC") {
      const bbcComplaints = (await getStorageValue("bbcComplaints")) || [];
      bbcComplaints.push({
        where: complaintType,
        subject: selectedData.title,
        id: responseData.id,
        dateRetrieved: Date.now(),
      });
      await extension.storage.local.set({ bbcComplaints });
    } else if (complaintType === "IPSO") {
      const ipsoComplaints = (await getStorageValue("ipsoComplaints")) || [];
      ipsoComplaints.push({
        where: complaintType,
        subject: selectedData.complaintDetails.title,
        id: responseData.id,
        dateRetrieved: Date.now(),
      });
      await extension.storage.local.set({ ipsoComplaints });
    }
  } catch (error) {
    console.error("Error sending data:", error);
    handleError(error.message);
  }
}

function load() {
  console.log("Loading confirmation page...");
  console.log("Origin URL:", originUrl);
  console.log("Data:", data);
  if (!originUrl) {
    originUrl= "Origin URL is missing.";
  }}
  if (data) {
    try {
      console.log("Data:", data);
      parsedData = JSON.parse(data);
      console.log("Parsed Data:", parsedData);
      formData = parsedData.formData || parsedData;
      complaintType = parsedData.where; // Expected to be "IPSO" or "BBC"

      initializeFieldSelection(formData, complaintType);
      updateDataPreview(complaintType);
    } catch (error) {
      displayContent("Invalid JSON format.", true);
    }
  } else {
    displayContent("No data available to display.", true);
  }

  document.getElementById("sendBtn").addEventListener("click", () => {
    if (!data) {
      return alert("Data is missing.");
    }
    const selectedData = getSelectedData(complaintType);
    if (Object.keys(selectedData).length === 0) {
      return alert("No data selected.");
    }
    sendDataToServer(selectedData);
  });

  document.getElementById("cancelBtn").addEventListener("click", async () => {
    try {
      const tabs = await extension.tabs.query({ active: true, currentWindow: true });
      if (tabs.length && tabs[0].id) {
        await extension.tabs.remove(tabs[0].id);
      } else {
        alert("Please close the tab manually.");
      }
    } catch (error) {
      console.error("Error closing tab:", error);
      alert("Error closing tab. Please close it manually.");
    }
  });


console.log("Confirmation page loaded.");
// Wait until the DOM is fully loaded before initializing
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed.");
  load();
});
// Fallback for older browsers that may not support the DOMContentLoaded event
if (document.readyState === "complete") {
  console.log("Document is already fully loaded.");
  load();
}
load();