// Helper function for setting storage
function setStorage(data, callback) {
  if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
      // Firefox (or any browser using the promise-based API)
      browser.storage.local.set(data).then(callback).catch(error => {
          console.error('Error setting privacy policy in storage:', error);
      });
  } else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      // Chrome (callback-based API)
      chrome.storage.local.set(data, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
              console.error('Error setting privacy policy in storage:', chrome.runtime.lastError);
          }
          callback();
      });
  } else {
      console.error('No compatible storage API found.');
  }
}

// Helper function for getting storage
function getStorage(key, callback) {
  if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
      // Firefox
      browser.storage.local.get(key).then(callback).catch(error => {
          console.error('Error retrieving privacy policy state:', error);
      });
  } else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      // Chrome
      chrome.storage.local.get(key, (result) => {
          if (chrome.runtime && chrome.runtime.lastError) {
              console.error('Error retrieving privacy policy state:', chrome.runtime.lastError);
          }
          callback(result);
      });
  } else {
      console.error('No compatible storage API found.');
  }
}

// Function to handle the button click event
function handlePrivacyPolicyClick(event) {
  // Once clicked, store acceptance in storage
  setStorage({ privacyPolicyAccepted: true }, () => {
      console.log('Privacy policy accepted');
      // Optionally disable the button and change its text
      event.target.disabled = true;
      event.target.textContent = 'Privacy Policy Accepted';
      // Navigate to /help/help.html
      window.location.href = '/help/help.html';

}

// Add event listener after DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const privacyButton = document.getElementById('privacyButton');

  // Check previous state from storage
  getStorage('privacyPolicyAccepted', (result) => {
      if (result && result.privacyPolicyAccepted) {
          privacyButton.disabled = true;
          privacyButton.textContent = 'Privacy Policy Accepted';
      }
  });

  // Attach the event listener to the button
  privacyButton.addEventListener('click', handlePrivacyPolicyClick);
});

