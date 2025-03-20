// background.js

// 1) Mapping the table row labels to your chosen internal field names
const mapping_to_formData = {
  // Existing mappings (examples—rename the right side fields as you see fit)
  "What is your complaint about?": "generalissue1",
  "Are you contacting us about a previous complaint?": "previous_complaint",
  "Select the best category to describe your complaint": "complaint_category",
  "What is the subject of your complaint?": "subject",
  "Do you require a response to your complaint?": "responserequired",
  "Please enter your complaint, and please don’t add personal details such as your name, email or phone number in this field – we’ll ask you for those at the next stage": "description",
  "Location": "location",
  "Title (i.e. Mr, Ms etc.)": "salutation",
  "First Name": "firstname",
  "Last Name": "lastname",
  "Email address": "emailaddress",
  "Are you under 18?": "under18",
  "Which TV channel or service is your complaint about?": "tvchannel",
  "What is the nature of your complaint?": "complaint_nature_sounds",
  "Which radio station is your complaint about?": "radio_station",
  "Please enter your local radio station": "localradio",
  "Which website or app is your complaint about?": "bbcwebsite_app",
  "Please give the URL, or name of the app": "sourceurl",
  "What is the programme title?": "programmetitle",
  "When was it broadcast? (dd/mm/yyyy)": "transmissiondate",
  "How did you watch or listen to the programme?": "liveorondemand",
  "Roughly how far into the programme did the issue happen?": "timestamp",

  // Optionally, additional or alternate mappings
  "When did you first notice the problem?": "dateproblemstarted",

  // ---- Newly added mappings ----
  "What's the issue?": "redbuttonfault",
  "This helps us trace the problem": "platform",
  "If you know, what make or model is your set top box/smart TV?": "make",
  "Case number of your previous complaint": "casenumber",
  "Are you contacting us about a previous complaint?": "are_you_contacting_us_about_a_previous_complaint_",
  "What is your complaint about?": "platform", // note: same key as above, update if needed
  "Which radio station is your complaint about?": "serviceradio", // duplicate key—update as needed
  "Which TV channel or service is your complaint about?": "servicetv", // duplicate key—update as needed
  "What is the nature of your complaint?": "what_is_the_nature_of_your_complaint_", // duplicate key—update as needed
  "What is the programme title?_id": "programmeid",
  "What is the subject of your complaint?": "title",
  "Roughly how far into the programme did the issue happen?": "transmissiontime"
};

// 2) Cross-browser support
if (typeof browser === "undefined") {
  var browser = chrome;
}

// 3) Open init/init.html on install
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

// Utility: generate a random string of given length
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// 4) Listen for messages from content scripts
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  // Check if privacy policy is accepted
  let privacyPolicyAccepted = false;
  try {
    const result = await browser.storage.local.get("privacyPolicyAccepted");
    privacyPolicyAccepted = result.privacyPolicyAccepted || false;
  } catch (error) {
    console.error("Error checking privacy policy status:", error);
  }
  if (!privacyPolicyAccepted) {
    // Optionally, you could send a response or perform an action here
    return;
  }

  switch (message.action) {
    case "sendText": {
      // BBC Complaints review extraction (e.g. from review tables)
      const allReviewTableData = message.allReviewTableData;
      const parsedData = { formData: {} };
      for (const key in allReviewTableData) {
        const mappedField = mapping_to_formData[key];
        if (mappedField) {
          parsedData.formData[mappedField] = allReviewTableData[key];
        } else {
          parsedData.formData[key] = allReviewTableData[key];
        }
      }
      parsedData.formData["captcha"] = "Chrome" + generateRandomString(64);
      const originUrl = sender?.tab?.url || "";
      console.log("Captured BBC review table data:", allReviewTableData);
      console.log("Parsed data object:", parsedData);
      console.log("Origin URL:", originUrl);
      const dataToCopy = JSON.stringify(parsedData);
      const confirmationUrl = `${browser.runtime.getURL("confirmation/confirmation.html")}?originUrl=${encodeURIComponent(originUrl)}&data=${encodeURIComponent(dataToCopy)}`;
      browser.tabs.create({ url: confirmationUrl }, (tab) => {
        if (browser.runtime.lastError) {
          console.error("Error creating tab:", browser.runtime.lastError);
        } else {
          console.log("Confirmation tab created:", tab);
        }
      });
      sendResponse({ status: "success" });
      break;
    }

    case "scrapeReviewSubmission": {
      // Police hate crime online review extraction (from .c-summary content)
      const reviewData = message.data;
      const parsedData = { formData: { ...reviewData } };
      parsedData.formData["captcha"] = "Chrome" + generateRandomString(64);
      const originUrl = sender?.tab?.url || "";
      console.log("Captured police hate crime review data:", reviewData);
      console.log("Parsed data object:", parsedData);
      console.log("Origin URL:", originUrl);
      const dataToCopy = JSON.stringify(parsedData);
      const confirmationUrl = `${browser.runtime.getURL("confirmation/confirmation.html")}?originUrl=${encodeURIComponent(originUrl)}&data=${encodeURIComponent(dataToCopy)}`;
      browser.tabs.create({ url: confirmationUrl }, (tab) => {
        if (browser.runtime.lastError) {
          console.error("Error creating tab:", browser.runtime.lastError);
        } else {
          console.log("Confirmation tab created:", tab);
        }
      });
      sendResponse({ status: "success" });
      break;
    }

    case "scrapeFormSubmission": {
      // Ofcom Salesforce Form submission extraction (covers BBCStandards, CSLEStandards, FairnessAndPrivacy)
      const formData = message.data;
      console.log("Received Ofcom form submission data:", formData);
      const originUrl = sender?.tab?.url || "";
      const dataToCopy = JSON.stringify({ formData });
      const confirmationUrl = `${browser.runtime.getURL("confirmation/confirmation.html")}?originUrl=${encodeURIComponent(originUrl)}&data=${encodeURIComponent(dataToCopy)}`;
      browser.tabs.create({ url: confirmationUrl }, (tab) => {
        if (browser.runtime.lastError) {
          console.error("Error creating tab:", browser.runtime.lastError);
        } else {
          console.log("Confirmation tab created:", tab);
        }
      });
      sendResponse({ status: "success" });
      break;
    }

    case "sendIPSOData": {
      // IPSO extraction data
      const ipsoData = {
        contactInfo: message.contactInfo,
        clauses: message.clauses,
        complaints: message.complaints,
      };
      console.log("Received IPSO data:", ipsoData);
      const originUrl = sender?.tab?.url || "";
      const dataToCopy = JSON.stringify({ ipsoData });
      const confirmationUrl = `${browser.runtime.getURL("confirmation/confirmation.html")}?originUrl=${encodeURIComponent(originUrl)}&data=${encodeURIComponent(dataToCopy)}`;
      browser.tabs.create({ url: confirmationUrl }, (tab) => {
        if (browser.runtime.lastError) {
          console.error("Error creating tab:", browser.runtime.lastError);
        } else {
          console.log("Confirmation tab created:", tab);
        }
      });
      sendResponse({ status: "success" });
      break;
    }

    default:
      console.log("Unknown action in message:", message.action);
      break;
  }
  // No need to return true because we're using async functions.
});
