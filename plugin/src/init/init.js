// storage.js (or inlined in your script)
function storageGet(keys) {
    return new Promise((resolve, reject) => {
      if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
        // Firefox (and some newer Chrome versions if using a polyfill)
        browser.storage.local
          .get(keys)
          .then(resolve)
          .catch(reject);
      } else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        // Chrome (callback-based)
        chrome.storage.local.get(keys, (result) => {
          const error = chrome.runtime?.lastError;
          if (error) {
            return reject(error);
          }
          resolve(result);
        });
      } else {
        reject(new Error('No storage API found.'));
      }
    });
  }
  
  function storageSet(items) {
    return new Promise((resolve, reject) => {
      if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
        // Firefox (and some newer Chrome versions if using a polyfill)
        browser.storage.local
          .set(items)
          .then(resolve)
          .catch(reject);
      } else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        // Chrome (callback-based)
        chrome.storage.local.set(items, () => {
          const error = chrome.runtime?.lastError;
          if (error) {
            return reject(error);
          }
          resolve();
        });
      } else {
        reject(new Error('No storage API found.'));
      }
    });
  }
  