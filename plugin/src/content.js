'use strict';

// Define browser for compatibility (Chrome only)
const browser = chrome;

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
  if (bbcExtractionDone) return; // Prevent reprocessing
  console.log("extractReviewTableDataBBC invoked.");

  const reviewTables = document.querySelectorAll('.review-table');
  console.log("Found", reviewTables.length, "review table(s).");

  if (reviewTables.length < 4) {
    console.log(
      `Not enough review tables found (found ${reviewTables.length}, expecting at least 4). Waiting for further changes.`
    );
    return;
  }

  const allReviewTableData = {};

  reviewTables.forEach((table, tableIndex) => {
    console.log(`Processing table ${tableIndex + 1} of ${reviewTables.length}`);
    const rows = table.querySelectorAll('tr');
    console.log(`Number of rows found in table ${tableIndex + 1}:`, rows.length);

    if (!rows.length) {
      console.log(`Table ${tableIndex + 1} has no rows; skipping.`);
      return;
    }

    const firstRowCells = rows[0].querySelectorAll('th, td');
    if (firstRowCells.length === 2) {
      rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('th, td');
        if (cells.length === 2) {
          const key = cells[0].innerText.trim();
          const value = cells[1].innerText.trim();
          console.log(`Table ${tableIndex + 1}, row ${rowIndex + 1}: key = "${key}", value = "${value}"`);
          allReviewTableData[key] = value;
        } else {
          console.warn(`Table ${tableIndex + 1}, row ${rowIndex + 1} does not have exactly 2 cells.`);
        }
      });
    } else {
      // Process rows in pairs if not in key/value pair format
      for (let i = 0; i < rows.length; i += 2) {
        const keyRow = rows[i];
        const valueRow = rows[i + 1];
        const key = keyRow ? keyRow.innerText.trim() : "";
        const value = valueRow ? valueRow.innerText.trim() : "";
        console.log(`Table ${tableIndex + 1}, rows ${i + 1} & ${i + 2}: key = "${key}", value = "${value}"`);
        if (key) {
          allReviewTableData[key] = value;
        }
      }
    }
  });

  bbcExtractionDone = true;
  console.log("BBC extraction complete. Data:", allReviewTableData);
  sendMessageToBackground({ action: "sendText", allReviewTableData, where: "BBC" });
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
