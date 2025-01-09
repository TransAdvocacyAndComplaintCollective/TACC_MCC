// Function to extract data from all review tables and send it to the background script
function extractAllReviewTableData() {
    // Select all review tables
    const reviewTables = document.querySelectorAll('.review-table');

    if (reviewTables.length > 0) {
        const allReviewTableData = {};

        reviewTables.forEach((table, index) => {
            // Get all rows in the current table
            const review_tableRows = table.querySelectorAll('tr');

            // Loop through each row and extract cell data
            review_tableRows.forEach((row) => {
                const cells = row.querySelectorAll('td'); // Adjust to 'th' if needed for header rows

                // Ensure there are at least two cells in the row before extracting
                if (cells.length >= 2) {
                    allReviewTableData[cells[0].innerText] = cells[1].innerText;
                } else {
                    console.warn("Row does not contain enough cells.");
                }
            });
        });

        // Send the extracted data for all tables to the background script
        chrome.runtime.sendMessage({
            action: "sendText",
            allReviewTableData: allReviewTableData,
        }, (response) => {
            // Log the response from the background script (optional)
            console.log("Background response:", response);
        });
    } else {
        console.warn("No review tables found on this page.");
    }
}

// Function to set up MutationObserver to monitor DOM changes
function observeDOMChanges() {
    const observer = new MutationObserver((mutationsList, observer) => {
        // Check if any review table is present after each DOM change
        extractAllReviewTableData();
    });

    // Configure the observer to watch for changes in child nodes and subtree
    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
}

// Start observing DOM changes when the content script loads
observeDOMChanges();
