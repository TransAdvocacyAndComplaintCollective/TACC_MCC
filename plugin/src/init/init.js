// Function to handle the checkbox change event
function handlePrivacyPolicyChange(event) {
    const isChecked = event.target.checked;

    // Set the value in chrome.storage.local
    chrome.storage.local.set({ privacyPolicyAccepted: isChecked }, () => {
        if (chrome.runtime.lastError) {
            console.error('Error setting privacy policy in storage:', chrome.runtime.lastError);
        } else {
            console.log(`Privacy policy accepted: ${isChecked}`);
        }
    });
}

// Add event listener after DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const privacyCheckbox = document.getElementById('privacyPolicy');

    // Restore previous state from storage
    chrome.storage.local.get('privacyPolicyAccepted', (result) => {
        if (chrome.runtime.lastError) {
            console.error('Error retrieving privacy policy state:', chrome.runtime.lastError);
        } else {
            if (result.privacyPolicyAccepted) {
                privacyCheckbox.checked = true;
            }
        }
    });

    // Attach the event listener to the checkbox
    privacyCheckbox.addEventListener('change', handlePrivacyPolicyChange);
});
