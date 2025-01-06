// Function to get query parameters
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Function to validate form fields manually
function validateForm(form) {
    let isValid = true;
    const errors = [];

    // TACC Record ID validation
    const interceptId = form.interceptId.value.trim();
    const interceptIdPattern =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!interceptIdPattern.test(interceptId)) {
        isValid = false;
        errors.push("Please enter a valid TACC Record ID (UUID v4).");
    }

    // BBC Reference Number validation
    const bbcRef = form.bbcRef.value.trim();
    const bbcRefPattern = /^[A-Z]{3}-\d{7}-[A-Z0-9]{6}$/;
    if (!bbcRefPattern.test(bbcRef) && bbcRef.length > 0) {
        if (
            !confirm(
                "The BBC Reference Number is invalid. Are you sure you want to submit without a valid reference?"
            )
        ) {
            isValid = false;
        }
    }

    // Complaint Response validation
    const bbcReply = form.bbcReply.value.trim();
    if (bbcReply.length === 0) {
        isValid = false;
        errors.push("Complaint Response cannot be empty.");
    }

    // GDPR Consent validation
    const gdprConsentChecked = form.gdprConsent.checked;
    if (!gdprConsentChecked) {
        isValid = false;
        errors.push(
            "You must acknowledge the GDPR Privacy Policy to submit your reply."
        );
    }

    return { isValid, errors };
}

// Function to fetch and display complaint details
async function fetchComplaintDetails(uuid) {
    const complaintDetails = document.getElementById("complaintDetails");
    const complaintTitle = document.getElementById("complaintTitle");
    const sourceurl = document.getElementById("sourceurl");
    const programme = document.getElementById("programme");
    const complaintDescription = document.getElementById(
        "complaintDescription"
    );

    const repliesSection = document.getElementById("repliesSection");
    const repliesList = document.getElementById("repliesList");

    try {
        // Fetch complaint details
        const complaintResponse = await fetch(`/api/complaint/${uuid}`);
        if (!complaintResponse.ok) {
            throw new Error("Complaint not found.");
        }
        const complaintData = await complaintResponse.json();
        complaintTitle.textContent =
            complaintData.complaint.title || "No Title";
        sourceurl.textContent = complaintData.complaint.sourceurl ;
        programme.textContent = complaintData.complaint.programme ;

        complaintDescription.textContent =
            complaintData.complaint.description || "No Description";
        complaintDetails.style.display = "block";
    } catch (error) {
        // Hide complaint details if fetching fails
        complaintDetails.style.display = "none";
        displayError(error.message);
        console.error("Error fetching complaint details:", error);
        return; // Exit the function if complaint details cannot be fetched
    }

    try {
        // Fetch existing replies
        const repliesResponse = await fetch(`/api/replies/${uuid}`);
        if (!repliesResponse.ok) {
            return; // No need to throw an error if replies are not found
        }
        const repliesData = await repliesResponse.json();

        // Clear existing replies
        repliesList.innerHTML = "";

        if (repliesData.length === 0) {
            repliesList.innerHTML = "<p>No replies yet.</p>";
        } else {
            repliesData.forEach((reply) => {
                const replyItem = document.createElement("div");
                replyItem.className = "reply-item";
                replyItem.innerHTML = `
          <div class="card">
          <p><strong>BBC Reference Number:</strong> ${reply.bbc_ref_number}</p>
          <p><strong>Reply:</strong> ${reply.bbc_reply}</p>
          <p><strong>Timestamp:</strong> ${new Date(
                    reply.timestamp
                ).toLocaleString()}</p></div>
        `;
                repliesList.appendChild(replyItem);
            });
        }

        repliesSection.style.display = "block";
    } catch (error) {
        // Hide replies section if fetching fails
        repliesSection.style.display = "none";
        displayError(error.message);
        console.error("Error fetching replies:", error);
    }
}

// Function to display error messages
function displayError(message) {
    const messageContainer = document.getElementById("messageContainer");
    const errorMessage = document.createElement("div");
    errorMessage.className = "error-message";
    errorMessage.textContent = `Error: ${message}`;
    messageContainer.appendChild(errorMessage);
}

// Function to display success messages
function displaySuccess(message) {
    const messageContainer = document.getElementById("messageContainer");
    const successMessage = document.createElement("div");
    successMessage.className = "success-message";
    successMessage.textContent = message;
    messageContainer.appendChild(successMessage);
}

// Function to display loading messages
function displayLoading(message) {
    const messageContainer = document.getElementById("messageContainer");
    const loadingMessage = document.createElement("div");
    loadingMessage.className = "loading-message";
    loadingMessage.textContent = message;
    messageContainer.appendChild(loadingMessage);
    return loadingMessage; // Return element to allow removal
}

// Auto-focus on interceptId field when page loads
window.onload = function () {
    document.getElementById("interceptId").focus();
    const uuid = getQueryParam("uuid");
    if (uuid) {
        document.getElementById("interceptId").value = uuid;
        document
            .getElementById("interceptId")
            .dispatchEvent(new Event("blur"));
    }
};

