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
