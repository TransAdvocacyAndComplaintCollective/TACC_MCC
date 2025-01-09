// background.js

// 1) Mapping the table row labels to your chosen internal field names
const mapping_to_formData = {  
  // Existing mappings (examples—rename the right side fields as you see fit)
  "What is your complaint about?": "generalissue1",
  "Are you contacting us about a previous complaint?": "previous_complaint",
  "Select the best category to describe your complaint": "complaint_category",
  "What is the subject of your complaint?": "subject",
  "Please enter your complaint, and please don’t add personal details such as your name, email or phone number in this field – we’ll ask you for those at the next stage": "description",
  "Do you require a response to your complaint?": "responserequired",
  "Location": "location",
  "Title (i.e. Mr, Ms etc.)": "salutation",
  "First Name": "firstname",
  "Last Name": "lastname",
  "Email address": "emailaddress",
  "Phone number": "phonenumber",
  "Postcode": "postcode",
  "Address Line 1": "addressline1",
  "Town/City": "towncity",
  "Are you under 18?": "under18",

  // TV-specific fields (if needed)
  "Which TV channel or service is your complaint about?": "tvchannel",

  // Radio / BBC Sounds-specific fields
  "What is the nature of your complaint?": "complaint_nature_sounds",
  "Which radio station is your complaint about?": "radio_station",
  "Please enter your local radio station": "localradio",

  // Website/App-specific fields
  "Which website or app is your complaint about?": "bbcwebsite_app",
  "Please give the URL, or name of the app": "bbc_url_or_appname",

  // Programme details
  "What is the programme title?": "programmetitle",
  "When was it broadcast? (dd/mm/yyyy)": "transmissiondate",
  "How did you watch or listen to the programme?": "liveorondemand",
  "Roughly how far into the programme did the issue happen?": "timestamp",

  // Optionally keep placeholders for unused or future fields
  "": "originUrl",
  "": "captcha",
  "": "dateproblemstarted",
  "": "intro_text",
  "": "iswelsh",
  "": "make",
  "": "moderation_text",
  "": "network",
  "": "outside_the_uk",
  "": "platform",
  "": "programme",
  "": "programmeid",
  "": "reception_text",
  "": "redbuttonfault",
  "": "region",
  "": "servicetv",
  "": "sounds_text",
  "": "sourceurl",
  "": "transmissiontime",
  "": "verifyform",
};

// 2) For cross-browser compatibility (optional)
if (typeof browser === "undefined") {
  var browser = chrome;
}

// 3) Listen for messages from the content script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sendText") {
    const allReviewTableData = message.allReviewTableData;

    // Create a container object for the parsed data
    const parsedData = {
      // Optionally store the raw table data for reference
      formData: {},
    };

    // 4) Map the table data keys to your form fields
    for (const key in allReviewTableData) {
      const mappedField = mapping_to_formData[key];
      if (mappedField) {
        // If we have a known mapping, place it under that field name
        parsedData["formData"][mappedField] = allReviewTableData[key];
      } else {
        // If no mapping is found, store under the original key
        parsedData["formData"][key] = allReviewTableData[key];
      }
    }

    // 5) Grab the page URL from the sender.tab object (optional)
    const originUrl = sender?.tab?.url ? sender.tab.url : "";

    // Log for debugging (optional)
    console.log("Captured Review Table Data:", allReviewTableData);
    console.log("parsedData object:", parsedData);
    console.log("URL of the page:", originUrl);

    // 6) Convert your parsedData to a JSON string
    const dataToCopy = JSON.stringify(parsedData);

    // 7) Construct the confirmation page URL
    const confirmationUrl = `${browser.runtime.getURL(
      "confirmation/confirmation.html"
    )}?originUrl=${encodeURIComponent(originUrl)}&data=${encodeURIComponent(dataToCopy)}`;

    // 8) Open the confirmation page in a new tab
    browser.tabs.create({ url: confirmationUrl }, (tab) => {
      if (browser.runtime.lastError) {
        console.error("Error creating tab:", browser.runtime.lastError);
      } else {
        console.log("Tab created successfully:", tab);
      }
    });

    // 9) Finally, send a success response back to the content script
    sendResponse({ status: "success" });
  }

  // Return true if you have any async work to do before responding
});
