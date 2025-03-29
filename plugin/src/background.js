// background.js

// Mapping table row labels to internal field names
const mapping_to_formData = {
  // Complaint
  "What is your complaint about?": "platform",
  "Are you contacting us about a previous complaint?": "are_you_contacting_us_about_a_previous_complaint_",

  // Your Complaint
  "Select the best category to describe your complaint": "generalissue1",
  "What is the subject of your complaint?": "title",
  "Do you require a response to your complaint?": "responserequired",
  "Please enter your complaint, and please don’t add personal details such as your name, email or phone number in this field – we’ll ask you for those at the next stage": "description",
  "Please enter your complaint": "description",

  // Your Details
  "Location": "region", // Using region instead of location for consistency
  "Title (i.e. Mr, Ms etc.)": "salutation",
  "First Name": "firstname",
  "Last Name": "lastname",
  "Email address": "emailaddress",
  "Email Address": "emailaddress",
  "Are you under 18?": "under18",

  // TV-specific fields
  "Which TV channel or service is your complaint about?": "servicetv",

  // Radio / BBC Sounds-specific fields
  "What is the nature of your complaint?": "what_is_the_nature_of_your_complaint_",
  "Which radio station is your complaint about?": "serviceradio",

  // Website/App-specific fields
  "Which website or app is your complaint about?": "network",
  "Please give the URL, or name of the app": "sourceurl",

  // Programme details
  "What is the programme title?": "programme",
  "What is the programme title?_id": "programmeid",
  "When was it broadcast? (dd/mm/yyyy)": "transmissiondate",
  "When did you first notice the problem?": "dateproblemstarted",
  "How did you watch or listen to the programme?": "liveorondemand",
  "Roughly how far into the programme did the issue happen?": "transmissiontime",

  // Additional fields
  "What's the issue?": "redbuttonfault",
  "This helps us trace the problem": "platform",
  "If you know, what make or model is your set top box/smart TV?": "make",
  "Case number of your previous complaint": "casenumber"
};

// Cross-browser compatibility
if (typeof browser === "undefined") {
  var browser = chrome;
}

// Open init/init.html on install
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    const initUrl = browser.runtime.getURL("init/init.html");
    browser.tabs.create({ url: initUrl }, (tab) => {
      if (browser.runtime.lastError) {
        console.error("Error creating init tab:", browser.runtime.lastError);
      } else {
        console.log("Init tab created successfully:", tab);
      }
    });
  }
});

// Generate a random alphanumeric string of the given length
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Listen for messages from the content script
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  // Check if the privacy policy has been accepted
  let privacyPolicyAccepted = false;
  try {
    const result = await browser.storage.local.get("privacyPolicyAccepted");
    privacyPolicyAccepted = result.privacyPolicyAccepted || false;
  } catch (error) {
    console.error("Error checking privacy policy status:", error);
  }
  if (!privacyPolicyAccepted) {
    return;
  }

  // Retrieve the origin URL (if available) from the sender
  const originUrl = sender?.tab?.url || "";

  if (message.action === "sendText") {
    const allReviewTableData = message.allReviewTableData;
    console.log("Received allReviewTableData:", allReviewTableData);
    console.log("Received message:", message);

    // Create a container for the parsed data
    let parsedData = {
      where: message.where,
      formData: {}
    };

    if (message.where === "IPSO") {
      // For IPSO, use the data as provided
      parsedData.formData = message.allReviewData;
    } else if (message.where === "bbc") {
      // Map the table data keys to form fields for BBC
      for (const key in allReviewTableData) {
        const mappedField = mapping_to_formData[key];
        if (mappedField) {
          parsedData.formData[mappedField] = allReviewTableData[key];
        } else {
          // If no mapping is found, retain the original key
          parsedData.formData[key] = allReviewTableData[key];
        }
      }
      // Append a captcha value
      parsedData.formData["captcha"] = "Chrome" + generateRandomString(64);
    } else {
      console.warn("Unknown message source:", message.where);
    }

    // Convert the parsed data to a JSON string
    const dataToCopy = JSON.stringify(parsedData);

    // Construct the confirmation page URL with query parameters
    const confirmationUrl = `${browser.runtime.getURL("confirmation/confirmation.html")}?originUrl=${encodeURIComponent(originUrl)}&data=${encodeURIComponent(dataToCopy)}`;

    // Open the confirmation page in a new tab
    browser.tabs.create({ url: confirmationUrl }, (tab) => {
      if (browser.runtime.lastError) {
        console.error("Error creating confirmation tab:", browser.runtime.lastError);
      } else {
        console.log("Confirmation tab created successfully:", tab);
      }
    });

    sendResponse({ status: "success" });
  }
});
