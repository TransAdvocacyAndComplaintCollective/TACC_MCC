// confirmation.js

// ----- CONFIGURATION: Define settings for each intercepted website ----- //
const siteConfigs = {
  bbc: {
    // Fields that will be shown as checkboxes (keys from the intercepted data)
    fields: [
      "originUrl",
      "previous_complaint",
      "captcha",
      "dateproblemstarted",
      "description",
      "emailaddress",
      "firstname",
      "lastname",
      "salutation",
      "generalissue1",
      "liveorondemand",
      "localradio",
      "make",
      "network",
      "platform",
      "programme",
      "programmeid",
      "subject",
      "transmissiondate",
      "transmissiontime",
      "under18"
    ],
    // Mapping of each field to a display name and whether it’s optional.
    fieldDetails: {
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
      liveorondemand: { name: "Live or On-Demand", optional: false },
      localradio: { name: "Local Radio", optional: false },
      make: { name: "Make", optional: false },
      network: { name: "Network", optional: false },
      platform: { name: "Platform", optional: false },
      programme: { name: "Programme", optional: false },
      programmeid: { name: "Programme ID", optional: false },
      subject: { name: "Subject", optional: false },
      transmissiondate: { name: "Transmission Date", optional: false },
      transmissiontime: { name: "Transmission Time", optional: false },
      under18: { name: "Under 18", optional: false }
    },
    notificationText: `<h4>Important:</h4>
      <p>BBC has sent you an email to <strong>verify your email address</strong> now.<br>
      Click on the link BBC has sent to the email address you provided. If you can’t find the email, please check your spam or junk folder.<br>
      <strong style="color: red; font-size: 18px;">This link will expire after 60 minutes.</strong> If your email address isn’t verified, BBC won’t receive it and you won’t receive an acknowledgement or reply.</p>`
  },
  ipso: {
    fields: [
      "originUrl",
      "contact_email",
      "contact_firstname",
      "contact_lastname",
      "complaint_description"
      // ...add other IPSO-specific fields here...
    ],
    fieldDetails: {
      originUrl: { name: "Origin URL", optional: false },
      contact_email: { name: "Contact Email", optional: false },
      contact_firstname: { name: "First Name", optional: false },
      contact_lastname: { name: "Last Name", optional: false },
      complaint_description: { name: "Complaint Description", optional: false }
    },
    notificationText: `<h4>Important:</h4>
      <p>Please ensure your contact information is correct. IPSO will use this to follow up on your complaint.</p>`
  },
  ofcom: {
    fields: [
      "originUrl",
      "salutation",
      "firstname",
      "lastname",
      "phone",
      "postcode",
      "address",
      "city",
      "email",
      "emailConfirm",
      "programmeTitle",
      "broadcastDate",
      "broadcastTime",
      "channel",
      "subject",
      "description"
      // ...customize as needed...
    ],
    fieldDetails: {
      originUrl: { name: "Origin URL", optional: false },
      salutation: { name: "Salutation", optional: true },
      firstname: { name: "First Name", optional: true },
      lastname: { name: "Last Name", optional: true },
      phone: { name: "Phone", optional: false },
      postcode: { name: "Postcode", optional: false },
      address: { name: "Address", optional: false },
      city: { name: "City", optional: false },
      email: { name: "Email", optional: false },
      emailConfirm: { name: "Email Confirm", optional: false },
      programmeTitle: { name: "Programme Title", optional: false },
      broadcastDate: { name: "Broadcast Date", optional: false },
      broadcastTime: { name: "Broadcast Time", optional: false },
      channel: { name: "Channel", optional: false },
      subject: { name: "Subject", optional: false },
      description: { name: "Description", optional: false }
    },
    notificationText: `<h4>Important:</h4>
      <p>Please check your Ofcom form submission details. Your complaint data will be sent to Ofcom.</p>`
  },
  police: {
    fields: [
      "originUrl",
      "incident_date",
      "incident_time",
      "location",
      "offender_description",
      "evidence_url",
      "complaint_details"
      // ...customize as needed for a hate‑crime report...
    ],
    fieldDetails: {
      originUrl: { name: "Origin URL", optional: false },
      incident_date: { name: "Incident Date", optional: false },
      incident_time: { name: "Incident Time", optional: false },
      location: { name: "Location", optional: false },
      offender_description: { name: "Offender Description", optional: false },
      evidence_url: { name: "Evidence URL", optional: true },
      complaint_details: { name: "Complaint Details", optional: false }
    },
    notificationText: `<h4>Important:</h4>
      <p>Please note: This is a police hate crime report. Make sure all details are correct as the police may follow up.</p>`
  }
};

// ----- DETERMINE THE SITE CONFIGURATION ----- //
// The intercepted data was passed as URL parameters.
const urlParams = new URLSearchParams(window.location.search);
const originUrl = urlParams.get("originUrl") || "";
const dataParam = urlParams.get("data");
let parsedData = {};
let parsedformData = {};

// Choose a configuration based on the origin URL.
let selectedConfig;
if (originUrl.includes("bbc.co.uk")) {
  selectedConfig = siteConfigs.bbc;
} else if (originUrl.includes("ipso.co.uk")) {
  selectedConfig = siteConfigs.ipso;
} else if (originUrl.includes("ofcomlive.my.salesforce-sites.com")) {
  selectedConfig = siteConfigs.ofcom;
} else if (originUrl.includes("police.uk")) {
  selectedConfig = siteConfigs.police;
} else {
  // Fallback to BBC configuration (or choose a default)
  selectedConfig = siteConfigs.bbc;
}

