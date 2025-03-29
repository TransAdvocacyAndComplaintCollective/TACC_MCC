"use strict";

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

// For Chrome compatibility
const browser = chrome;

// Retrieve URL parameters
const urlParams = new URLSearchParams(window.location.search);
const originUrl = urlParams.get("originUrl");
let rawData = urlParams.get("data");

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
let formData = {};
let complaintType = null; // "BBC" or "IPSO"

// Helper function to create a checkbox with a label
function createFieldCheckbox(field, valueExists, type = "BBC") {
  // Select proper field mapping based on complaint type
  const fieldMapping = type === "IPSO" ? fieldDetailsIPSO : fieldDetailsBBC;

  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = field;
  checkbox.name = field;
  checkbox.value = "true";
  checkbox.disabled = !fieldMapping[field]?.optional; // disable if not optional
  checkbox.checked = Boolean(valueExists);

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

// Handle UI changes after a successful submission
function handleSuccess(complaintId) {
  const fieldSelection = document.querySelector(".field-selection");
  if (fieldSelection) fieldSelection.style.display = "none";

  const sendBtn = document.getElementById("sendBtn");
  sendBtn.disabled = true;
  sendBtn.style.display = "none";

  const cancelBtn = document.getElementById("cancelBtn");
  cancelBtn.textContent = "Close Page";
  cancelBtn.style.backgroundColor = "#4caf50";

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
    complaintStrong.textContent = "Your complaint number is: ";
    complaintText.appendChild(complaintStrong);
    complaintText.appendChild(document.createTextNode(complaintId));
    dataContentEl.appendChild(document.createElement("br"));
    dataContentEl.appendChild(complaintText);
  }
  dataContentEl.appendChild(document.createElement("br"));
  dataContentEl.appendChild(document.createElement("br"));
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

// Send selected data to the server
async function sendDataToServer(selectedData) {
  try {
    chrome.storage.local.get("privacyPolicyAccepted", async (result) => {
      const privacyPolicyAccepted = result.privacyPolicyAccepted;
      const response = await fetch("https://www.tacc.org.uk/api/intercept/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          where: complaintType,
          originUrl: selectedData.originUrl,
          interceptedData: selectedData,
          privacyPolicyAccepted: privacyPolicyAccepted,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send data. Please try again.");
      }
      const responseData = await response.json();
      handleSuccess(responseData.id);

      // Store BBC complaints in local storage
      chrome.storage.local.get("bbcComplaints", (result) => {
        const bbcComplaints = result.bbcComplaints || [];
        bbcComplaints.push({
          subject: selectedData.title,
          id: responseData.id,
          dateRetrieved: Date.now(),
        });
        chrome.storage.local.set({ bbcComplaints });
      });
    });
  } catch (error) {
    console.error("Error sending data:", error);
    alert("An error occurred while sending data.");
  }
}

// Wait until the DOM is fully loaded before initializing
document.addEventListener("DOMContentLoaded", () => {
  if (originUrl && data) {
    try {
      parsedData = JSON.parse(data);
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
    if (!originUrl || !data) {
      return alert("Data or origin URL is missing.");
    }
    const selectedData = getSelectedData(complaintType);
    if (Object.keys(selectedData).length === 0) {
      return alert("No data selected.");
    }
    sendDataToServer(selectedData);
  });

  document.getElementById("cancelBtn").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length && tabs[0].id) {
        chrome.tabs.remove(tabs[0].id);
      } else {
        alert("Please close the tab manually.");
      }
    });
  });
});
