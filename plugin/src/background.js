// background.js

// 1) If you have a specific mapping from table data to form fields,
//    define it here. You can add key-value pairs such as:
//    "Review Table Title": "title"
const mapping_to_formDAta = {  
  "":"originUrl",
  "":"previous_complaint",
  "":"captcha",
  "":"dateproblemstarted",
  "Please enter your complaint, and please don’t add personal details such as your name, email or phone number in this field – we’ll ask you for those at the next stage":"description",
  "Email address":"emailaddress", // Optional
  "First Name":"firstname", // Optional
  "Last Name":"lastname", // Optional
  "Title (i.e. Mr, Ms etc.)":"salutation",
  "":"generalissue1",
  "":"intro_text",
  "":"iswelsh",
  "":"liveorondemand",
  "":"localradio",
  "":"make",
  "":"moderation_text",
  "":"network",
  "":"outside_the_uk",
  "":"platform",
  "":"programme",
  "":"programmeid",
  "":"reception_text",
  "":"redbuttonfault",
  "":"region",
  "":"responserequired",
  "":"servicetv",
  "":"sounds_text",
  "":"sourceurl",
  "":"subject",
  "What is the subject of your complaint?":"title",
  "":"transmissiondate",
  "":"transmissiontime",
  "Are you under 18?":"under18", // <-- Un-commented
  "":"verifyform",
  "":"complaint_nature",
  "":"complaint_nature_sounds",
};

// 2) For cross-browser compatibility (optional)
if (typeof browser === "undefined") {
  var browser = chrome;
}

// 3) Listen for messages from the content script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Check the action in the message
  if (message.action === "sendText") {
    // Extract the table data sent from the content script
    const allReviewTableData = message.allReviewTableData;

    // Create a container object if you want to store everything together
    const parsedData = {
      // Store original table data under "formData" if desired
      formData: allReviewTableData,
    };

    // 4) Optionally map the table data keys to your form fields
    for (const key in allReviewTableData) {
      const mappedField = mapping_to_formDAta[key];
      if (mappedField) {
        // If we have a known mapping, place it under that field name
        parsedData[mappedField] = allReviewTableData[key];
      } else {
        // Otherwise, store it under the original key
        parsedData[key] = allReviewTableData[key];
      }
    }

    // 5) Grab the page URL from the sender.tab object
    const originUrl = sender?.tab?.url ? sender.tab.url : "";

    // Log for debugging
    console.log("Captured Review Table Data:", allReviewTableData);
    console.log("parsedData object:", parsedData);
    console.log("URL of the page:", originUrl);

    // 6) Prepare data to pass to the confirmation page
    //    Convert your parsedData to a JSON string
    const dataToCopy = JSON.stringify(parsedData);

    // 7) Construct the confirmation page URL
    //    Include originUrl and data in the query string
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
    // 10) Finally, send a success response back to the content script
    sendResponse({ status: "success" });
  }

  // If you do async operations (e.g., fetch or chrome.tabs.query) before
  // calling sendResponse, remember to `return true;` here for async handling.
});