// Update the notification text in the page using the selected configuration.
const notificationEl = document.querySelector(".notification");
if (notificationEl) {
  notificationEl.innerHTML = selectedConfig.notificationText;
}

// ----- FUNCTIONS TO INITIALIZE THE FIELD SELECTION UI ----- //
function initializeFieldSelection(parsedData) {
  const form = document.getElementById("fieldsForm");
  form.innerHTML = ""; // clear any existing content
  selectedConfig.fields.forEach((field) => {
    if (parsedData.hasOwnProperty(field)) {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = field;
      checkbox.name = field;
      checkbox.value = "true";
      // Disable if field is required (not optional)
      checkbox.disabled = !selectedConfig.fieldDetails[field]?.optional;
      checkbox.checked = true;
      label.appendChild(checkbox);
      const fieldName = selectedConfig.fieldDetails[field]?.name || field;
      label.appendChild(document.createTextNode(` ${fieldName}`));
      if (selectedConfig.fieldDetails[field]?.optional) {
        const optionalSpan = document.createElement("span");
        optionalSpan.className = "optional";
        optionalSpan.textContent = " (Optional)";
        label.appendChild(optionalSpan);
      }
      form.appendChild(label);
      form.appendChild(document.createElement("br"));
    }
  });
  form.addEventListener("change", updateDataPreview);
}

function updateDataPreview() {
  const selectedData = getSelectedData();
  const dataContentEl = document.getElementById("dataContent");
  dataContentEl.textContent = JSON.stringify(selectedData, null, 2);
}

function getSelectedData() {
  const selectedData = {};
  selectedConfig.fields.forEach((field) => {
    const checkbox = document.getElementById(field);
    if (checkbox?.checked && parsedformData.hasOwnProperty(field)) {
      selectedData[field] = parsedformData[field];
    }
  });
  // Example special handling: if under18 is true, remove personal fields.
  if (selectedData.under18 === "true" || selectedData.under18 === true) {
    delete selectedData.emailaddress;
    delete selectedData.firstname;
    delete selectedData.lastname;
  }
  if (originUrl) selectedData.originUrl = originUrl;
  return selectedData;
}

// ----- FUNCTIONS TO SEND DATA ----- //
async function sendDataToServer(selectedData) {
  try {
    browser.storage.local.get("privacyPolicyAccepted", async (result) => {
      const privacyPolicyAccepted = result.privacyPolicyAccepted;
      const response = await fetch("https://www.tacc.org.uk/api/intercept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originUrl: selectedData.originUrl,
          interceptedData: selectedData,
          privacyPolicyAccepted: privacyPolicyAccepted,
        }),
      });
      if (!response.ok)
        throw new Error("Failed to send data. Please try again.");
      const responseData = await response.json();
      handleSuccess(responseData.id);

      // (Optional) Save the complaint ID in storage for BBC complaints.
      browser.storage.local.get("bbcComplaints", (result) => {
        const bbcComplaints = result.bbcComplaints || [];
        bbcComplaints.push({
          subject: selectedData.title,
          id: responseData.id,
          dateRetrieved: Date.now(),
        });
        browser.storage.local.set({ bbcComplaints });
      });
    });
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred while sending data.");
  }
}

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
  if (complaintId) {
    const successSpan = document.createElement("span");
    successSpan.id = "success";
    const strongSuccess = document.createElement("strong");
    strongSuccess.textContent = "Success!";
    successSpan.appendChild(strongSuccess);
    successSpan.appendChild(document.createTextNode(" Your data has been sent successfully."));
    dataContentEl.appendChild(successSpan);
    dataContentEl.appendChild(document.createElement("br"));

    const complaintText = document.createElement('div');
    complaintText.id = 'complaintText';
    const complaintStrong = document.createElement('strong');
    complaintStrong.textContent = 'Your complaint number is: ';
    complaintText.appendChild(complaintStrong);
    complaintText.appendChild(document.createTextNode(complaintId));
    dataContentEl.appendChild(complaintText);
    dataContentEl.appendChild(document.createElement("br"));
    dataContentEl.appendChild(document.createElement("br"));
  } else {
    const successStrong = document.createElement("strong");
    successStrong.textContent = "Success!";
    dataContentEl.appendChild(successStrong);
    dataContentEl.appendChild(document.createTextNode(" Your data has been sent successfully."));
    dataContentEl.appendChild(document.createElement("br"));
    dataContentEl.appendChild(document.createElement("br"));
  }
}

function displayContent(content, isError = false) {
  const dataContentEl = document.getElementById("dataContent");
  dataContentEl.textContent = content;
  dataContentEl.style.color = isError ? "red" : "black";
}

// ----- PARSE PASSED DATA ----- //
if (originUrl && dataParam) {
  try {
    parsedData = JSON.parse(dataParam);
    console.log("Parsed data:", parsedData);
    parsedformData = parsedData.formData || {};
    initializeFieldSelection(parsedformData);
    updateDataPreview();
  } catch (error) {
    displayContent("Invalid JSON format.", true);
  }
} else {
  displayContent("No data available to display.", true);
}

// ----- EVENT LISTENERS FOR BUTTONS ----- //
document.getElementById("sendBtn").addEventListener("click", () => {
  if (!originUrl || !dataParam) {
    return alert("Data or origin URL is missing.");
  }
  const selectedData = getSelectedData();
  if (Object.keys(selectedData).length === 0) {
    return alert("No data selected.");
  }
  sendDataToServer(selectedData);
});

document.getElementById("cancelBtn").addEventListener("click", () => {
  browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length && tabs[0].id) {
      browser.tabs.remove(tabs[0].id);
    } else {
      alert("Please close the tab manually.");
    }
  });
});
