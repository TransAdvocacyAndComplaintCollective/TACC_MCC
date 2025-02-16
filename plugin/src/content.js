(function () {
  console.log("Combined content script loaded on", window.location.href);
  const host = window.location.host;
  
  /* ============================
     BBC Extraction Code
     (for https://www.bbc.co.uk/contact/complaints/make-a-complaint/*)
  ============================ */
  
  // Global counter and observer for BBC pages
  let count_page = 0;
  let bbcObserver;
  
  function extractAllReviewTableData() {
    console.log("[BBC] extractAllReviewTableData() invoked.");
    const reviewTables = document.querySelectorAll('.review-table');
    console.log("[BBC] Number of review tables found:", reviewTables.length);
    console.log("[BBC] count_page before processing:", count_page);
    
    if (reviewTables.length > 0) {
      count_page++;
      console.log("[BBC] Incremented count_page to:", count_page);
      
      // Only proceed when count_page reaches 4
      if (count_page !== 4) {
        console.log("[BBC] count_page is not 4 yet, waiting for further changes.");
        return;
      }
      
      // Build an object to hold data from all review tables
      const allReviewTableData = {};
      
      reviewTables.forEach((table, tableIndex) => {
        console.log(`[BBC] Processing table ${tableIndex + 1}`);
        const rows = table.querySelectorAll('tr');
        console.log(`[BBC] Number of rows in table ${tableIndex + 1}: ${rows.length}`);
        
        if (rows.length === 0) {
          console.log(`[BBC] Table ${tableIndex + 1} has no rows; skipping.`);
          return;
        }
        
        // Check the structure of the table:
        const firstRowCells = rows[0].querySelectorAll('th, td');
        if (firstRowCells.length === 2) {
          // Each row is a key/value pair
          rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('th, td');
            if (cells.length === 2) {
              const key = cells[0].innerText.trim();
              const value = cells[1].innerText.trim();
              console.log(`[BBC] Table ${tableIndex + 1}, row ${rowIndex + 1}: key: "${key}", value: "${value}"`);
              allReviewTableData[key] = value;
            } else {
              console.log(`[BBC] Table ${tableIndex + 1}, row ${rowIndex + 1}: Not enough cells.`);
            }
          });
        } else {
          // Assume rows come in pairs: one for the key, one for the value
          for (let i = 0; i < rows.length; i += 2) {
            const keyRow = rows[i];
            const valueRow = rows[i + 1];
            const key = keyRow ? keyRow.innerText.trim() : "";
            const value = valueRow ? valueRow.innerText.trim() : "";
            console.log(`[BBC] Table ${tableIndex + 1}, rows ${i + 1} & ${i + 2}: key: "${key}", value: "${value}"`);
            if (key) {
              allReviewTableData[key] = value;
            }
          }
        }
      });
      
      // Disconnect observer so that we do not re-run the extraction
      if (bbcObserver) {
        bbcObserver.disconnect();
        console.log("[BBC] MutationObserver disconnected after processing.");
      }
      
      // Send the data to the background script if available
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
        console.log("[BBC] Sending extracted data to background script:", allReviewTableData);
        chrome.runtime.sendMessage(
          {
            action: "sendText",
            allReviewTableData: allReviewTableData,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error("[BBC] Error sending message:", chrome.runtime.lastError);
            } else {
              console.log("[BBC] Background response received:", response);
            }
          }
        );
      } else {
        console.warn("[BBC] chrome.runtime.sendMessage is not available in this context.");
      }
    } else {
      console.warn("[BBC] No review tables found on this page.");
    }
  }
  
  function observeBBCChanges() {
    bbcObserver = new MutationObserver((mutations) => {
      console.log(`[BBC] MutationObserver triggered with ${mutations.length} mutation(s).`);
      extractAllReviewTableData();
    });
    
    bbcObserver.observe(document.body, { childList: true, subtree: true });
    console.log("[BBC] MutationObserver initialized and observing DOM changes.");
  }
  
  /* ============================
     IPSO Extraction Code
     (for https://www.ipso.co.uk/making-a-complaint/*)
  ============================ */
  
  // Extract contact info from IPSO page
  function extractContactInfo() {
    const title = document.getElementById("title")?.value || "";
    const firstName = document.getElementById("first_name")?.value || "";
    const lastName = document.getElementById("last_name")?.value || "";
    const email = document.getElementById("email_address")?.value || "";
    const phone = document.getElementById("phone_number")?.value || "";
    const address1 = document.getElementById("address_line_1")?.value || "";
    const address2 = document.getElementById("address_line_2")?.value || "";
    const town = document.getElementById("town_city")?.value || "";
    const postcode = document.getElementById("postcode")?.value || "";
    const country = document.querySelector(".multiselect__single")?.textContent.trim() || "";
    
    return { title, firstName, lastName, email, phone, address1, address2, town, postcode, country };
  }
  
  // Extract "following clauses" from IPSO page
  function extractClauses() {
    const clauses = [];
    document.querySelectorAll(".code-breaches__item").forEach(item => {
      const clauseName = item.querySelector(".code-breaches__item-name")?.textContent.trim() || "";
      const clauseContent = item.querySelector(".code-breaches__item-content .code-breaches__item-inner")?.textContent.trim() || "";
      if (clauseName) {
        clauses.push({ clauseName, clauseContent });
      }
    });
    return clauses;
  }
  
  // Extract "Here's what you've told us" complaint details from IPSO page
  function extractComplaintDetails() {
    const complaints = [];
    document.querySelectorAll(".review-title").forEach(titleEl => {
      const complaintTitle = titleEl.textContent.trim();
      const complaintContainer = titleEl.closest(".field-container");
      const details = complaintContainer ? complaintContainer.textContent.trim() : "";
      complaints.push({ complaintTitle, details });
    });
    return complaints;
  }
  
  function extractIPSOData() {
    const contactInfo = extractContactInfo();
    const clauses = extractClauses();
    const complaints = extractComplaintDetails();
    
    console.log("IPSO Contact Info:", contactInfo);
    console.log("IPSO Clauses:", clauses);
    console.log("IPSO Complaint Details:", complaints);
    
    // Optionally, send these details to your background script
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: "sendIPSOData",
        contactInfo: contactInfo,
        clauses: clauses,
        complaints: complaints,
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("IPSO Error sending message:", chrome.runtime.lastError);
        } else {
          console.log("IPSO Background response received:", response);
        }
      });
    }
  }
  
  /* ============================
     Decide which extraction logic to run based on the URL
  ============================ */
  
  if (host.includes("bbc.co.uk") && window.location.pathname.includes("/contact/complaints/make-a-complaint/")) {
    console.log("Detected BBC complaints page. Starting BBC extraction logic.");
    // Start watching for DOM changes on BBC page
    observeBBCChanges();
  } else if (host.includes("ipso.co.uk") && window.location.pathname.includes("/making-a-complaint/")) {
    console.log("Detected IPSO complaints page. Extracting IPSO data.");
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", extractIPSOData);
    } else {
      extractIPSOData();
    }
  } else {
    console.log("No matching extraction logic for this page.");
  }
})();
