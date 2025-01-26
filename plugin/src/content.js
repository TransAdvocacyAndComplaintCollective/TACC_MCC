// Global counter for how many pages have been processed
let count_page = 0;

// Function to extract data from all review tables and send it to the background script
function extractAllReviewTableData() {
    const reviewTables = document.querySelectorAll('.review-table');
    console.log("Page count:", count_page);

    if (reviewTables.length > 0) {
        // We've found review tables; increment the count
        count_page++;
        console.log("Review tables found:", reviewTables.length);
        console.log("Page count:", count_page);

        // Only proceed to send data when count_page === 4
        if (count_page !== 4) {
            return;
        }

        // Build an object to hold data from all review tables
        const allReviewTableData = {};

        // Iterate over each review table on the page
        reviewTables.forEach((table) => {
            // Get all rows in the current table
            const review_tableRows = table.querySelectorAll('tr');

            // Loop through each row and extract cell data
            review_tableRows.forEach((row) => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const key = cells[0].innerText.trim();
                    const value = cells[1].innerText.trim();
                    allReviewTableData[key] = value;
                }
            });
        });

        // Safely check for chrome.runtime to avoid TypeError
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage(
                {
                    action: "sendText",
                    allReviewTableData: allReviewTableData,
                },
                (response) => {
                    console.log("Background response:", response);
                }
            );
        } else {
            console.warn("chrome.runtime.sendMessage is not available in this context.");
        }
    } else {
        console.warn("No review tables found on this page.");
        // If you do want to reset count_page when no tables are found, do:
        count_page = 0;
    }
}

// Observe DOM changes and run extractAllReviewTableData whenever the DOM updates
function observeDOMChanges() {
    const observer = new MutationObserver(() => {
        extractAllReviewTableData();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
}

// Initialize observation when the content script loads
observeDOMChanges();
