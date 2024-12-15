// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const sendStatus = document.getElementById('send-status');
  const checkStoriesBtn = document.getElementById('check-stories-btn');
  const storiesList = document.getElementById('stories-list');

  // Function to update the send status
  function updateSendStatus(status) {
    sendStatus.textContent = status;
  }

  // Function to display problematic stories
  function displayStories(stories) {
    storiesList.innerHTML = ''; // Clear previous list
    if (stories.length === 0) {
      storiesList.textContent = 'No problematic stories found.';
      return;
    }
    
    const ul = document.createElement('ul');
    stories.forEach(story => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = story.url;
      link.textContent = story.title;
      link.target = '_blank';
      li.appendChild(link);
      ul.appendChild(li);
    });
    storiesList.appendChild(ul);
  }

  // Handle check stories button click
  checkStoriesBtn.addEventListener('click', async () => {
    checkStoriesBtn.disabled = true;
    checkStoriesBtn.textContent = 'Checking...';
    try {
      const response = await fetch('http://localhost:8080/problematic');
      if (response.ok) {
        const data = await response.json();
        displayStories(data);
      } else {
        storiesList.textContent = 'Failed to fetch problematic stories.';
      }
    } catch (error) {
      console.error('Error fetching problematic stories:', error);
      storiesList.textContent = 'Error fetching stories.';
    } finally {
      checkStoriesBtn.disabled = false;
      checkStoriesBtn.textContent = 'Check Problematic Stories';
    }
  });

  // Optionally, communicate with background script to get status
  // For example, you can use browser.runtime.sendMessage to request current status
  // Here's a simple example assuming background script can respond with status
  browser.runtime.sendMessage({ action: 'getSendStatus' })
    .then(response => {
      if (response && response.status) {
        updateSendStatus(response.status);
      }
    })
    .catch(error => {
      console.error('Error getting send status:', error);
      updateSendStatus('Error');
    });
});
