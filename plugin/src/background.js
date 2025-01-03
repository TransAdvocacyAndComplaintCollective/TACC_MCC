if (typeof browser === 'undefined') {
  var browser = chrome;
}

let pendingData = null;
let pendingOriginUrl = null;
let sendStatus = 'Idle'; // Track the current status

// Function to open the init page on initial launch
function openInitPage() {
  const initUrl = browser.runtime.getURL("init/init.html");
  browser.tabs.create({ url: initUrl }, (tab) => {
    if (browser.runtime.lastError) {
      console.error("Error opening init page:", browser.runtime.lastError);
    } else {
      console.log("Init page opened successfully:", tab);
    }
  });
}

// Listen for the extension installation event
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Open the init page only on first installation
    openInitPage();
  }
});

// Listen for POST requests from BBC
browser.webRequest.onBeforeRequest.addListener(
  async (details) => {
    if (
      details.method === "POST" &&
      details.originUrl &&
      new URL(details.originUrl).hostname.endsWith("bbc.co.uk")
    ) {
      const requestBody = details.requestBody;

      if (requestBody) {
        let dataToCopy = "";

        // Handling form data
        if (requestBody.formData) {
          const formData = {};
          for (const [key, value] of Object.entries(requestBody.formData)) {
            formData[key] = value[0];
          }
          dataToCopy = JSON.stringify(formData, null, 2);
          console.log("Intercepted Form Data:", formData);
        }
        // Handling raw data
        else if (requestBody.raw && requestBody.raw[0]?.bytes) {
          try {
            const decoder = new TextDecoder("utf-8");
            const rawData = requestBody.raw[0].bytes;
            const decodedData = decoder.decode(rawData);
            dataToCopy = decodedData;
            console.log("Intercepted Raw Data:", decodedData);
          } catch (e) {
            console.error("Error decoding raw data:", e);
          }
        }

        if (dataToCopy) {
          // Store the data and origin URL
          try {
            pendingData = JSON.parse(dataToCopy);
          } catch (e) {
            console.error("Failed to parse intercepted data as JSON:", e);
            pendingData = dataToCopy; // Fallback to raw string if parsing fails
          }
          pendingOriginUrl = details.originUrl;

          // Open confirmation page in a new tab
          const confirmationUrl = `${browser.runtime.getURL(
            "confirmation/confirmation.html"
          )}?originUrl=${encodeURIComponent(details.originUrl)}&data=${encodeURIComponent(dataToCopy)}`;
          browser.tabs.create({ url: confirmationUrl }, (tab) => {
            if (chrome.runtime.lastError) {
              console.error("Error creating tab:", chrome.runtime.lastError);
            } else {
              console.log("Tab created successfully:", tab);
            }
          });
        }
      }
    }
    return {};
  },
  {
    urls: ["https://tackpckfdc.execute-api.eu-west-1.amazonaws.com/live/sendmessage"],
    types: ["xmlhttprequest"],
  },
  ["requestBody"]
);

// Listen for messages from confirmation page
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'confirmSend' && pendingData && pendingOriginUrl) {
    // User confirmed to send data
    sendStatus = 'Sending...';
    sendResponse({ status: 'Sending...' });
    sendToTACC(pendingData, pendingOriginUrl)
      .then(() => {
        sendStatus = 'Data sent successfully';
        console.log("Data successfully sent to TACC");
      })
      .catch((error) => {
        sendStatus = 'Failed to send data';
        console.error("Failed to send data:", error);
      })
      .finally(() => {
        pendingData = null;
        pendingOriginUrl = null;
      });
    return true; // Indicates that the response is asynchronous
  } else if (message.action === 'cancelSend') {
    // User canceled
    console.log("User canceled sending data to TACC.");
    sendStatus = 'Idle';
    pendingData = null;
    pendingOriginUrl = null;
  } else if (message.action === 'getSendStatus') {
    // Handle status requests
    sendResponse({ status: sendStatus });
  }
});

// Function to send the intercepted data to TACC
async function sendToTACC(data, originUrl) {
  try {
    await fetch("https://tacc.org.uk/api/intercept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        originUrl: originUrl,
        interceptedData: data
      })
    });
    sendStatus = 'Data sent successfully';
  } catch (error) {
    sendStatus = 'Failed to send data';
    throw error; // Rethrow to be caught in the caller
  }
}

// Function to check for problematic stories
async function checkForProblematicStories() {
  console.log("Checking for problematic stories...");
  try {
    const response = await fetch("endpoint.trans-matters.org.uk/problematic");
    if (response.ok) {
      const data = await response.json();
      if (data.length > 0) {
        data.forEach((story) => {
          browser.notifications.create({
            type: "basic",
            iconUrl: "icons/icon48.png",
            title: "Problematic Story Alert",
            message: `Title: ${story.title}\nClick to view more.`
          }, (notificationId) => {
            // Attach click handler for notification
            browser.notifications.onClicked.addListener((id) => {
              if (id === notificationId) {
                browser.tabs.create({ url: story.url });
              }
            });
          });
        });
      }
    }
  } catch (error) {
    console.error("Failed to check for problematic stories:", error);
  }
}

// Set intervals for checking problematic stories
setInterval(checkForProblematicStories, 60000); // Check every 1 minute
