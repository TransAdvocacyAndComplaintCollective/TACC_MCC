'use strict';

// Define browser for compatibility (Chrome only)
const browser = chrome;
let count_page = 0;
// Extraction flags to ensure extraction happens only once per website
let bbcExtractionDone = false;
let ipsoExtractionDone = false;
let ofcomExtractionDone = false;

/**
 * Sends a message to the background script.
 * @param {Object} message - The message to send.
 */
function sendMessageToBackground(message) {
  if (chrome?.runtime?.sendMessage) {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError);
      } else {
        console.log("Background response received:", response);
      }
    });
  } else {
    console.warn("chrome.runtime.sendMessage is not available in this context.");
  }
}

/**
 * Extracts review table data from BBC pages.
 */
function extractReviewTableDataBBC() {

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

    sendMessageToBackground({ action: "sendText", allReviewTableData, where: "BBC" });
  } else {
    console.warn("[extractAllReviewTableData] No review tables found on this page.");;
  }
}

/**
 * Extracts review data from IPSO pages.
 */
function extractReviewDataIPSO() {
  if (ipsoExtractionDone) return; // Prevent reprocessing
  console.log("extractReviewDataIPSO invoked.");

  const complaintDetails = {};
  const codeBreaches = [];
  const contactDetails = {};

  const fieldsets = document.querySelectorAll("fieldset.field-group");
  fieldsets.forEach((fs) => {
    const legend = fs.querySelector("legend");
    if (!legend) return;
    const legendText = legend.innerText.trim();

    if (legendText.includes("Here's what you've told us:")) {
      // Extract complaint details
      const titleEl = fs.querySelector(".review-title");
      if (titleEl) {
        complaintDetails.title = titleEl.innerText.trim();
      }
      const reviewFields = fs.querySelectorAll(".review-field .review-field__content p");
      complaintDetails.fields = [];
      reviewFields.forEach((p) => {
        complaintDetails.fields.push(p.innerText.trim());
      });
    } else if (legendText.includes("You believe the complaints breach")) {
      // Extract code breaches
      const breachItems = fs.querySelectorAll(".code-breaches__item");
      breachItems.forEach((item) => {
        const clauseName = item.querySelector(".code-breaches__item-name")?.innerText.trim() || "";
        const clauseText = item.querySelector(".code-breaches__item-content-text")?.innerText.trim() || "";
        if (clauseName) {
          codeBreaches.push({ clause: clauseName, details: clauseText });
        }
      });
    } else if (legendText.includes("Let us know how to contact you")) {
      // Extract contact details
      const inputs = fs.querySelectorAll("input");
      inputs.forEach((input) => {
        if (input.id) {
          contactDetails[input.id] = input.value.trim();
        }
      });
      const checkbox = fs.querySelector("input[type='checkbox'][id='terms-and-conditions']");
      contactDetails["terms-and-conditions"] = checkbox ? checkbox.checked : false;
    }
  });

  const allReviewData = { complaintDetails, codeBreaches, contactDetails };
  ipsoExtractionDone = true;
  console.log("IPSO extraction complete. Data:", allReviewData);
  sendMessageToBackground({ action: "sendText", allReviewData, where: "IPSO" });
}

/**
 * Placeholder for Ofcom data extraction.
 */
function extractReviewDataOFCOM() {
  if (ofcomExtractionDone) return;
  console.log("extractReviewDataOFCOM invoked. Extraction logic not implemented.");
  ofcomExtractionDone = true;
  // TODO: Implement Ofcom extraction logic here
}

const config = { attributes: true, childList: true, subtree: true };
const observer = new MutationObserver((mutationsList, observer) => {
  console.log("Mutation observed.");
  const host = window.location.host;
  const pathname = window.location.pathname;
  console.log("Host:", host);
  console.log("Pathname:", pathname);
  if (host === "www.bbc.co.uk") {
    extractReviewTableDataBBC();
  }
  if (host === "www.ipso.co.uk" && pathname === "/making-a-complaint/step-5") {
    let count = 0;
    const config2 = { attributes: true, childList: true, subtree: true };
    const observer2 = new MutationObserver((mutationsList, observer) => {
      if (count < 1) {
        count = count + 1;
        return;
      }
      extractReviewDataIPSO();
    });
    const btn = document.querySelector('.btn.btn--primary-blue');
    observer2.observe(btn, config2);
  }
  if (host === "www.ofcom.org.uk") {
    extractReviewDataOFCOM();
  }
});

observer.observe(document.body, config);

