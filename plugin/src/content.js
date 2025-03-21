// Global counter for how many times review tables were detected
let count_page = 0;
let observer; // We'll store the MutationObserver here

// Function to extract data from all review tables and send it to the background script
function extractAllReviewTableData() {
  console.log("[extractAllReviewTableData] Function invoked.");
  const reviewTables = document.querySelectorAll('.review-table');
  console.log("[extractAllReviewTableData] Number of review tables found:", reviewTables.length);
  console.log("[extractAllReviewTableData] Current count_page before processing:", count_page);

  if (reviewTables.length > 0) {
    // Increment the counter when review tables are found
    count_page++;
    console.log("[extractAllReviewTableData] Incremented count_page to:", count_page);

    // Only proceed to send data when count_page === 4
    if (count_page !== 4) {
      console.log("[extractAllReviewTableData] count_page is not 4 yet, waiting for further changes.");
      return;
    }

    // Build an object to hold data from all review tables
    const allReviewTableData = {};

    // Iterate over each review table on the page
    reviewTables.forEach((table, tableIndex) => {
      console.log(`[extractAllReviewTableData] Processing table ${tableIndex + 1} of ${reviewTables.length}`);
      const rows = table.querySelectorAll('tr');
      console.log(`[extractAllReviewTableData] Number of rows found in table ${tableIndex + 1}: ${rows.length}`);

      if (rows.length === 0) {
        console.log(`[extractAllReviewTableData] Table ${tableIndex + 1} has no rows; skipping.`);
        return;
      }

      // Determine the table's structure:
      // • If the first row contains two cells, assume each row is a key/value pair.
      // • Otherwise, assume rows come in pairs: one for the key and the next for the value.
      const firstRowCells = rows[0].querySelectorAll('th, td');
      if (firstRowCells.length === 2) {
        // Process each row as a key/value pair.
        rows.forEach((row, rowIndex) => {
          const cells = row.querySelectorAll('th, td');
          if (cells.length === 2) {
            const key = cells[0].innerText.trim();
            const value = cells[1].innerText.trim();
            console.log(`[extractAllReviewTableData] Table ${tableIndex + 1}, row ${rowIndex + 1}: Extracted key: "${key}", value: "${value}"`);
            allReviewTableData[key] = value;
          } else {
            console.log(`[extractAllReviewTableData] Table ${tableIndex + 1}, row ${rowIndex + 1}: Not enough cells.`);
          }
        });
      } else {
        // Assume rows are in pairs: first row contains the key, and the next row contains the value.
        for (let i = 0; i < rows.length; i += 2) {
          const keyRow = rows[i];
          const valueRow = rows[i + 1];
          const key = keyRow ? keyRow.innerText.trim() : "";
          const value = valueRow ? valueRow.innerText.trim() : "";
          console.log(`[extractAllReviewTableData] Table ${tableIndex + 1}, rows ${i + 1} & ${i + 2}: Extracted key: "${key}", value: "${value}"`);
          if (key) {
            allReviewTableData[key] = value;
          }
        }
      }
    });

    // Once data is gathered, disconnect the observer so we don’t process further changes
    if (observer) {
      observer.disconnect();
      console.log("[extractAllReviewTableData] DOM observer disconnected after processing.");
    }

    // Safely check for chrome.runtime before sending the message
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      console.log("[extractAllReviewTableData] Sending data to background script:", allReviewTableData);
      chrome.runtime.sendMessage(
        {
          action: "sendText",
          allReviewTableData: allReviewTableData,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("[extractAllReviewTableData] Error sending message:", chrome.runtime.lastError);
          } else {
            console.log("[extractAllReviewTableData] Background response received:", response);
          }
        }
      );
    } else {
      console.warn("[extractAllReviewTableData] chrome.runtime.sendMessage is not available in this context.");
    }
  } else {
    console.warn("[extractAllReviewTableData] No review tables found on this page.");
    // (Optional) Reset count_page here if needed:
    // count_page = 0;
  }
}

// Observe DOM changes and run extractAllReviewTableData whenever the DOM updates
function observeDOMChanges() {
  observer = new MutationObserver((mutations, obs) => {
    console.log(`[observeDOMChanges] MutationObserver triggered with ${mutations.length} mutation(s).`);
    mutations.forEach((mutation, index) => {
      console.log(`[observeDOMChanges] Mutation ${index + 1}:`, mutation);
    });
    extractAllReviewTableData();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  console.log("[observeDOMChanges] MutationObserver initialized and observing DOM changes.");
}

// Initialize observation when the content script loads
console.log("[Main] Content script loaded. Starting DOM observation.");
observeDOMChanges();