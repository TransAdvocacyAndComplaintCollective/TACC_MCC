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

// Validate and display originUrl and data
if (originUrl && data) {
  try {
    const parsedData = JSON.parse(data);
    const formattedJson = JSON.stringify(parsedData, null, 2); // Pretty-print JSON
    displayContent(formattedJson);
    console.log("Origin URL:", originUrl);
    console.log("Parsed Data:", parsedData);
  } catch (error) {
    displayContent("Invalid JSON format:\n" + data, true);
    console.error("Error parsing JSON:", error);
  }
} else {
  displayContent("No data available to display.", true);
  console.error("Missing originUrl or data in the URL parameters.");
}

// Function to send data to TACC
async function sendDataToTACC(originUrl, data) {
  try {
    const parsedData = JSON.parse(data); // Parse JSON for validation
    const response = await fetch("https://endpoint.trans-matters.org.uk/intercept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        originUrl: originUrl,
        interceptedData: parsedData,
      }),
    });

    if (!response.ok) {
      console.error("Failed to send data to TACC:", response.statusText);
      alert("Failed to send data. Please try again.");
      return;
    }

    // Parse the server response
    const responseData = await response.json();
    console.log("Data successfully sent to TACC:", responseData);

    // Display success message with complaint number (if available)
    if (responseData.id) {
      alert(`Data sent successfully! Your complaint number is: ${responseData.id}`);
    } else {
      alert("Data sent successfully, but no complaint number was returned.");
    }

    window.close(); // Close the tab on success
  } catch (error) {
    console.error("Error sending data to TACC:", error);
    alert("An error occurred while sending data. Please check the console for details.");
  }
}

// Event listeners for buttons
document.getElementById("sendBtn").addEventListener("click", () => {
  if (originUrl && data) {
    console.log("Attempting to send data to TACC...");
    sendDataToTACC(originUrl, data);
  } else {
    alert("Data or origin URL is missing. Cannot send to TACC.");
  }
});

document.getElementById("cancelBtn").addEventListener("click", () => {
  console.log("Data sending canceled by user.");
  window.close(); // Close the tab
});
