
        // Function to handle the checkbox change event
        function handlePrivacyPolicyChange(event) {
            const isChecked = event.target.checked;

            // Set the value in browser.storage.local
            browser.storage.local.set({ privacyPolicyAccepted: isChecked })
                .then(() => {
                    console.log(`Privacy policy accepted: ${isChecked}`);
                })
                .catch(error => {
                    console.error('Error setting privacy policy in storage:', error);
                });
        }

        // Add event listener after DOM is fully loaded
        document.addEventListener('DOMContentLoaded', () => {
            const privacyCheckbox = document.getElementById('privacyPolicy');
            
            // Restore previous state from storage
            browser.storage.local.get('privacyPolicyAccepted').then(result => {
                if (result.privacyPolicyAccepted) {
                    privacyCheckbox.checked = true;
                }
            }).catch(error => {
                console.error('Error retrieving privacy policy state:', error);
            });

            // Attach the event listener to the checkbox
            privacyCheckbox.addEventListener('change', handlePrivacyPolicyChange);
        });