// List of fields to manage
const fields = [
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
  "under18", // <-- Un-commented
  "verifyform",
  "complaint_nature",
  "complaint_nature_sounds",
];

// Mapping of fields to display names and optional status
const fieldDetails = {
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
  complaint_nature_sounds: {
    name: "Complaint Nature (Sounds)",
    optional: false,
  },
};

if (typeof browser === "undefined") {
  var browser = chrome;
}

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const originUrl = urlParams.get("originUrl");
const data = urlParams.get("data")
  ? decodeURIComponent(urlParams.get("data"))
  : null;

// Function to handle UI changes upon successful submission
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
  dataContentEl.innerHTML = ''; // Clear existing content

  if (complaintId) {
    const successSpan = document.createElement('span');
    successSpan.id = 'success';

    const strongSuccess = document.createElement('strong');
    strongSuccess.textContent = 'Success!';
    successSpan.appendChild(strongSuccess);
    successSpan.appendChild(document.createTextNode(' Your data has been sent successfully.'));

    dataContentEl.appendChild(successSpan);
    dataContentEl.appendChild(document.createElement('br'));

    const complaintText = document.createElement('div');
    const complaintStrong = document.createElement('strong');
    complaintStrong.textContent = 'Your complaint number is: ';
    complaintText.appendChild(complaintStrong);
    complaintText.appendChild(document.createTextNode(complaintId));

    dataContentEl.appendChild(complaintText);
    dataContentEl.appendChild(document.createElement('br'));
    dataContentEl.appendChild(document.createElement('br'));
  } else {
    const successStrong = document.createElement('strong');
    successStrong.textContent = 'Success!';
    dataContentEl.appendChild(successStrong);
    dataContentEl.appendChild(document.createTextNode(' Your data has been sent successfully.'));
    dataContentEl.appendChild(document.createElement('br'));
    dataContentEl.appendChild(document.createElement('br'));
  }

  // Optionally, store a flag in localStorage to prevent future submissions
}


// Utility function to update content display
function displayContent(content, isError = false) {
  const dataContentEl = document.getElementById("dataContent");
  dataContentEl.textContent = content;
  dataContentEl.style.color = isError ? "red" : "black";
}

// Initialize the form with checkboxes
function initializeFieldSelection(parsedData) {
  const form = document.getElementById("fieldsForm");
  fields.forEach((field) => {
    if (parsedData.hasOwnProperty(field)) {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = field;
      checkbox.name = field;
      checkbox.value = "true";
      checkbox.disabled = !fieldDetails[field]?.optional;
      checkbox.checked = true;
      label.appendChild(checkbox);

      const fieldName = fieldDetails[field]?.name || field;
      label.appendChild(document.createTextNode(` ${fieldName}`));
      if (fieldDetails[field]?.optional) {
        const optionalSpan = document.createElement("span");
        optionalSpan.className = "optional";
        optionalSpan.textContent = "(Optional)";
        label.appendChild(optionalSpan);
      }
      form.appendChild(label);
    }
  });
  form.addEventListener("change", updateDataPreview);
}

// Function to gather selected fields
function getSelectedData() {
  const selectedData = {};
  fields.forEach((field) => {
    const checkbox = document.getElementById(field);
    if (checkbox?.checked && parsedformData.hasOwnProperty(field)) {
      selectedData[field] = parsedformData[field];
    }
  });

  if (selectedData.under18 === "true" || selectedData.under18 === true) {
    delete selectedData.emailaddress;
    delete selectedData.firstname;
    delete selectedData.lastname;
  }

  if (originUrl) selectedData.originUrl = originUrl;
  return selectedData;
}

// Function to send data to your server
async function sendDataToServer(selectedData) {
  try {
    const result = await browser.storage.local.get('privacyPolicyAccepted');
    const privacyPolicyAccepted = result.privacyPolicyAccepted;
    const response = await fetch("https://www.tacc.org.uk/api/intercept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ originUrl: selectedData.originUrl, interceptedData: selectedData , privacyPolicyAccepted: privacyPolicyAccepted }),
    });

    if (!response.ok) throw new Error("Failed to send data. Please try again.");

    const responseData = await response.json();
    handleSuccess(responseData.id);

    try {
      const { bbcComplaints = [] } = await browser.storage.local.get("bbcComplaints");
      bbcComplaints.push({
        subject: selectedData.title,
        id: responseData.id,
        dateRetrieved: Date.now(),
      });
      await browser.storage.local.set({ bbcComplaints });
    } catch (err) {
      console.error("Error storing complaint ID:", err);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred while sending data.");
  }
}

// Function to update data preview
function updateDataPreview() {
  const selectedData = getSelectedData();
  const formattedJson = JSON.stringify(selectedData, null, 2);
  displayContent(formattedJson);
}

// Validate and initialize form
let parsedData = {};
let parsedformData = {};
if (originUrl && data) {
  try {
    parsedData = JSON.parse(data);
    console.log(parsedData);
    parsedformData = parsedData.formData || {};
    initializeFieldSelection(parsedformData);
    updateDataPreview();
  } catch (error) {
    displayContent("Invalid JSON format.", true);
  }
} else {
  displayContent("No data available to display.", true);
}

// Event listeners for buttons
document.getElementById("sendBtn").addEventListener("click", () => {
  if (!originUrl || !data) return alert("Data or origin URL is missing.");
  const selectedData = getSelectedData();
  if (Object.keys(selectedData).length === 0) return alert("No data selected.");
  sendDataToServer(selectedData);
});

document.getElementById("cancelBtn").addEventListener("click", async () => {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length && tabs[0].id) await browser.tabs.remove(tabs[0].id);
  } catch {
    alert("Please close the tab manually.");
  }
});