// Event listener for TACC Record ID field
document
    .getElementById("interceptId")
    .addEventListener("blur", function () {
        const uuid = this.value.trim();
        const interceptIdPattern =
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

        // Clear previous messages and details
        document.getElementById("messageContainer").innerHTML = "";
        document.getElementById("complaintDetails").style.display = "none";
        document.getElementById("repliesSection").style.display = "none";

        if (uuid && interceptIdPattern.test(uuid)) {
            // Show loading message
            const loadingMessage = displayLoading(
                "Fetching complaint details..."
            );

            // Fetch and display complaint details
            fetchComplaintDetails(uuid)
                .then(() => {
                    // Remove loading message
                    loadingMessage.remove();
                })
                .catch(() => {
                    // Remove loading message on error
                    loadingMessage.remove();
                });
        }
    });

document
    .getElementById("replyForm")
    .addEventListener("submit", async (e) => {
        e.preventDefault();

        // Clear any previous messages
        const messageContainer = document.getElementById("messageContainer");
        messageContainer.innerHTML = "";

        const form = e.target;
        const validation = validateForm(form);

        if (!validation.isValid) {
            // Display validation errors
            (validation.errors || []).forEach((error) => {
                const errorMessage = document.createElement("div");
                errorMessage.className = "error-message";
                errorMessage.textContent = error;
                messageContainer.appendChild(errorMessage);
            });
            return; // Stop submission
        }

        const formData = {
            bbc_ref_number: form.bbcRef.value.trim(),
            intercept_id: form.interceptId.value.trim(), // Use entered UUID
            bbc_reply: form.bbcReply.value.trim(),
        };

        // Show loading message
        const loadingMessage = displayLoading(
            "Submitting your reply... Please wait."
        );

        try {
            const response = await fetch("/api/replies", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            // Remove loading message
            loadingMessage.remove();

            if (response.ok) {
                // Show custom modal
                const customModal = document.getElementById("customModal");
                customModal.style.display = "flex";

                // Handle Yes button
                document.getElementById("modalYes").onclick = () => {
                    // Keep TACC Record ID, BBC Reference Number, and GDPR checkbox values
                    const interceptId = replyForm.interceptId.value.trim();
                    const bbcRef = replyForm.bbcRef.value.trim();
                    const gdprConsentChecked = gdprConsentCheckbox.checked;

                    // Clear unnecessary fields (e.g., BBC Reply field)
                    replyForm.bbcReply.value = "";

                    // Re-enable the submit button based on GDPR consent
                    submitReplyBtn.disabled = !gdprConsentChecked;

                    // Hide the modal
                    customModal.style.display = "none";

                    // Refresh the replies list to include the new reply
                    if (interceptId) {
                        fetchComplaintDetails(interceptId)
                            .then(() => {
                                // Optionally log success for debugging
                                console.log("Replies reloaded successfully.");
                            })
                            .catch((error) => {
                                console.error("Error reloading replies:", error);
                            });
                    }

                    // Focus back on the BBC Reply field for a new reply
                    replyForm.bbcReply.focus();
                };

                // Handle No button
                document.getElementById("modalNo").onclick = () => {
                    // Optionally, you can redirect the user or hide the form
                    const formContainer = document.querySelector(".form-container");
                    formContainer.innerHTML =
                        "<p>Thank you for your submission.</p>";
                    customModal.style.display = "none";
                };

                // Refresh the replies list to include the new reply
                fetchComplaintDetails(formData.intercept_id);
            } else {
                // Display server-side validation errors
                const errorMessage = document.createElement("div");
                errorMessage.className = "error-message";
                errorMessage.textContent = `Error: ${
                    result.error || "An error occurred while submitting your reply."
                }`;
                messageContainer.appendChild(errorMessage);
            }
        } catch (error) {
            // Remove loading message and show error
            loadingMessage.remove();

            const errorMessage = document.createElement("div");
            errorMessage.className = "error-message";
            errorMessage.textContent =
                "An unexpected error occurred. Please try again later.";
            messageContainer.appendChild(errorMessage);
            console.error("Error submitting reply:", error);
        }
    });

// Modal Functionality
const customModal = document.getElementById("customModal");
const modalYes = document.getElementById("modalYes");
const modalNo = document.getElementById("modalNo");
const formContainer = document.querySelector(".form-container");
const replyForm = document.getElementById("replyForm");

// Prevent clicking outside the modal content from closing it
customModal.addEventListener("click", function (event) {
    // If the click is on the overlay (outside the modal content), do nothing
    if (event.target === this) {
        event.stopPropagation();
    }
});

// Prevent Escape key from closing the modal
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && customModal.style.display === "flex") {
        event.preventDefault();
    }
});

// Handle GDPR Consent Checkbox
const gdprConsentCheckbox = document.getElementById(
    "gdprConsentCheckbox"
);
const submitReplyBtn = document.getElementById("submitReplyBtn");

function updateSubmitButtonState() {
    if (gdprConsentCheckbox.checked) {
        submitReplyBtn.disabled = false;
    } else {
        submitReplyBtn.disabled = true;
    }
}

gdprConsentCheckbox.addEventListener("change", updateSubmitButtonState);