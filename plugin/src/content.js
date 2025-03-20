(function() {
  console.log("Combined content script loaded on", window.location.href);
  const host = window.location.host;
  const pathname = window.location.pathname;

  /* ======================================================
     1. Police Hate Crime Online Review Extraction
     (for https://www.police.uk/ro/report/hate-crime/forms/v1/hate-crime-online2/)
  ====================================================== */
  if (
    host.includes("police.uk") &&
    pathname.includes("/ro/report/hate-crime/forms/v1/hate-crime-online2/")
  ) {
    console.log("Detected Police hate crime online review page.");
    document.addEventListener("DOMContentLoaded", function() {
      const reviewSection = document.querySelector(".c-summary");
      if (!reviewSection) {
        console.log("Review summary data not found on this page.");
        return;
      }
      const form = document.querySelector("form");
      if (!form) {
        console.log("No form element found on the page.");
        return;
      }
      form.addEventListener("submit", function(event) {
        // Uncomment next line to prevent actual submission while testing:
        // event.preventDefault();

        const summaryData = {};
        const summarySections = document.querySelectorAll(".c-summary");
        summarySections.forEach(section => {
          // Get the section title from the toggle button.
          const headerButton = section.querySelector(".c-summary_toggle");
          const sectionTitle = headerButton
            ? headerButton.querySelector(".c-summary_title")?.innerText.trim()
            : "Unknown Section";
          summaryData[sectionTitle] = {};

          // Extract each read-only item in this section.
          const items = section.querySelectorAll(".o-form-item-wrapper .c-readonly-item");
          items.forEach(item => {
            const labelEl = item.querySelector(".c-summary_label");
            const valueEl = item.querySelector(".c-summary_value");
            if (labelEl && valueEl) {
              const label = labelEl.innerText.trim();
              const value = valueEl.innerText.trim();
              summaryData[sectionTitle][label] = value;
            }
          });
        });
        console.log("Extracted review summary data on submission:", summaryData);
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage(
            {
              action: "scrapeReviewSubmission",
              data: summaryData
            },
            function(response) {
              if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError);
              } else {
                console.log("Background script response:", response);
              }
            }
          );
        }
      });
    });
    return; // Exit because we've handled the Police hate crime online page.
  }

  /* ======================================================
     2. Ofcom Salesforce Form Extraction
     (for pages on https://ofcomlive.my.salesforce-sites.com/formentry/)
  ====================================================== */
  if (host.includes("ofcomlive.my.salesforce-sites.com") && pathname.includes("/formentry/")) {
    console.log("Detected Ofcom Salesforce form page.");
    // If the URL indicates the BBC Online Material form, attach that listener…
    if (pathname.includes("SitesFormBBCOnlineMaterial")) {
      console.log("Detected BBC Online Material form page. Attaching its submission listener.");
      attachBBCOnlineMaterialSubmissionListener();
    } else {
      // Otherwise, try to attach a listener based on known Ofcom form IDs.
      attachOfcomFormListener();
    }
  }
  /* ======================================================
     3. BBC Complaints Extraction
     (for https://www.bbc.co.uk/contact/complaints/make-a-complaint/)
  ====================================================== */
  else if (host.includes("bbc.co.uk") && pathname.includes("/contact/complaints/make-a-complaint/")) {
    console.log("Detected BBC complaints page. Starting BBC extraction logic.");
    observeBBCChanges();
  }
  /* ======================================================
     4. IPSO Complaints Extraction
     (for https://www.ipso.co.uk/making-a-complaint/step-5)
  ====================================================== */
  else if (host.includes("ipso.co.uk") && pathname.includes("/making-a-complaint/step-5")) {
    console.log("Detected IPSO complaints page.");
    // Attach our IPSO button listener with enhanced logging.
    attachIPSOButtonListener();

    // Optionally, run extraction on page load as well:
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        console.log("DOM fully loaded for IPSO page, running extraction.");
        extractIPSOData();
      });
    } else {
      console.log("DOM already loaded for IPSO page, running extraction.");
      extractIPSOData();
    }
  }
  else {
    console.log("No matching extraction logic for this page.");
  }

  /* ==============================
     Function Definitions
  ============================== */

  // --- Ofcom Salesforce Forms ---
  function attachOfcomFormListener() {
    let form = null;
    let formType = ""; // e.g. "BBCStandards", "CSLEStandards", "FairnessAndPrivacy"
    
    if (document.getElementById("j_id0:template:my_form")) {
      form = document.getElementById("j_id0:template:my_form");
      formType = "BBCStandards";
      console.log("Detected BBC Standards Complaints form.");
    } else if (document.getElementById("j_id0:template:j_id42")) {
      form = document.getElementById("j_id0:template:j_id42");
      formType = "CSLEStandards";
      console.log("Detected CSLE Standards Complaints form.");
    } else if (document.getElementById("FairnessAndPrivacy:template:form")) {
      form = document.getElementById("FairnessAndPrivacy:template:form");
      formType = "FairnessAndPrivacy";
      console.log("Detected Fairness and Privacy form.");
    } else {
      console.log("No known Ofcom form found on this page.");
      return;
    }
    
    form.addEventListener("submit", function(event) {
      // Uncomment to prevent submission during testing:
      // event.preventDefault();

      let formData = {};
      if (formType === "BBCStandards") {
        formData.programmeTitle = document.getElementById("j_id0:template:my_form:programmeTitle")?.value || "";
        formData.broadcastDate = document.getElementById("j_id0:template:my_form:j_id54:j_id55:dateValue")?.value || "";
        formData.broadcastTime = document.getElementById("j_id0:template:my_form:j_id71:j_id72:timeValue")?.value || "";
        formData.channel = document.getElementById("j_id0:template:my_form:channel")?.value || "";
        formData.subject = document.getElementById("j_id0:template:my_form:subject")?.value || "";
        formData.description = document.getElementById("j_id0:template:my_form:description")?.value || "";
      } else if (formType === "CSLEStandards") {
        formData.programmeTitle = document.getElementById("j_id0:template:j_id42:programmeTitle")?.value || "";
        formData.broadcastDate = document.getElementById("j_id0:template:j_id42:j_id51:j_id52:dateValue")?.value || "";
        formData.broadcastTime = document.getElementById("j_id0:template:j_id42:j_id68:j_id69:timeValue")?.value || "";
        formData.channel = document.getElementById("j_id0:template:j_id42:channel")?.value || "";
        formData.subject = document.getElementById("j_id0:template:j_id42:subject")?.value || "";
        formData.description = document.getElementById("j_id0:template:j_id42:description")?.value || "";
      } else if (formType === "FairnessAndPrivacy") {
        formData.details = {
          salutation: document.getElementById("FairnessAndPrivacy:template:form:myDetailsSection:sfpvId:salutation")?.value || "",
          firstName: document.getElementById("FairnessAndPrivacy:template:form:myDetailsSection:sfpvId:firstName")?.value || "",
          lastName: document.getElementById("FairnessAndPrivacy:template:form:myDetailsSection:sfpvId:lastName")?.value || "",
          phone: document.getElementById("FairnessAndPrivacy:template:form:myDetailsSection:sfpvId:PersonMobilePhone")?.value || "",
          postcode: document.getElementById("FairnessAndPrivacy:template:form:myDetailsSection:sfpvId:PersonMailingPostalCode")?.value || "",
          address: document.getElementById("FairnessAndPrivacy:template:form:myDetailsSection:sfpvId:PersonMailingStreet")?.value || "",
          city: document.getElementById("FairnessAndPrivacy:template:form:myDetailsSection:sfpvId:PersonMailingCity")?.value || "",
          email: document.getElementById("FairnessAndPrivacy:template:form:myDetailsSection:sfpvId:email")?.value || "",
          emailConfirm: document.getElementById("FairnessAndPrivacy:template:form:myDetailsSection:sfpvId:emailConfirm")?.value || ""
        };
        formData.programmeTitle = document.getElementById("FairnessAndPrivacy:template:form:programmeTitle")?.value || "";
        formData.broadcastDate = document.getElementById("FairnessAndPrivacy:template:form:j_id135:j_id136:dateValue")?.value || "";
        formData.broadcastTime = document.getElementById("FairnessAndPrivacy:template:form:j_id152:j_id153:timeValue")?.value || "";
        formData.channel = document.getElementById("FairnessAndPrivacy:template:form:channel")?.value || "";
        formData.subject = document.getElementById("FairnessAndPrivacy:template:form:subject")?.value || "";
        formData.description = document.getElementById("FairnessAndPrivacy:template:form:description")?.value || "";
      }
      console.log("Extracted Ofcom form data on submission:", formData);
      if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: "scrapeFormSubmission", data: formData }, function(response) {
          if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError);
          } else {
            console.log("Background script response:", response);
          }
        });
      }
    });
  }

  function attachBBCOnlineMaterialSubmissionListener() {
    console.log("Attaching BBC Online Material form submission listener.");
    document.addEventListener("DOMContentLoaded", function() {
      const form = document.getElementById("j_id0:template:j_id42");
      if (!form) {
        console.log("BBC Online Material form not found on this page.");
        return;
      }
      form.addEventListener("submit", function(event) {
        // Uncomment to test without actual submission:
        // event.preventDefault();

        let formData = {};
        // --- Online Material Section ---
        formData.onlineMaterial = document.getElementById("j_id0:template:j_id42:onlinematerial")?.value || "";
        formData.accessDate = document.getElementById("j_id0:template:j_id42:j_id53:j_id54:dateValue")?.value || "";
        // --- Complaint Details Section ---
        formData.contactedBBC = document.getElementById("j_id0:template:j_id42:ContactedBBC")?.value || "";
        formData.bbcSubject = document.getElementById("j_id0:template:j_id42:bbcsubject")?.value || "";
        formData.complaintDescription = document.getElementById("j_id0:template:j_id42:description")?.value || "";
        formData.reasonForDissatisfaction = document.getElementById("j_id0:template:j_id42:ReasonforDissatisfaction")?.value || "";
        formData.bbcReferenceNumber = document.getElementById("j_id0:template:j_id42:BBCReferenceNumber")?.value || "";
        formData.bbcSubmissionDate = document.getElementById("j_id0:template:j_id42:j_id98:j_id99:dateValue")?.value || "";
        // --- Your Details Section ---
        formData.title = document.getElementById("j_id0:template:j_id42:j_id114:sfpvId:salutation")?.value || "";
        formData.firstName = document.getElementById("j_id0:template:j_id42:j_id114:sfpvId:firstName")?.value || "";
        formData.lastName = document.getElementById("j_id0:template:j_id42:j_id114:sfpvId:lastName")?.value || "";
        formData.postcode = document.getElementById("j_id0:template:j_id42:j_id114:sfpvId:PersonMailingPostalCode")?.value || "";
        formData.email = document.getElementById("j_id0:template:j_id42:j_id114:sfpvId:email")?.value || "";
        formData.emailConfirm = document.getElementById("j_id0:template:j_id42:j_id114:sfpvId:emailConfirm")?.value || "";
  
        console.log("Extracted BBC Online Material form data on submission:", formData);
  
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: "scrapeFormSubmission", data: formData }, function(response) {
            if (chrome.runtime.lastError) {
              console.error("Error sending message:", chrome.runtime.lastError);
            } else {
              console.log("Background script response:", response);
            }
          });
        }
      });
    });
  }
  
  // --- BBC Complaints Extraction ---
  function observeBBCChanges() {
    let count_page = 0;
    let bbcObserver = new MutationObserver((mutations) => {
      console.log(`[BBC] MutationObserver triggered with ${mutations.length} mutation(s).`);
      extractAllReviewTableData();
    });
    bbcObserver.observe(document.body, { childList: true, subtree: true });
    console.log("[BBC] MutationObserver initialized and observing DOM changes.");
  
    function extractAllReviewTableData() {
      console.log("[BBC] extractAllReviewTableData() invoked.");
      const reviewTables = document.querySelectorAll('.review-table');
      console.log("[BBC] Number of review tables found:", reviewTables.length);
      if (reviewTables.length > 0) {
        count_page++;
        console.log("[BBC] Incremented count_page to:", count_page);
        if (count_page !== 4) {
          console.log("[BBC] count_page is not 4 yet, waiting for further changes.");
          return;
        }
        const allReviewTableData = {};
        reviewTables.forEach((table, tableIndex) => {
          console.log(`[BBC] Processing table ${tableIndex + 1}`);
          const rows = table.querySelectorAll('tr');
          console.log(`[BBC] Number of rows in table ${tableIndex + 1}: ${rows.length}`);
          if (rows.length === 0) {
            console.log(`[BBC] Table ${tableIndex + 1} has no rows; skipping.`);
            return;
          }
          const firstRowCells = rows[0].querySelectorAll('th, td');
          if (firstRowCells.length === 2) {
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
        if (bbcObserver) {
          bbcObserver.disconnect();
          console.log("[BBC] MutationObserver disconnected after processing.");
        }
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
          console.log("[BBC] Sending extracted data to background script:", allReviewTableData);
          chrome.runtime.sendMessage({ action: "sendText", allReviewTableData: allReviewTableData }, (response) => {
            if (chrome.runtime.lastError) {
              console.error("[BBC] Error sending message:", chrome.runtime.lastError);
            } else {
              console.log("[BBC] Background response received:", response);
            }
          });
        } else {
          console.warn("[BBC] chrome.runtime.sendMessage is not available in this context.");
        }
      } else {
        console.warn("[BBC] No review tables found on this page.");
      }
    }
  }
  
  // --- IPSO Extraction ---
  function extractIPSOData() {
    console.log("Running IPSO data extraction.");
    function extractContactInfo() {
      console.log("Extracting IPSO contact info.");
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
      const contactInfo = { title, firstName, lastName, email, phone, address1, address2, town, postcode, country };
      console.log("Extracted IPSO contact info:", contactInfo);
      return contactInfo;
    }
    function extractClauses() {
      console.log("Extracting IPSO clauses.");
      const clauses = [];
      document.querySelectorAll(".code-breaches__item").forEach(item => {
        const clauseName = item.querySelector(".code-breaches__item-name")?.textContent.trim() || "";
        const clauseContent = item.querySelector(".code-breaches__item-content .code-breaches__item-inner")?.textContent.trim() || "";
        if (clauseName) {
          clauses.push({ clauseName, clauseContent });
        }
      });
      console.log("Extracted IPSO clauses:", clauses);
      return clauses;
    }
    function extractComplaintDetails() {
      console.log("Extracting IPSO complaint details.");
      const complaints = [];
      document.querySelectorAll(".review-title").forEach(titleEl => {
        const complaintTitle = titleEl.textContent.trim();
        const complaintContainer = titleEl.closest(".field-container");
        const details = complaintContainer ? complaintContainer.textContent.trim() : "";
        complaints.push({ complaintTitle, details });
      });
      console.log("Extracted IPSO complaint details:", complaints);
      return complaints;
    }
    const contactInfo = extractContactInfo();
    const clauses = extractClauses();
    const complaints = extractComplaintDetails();
  
    if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
      console.log("Sending IPSO data to background script.", { contactInfo, clauses, complaints });
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
    } else {
      console.warn("chrome.runtime.sendMessage is not available for IPSO extraction.");
    }
  }

  /* ======================================================
     5. IPSO Button Listener
     (Ensures our one capturing click listener is attached and re-attached if removed)
  ====================================================== */
  function attachIPSOButtonListener() {
    console.log("Setting up IPSO button listener with enhanced logging.");
    // Our event handler that should run first.
    const myHandler = function(event) {
      console.log("Our capturing callback for IPSO primary blue button fired.");
      extractIPSOData();
      // Do not stop propagation so that other listeners can run.
    };

    // Attaches our listener to the button and protects it from being removed.
    function attachListener(button) {
      if (!button) return;
      // Use a custom property to ensure we attach only once.
      if (!button.__myListenerAttached) {
        button.addEventListener("click", myHandler, true);
        button.__myListenerAttached = true;
        console.log("Attached our capturing listener to the IPSO button.", button);

        // Monkey-patch removeEventListener for "click" so that removal of our listener is blocked.
        const originalRemoveEventListener = button.removeEventListener.bind(button);
        button.removeEventListener = function(type, listener, options) {
          if (type === "click" && listener === myHandler) {
            console.log("Prevented removal of our IPSO listener.");
            return; // Ignore removal attempts for our listener.
          }
          originalRemoveEventListener(type, listener, options);
        };
      } else {
        console.log("Our IPSO listener is already attached to the button.");
      }
    }

    // Checks for the button and attaches our listener if found.
    function checkAndAttach() {
      const button = document.querySelector('.btn.btn--primary-blue');
      if (button) {
        console.log("Found IPSO primary blue button:", button);
        attachListener(button);
      } else {
        console.log("IPSO primary blue button not found on the page.");
      }
    }

    // Use a MutationObserver to watch for the button being added or re-added.
    const observer = new MutationObserver((mutations, obs) => {
      console.log("MutationObserver for IPSO button triggered.", mutations);
      checkAndAttach();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Initial check in case the button is already present.
    checkAndAttach();
  }
})();
