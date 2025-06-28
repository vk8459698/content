// Factifi Content Script - Injects the sidebar panel into web pages
console.log("Factifi content script loaded");

// Global variables
let factifiPanel = null;
let isPanelVisible = false;
let selectedFile = null; // Moved to global scope

// Initialize the sidebar
function initFactifiSidebar() {
  // Create panel if it doesn't exist yet
  if (!factifiPanel) {
    createSidebar();
  }

  // Set up message listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Received message:", request.action);

    if (request.action === "toggleSidebar") {
      toggleSidebar();
      sendResponse({ success: true });
    } else if (request.action === "displayClaims") {
      console.log("Displaying claims:", request.data);
      displayClaims(request.data);
      sendResponse({ success: true });
    } else if (request.action === "showError") {
      console.error("Error from background script:", request.message);
      showError(request.message);
      sendResponse({ success: true });
    } else if (request.action === "showLoader") {
      console.log("Showing loader");
      const loader = document.getElementById("factifi-loader");
      if (loader) {
        loader.classList.remove("factifi-hidden");
      }
      sendResponse({ success: true });
    } else if (request.action === "updateClaimVerification") {
      console.log("Updating claim verification:", request.claim);
      if (request.verification) {
        console.log("Verification data:", request.verification);
      }
      updateClaimVerification(request.claim, request.verification);
      sendResponse({ success: true });
    } else if (request.action === "updateVerificationProgress") {
      console.log(
        `Updating verification progress: ${request.current}/${request.total}`
      );
      updateVerificationProgress(request.current, request.total);
      sendResponse({ success: true });
    } else if (request.action === "verificationComplete") {
      console.log("Verification complete for all claims");
      markVerificationComplete(request.totalClaims);
      sendResponse({ success: true });
    } else if (request.action === "authStateChanged") {
      console.log("Auth state changed:", request.isLoggedIn);
      updateAuthState(request.user, request.isLoggedIn);
      sendResponse({ success: true });
    } else if (request.action === "checkSelectedText") {
      console.log("Checking selected text:", request.text);
      handleSelectedTextCheck(request.text);
      sendResponse({ success: true });
    } else if (request.action === "showVerificationLoading") {
      console.log("Showing verification loading for selected text:", request.text);
      displaySelectedTextClaim(request.text);
      sendResponse({ success: true });
    } else if (request.action === "showVerificationResult") {
      console.log("Displaying verification result for selected text:", request.claim);
      displayVerificationResult(request.claim, request.verification);
      sendResponse({ success: true });
    }

    return true; // Keep message channel open
  });

  // Check auth state on init
  checkAuthState();

  // Initialize draggable functionality
  initDraggable();

  // Image Check Section Logic
  const uploadTabBtn = document.querySelector('.factifi-tab-btn[data-tab="upload"]');
  const urlTabBtn = document.querySelector('.factifi-tab-btn[data-tab="url"]');
  const uploadTabContent = document.getElementById('upload-tab');
  const urlTabContent = document.getElementById('url-tab');
  const imageUploadInput = document.getElementById('factifi-image-upload');
  const uploadBtn = document.getElementById('factifi-upload-btn');
  const uploadPreview = document.getElementById('factifi-upload-preview');
  const previewImg = document.getElementById('factifi-preview-img');
  const removeImageBtn = document.getElementById('factifi-remove-image');
  const imageUrlInput = document.getElementById('factifi-image-url');
  const checkImageBtn = document.getElementById('factifi-check-image-btn');
  const imageLoader = document.getElementById('factifi-image-loader');
  const imageResult = document.getElementById('factifi-image-result');
  // const aiModelSelect = document.getElementById('factifi-ai-model-select'); // Removed

  // Get the main content section and the new image checker page
  const mainContentSection = document.getElementById('factifi-content-section');
  const imageCheckerPage = document.getElementById('factifi-image-checker-page');
  const showImageCheckerBtn = document.getElementById('factifi-show-image-checker-btn');
  const backToMainBtn = document.getElementById('factifi-back-to-main-btn');

  // Function to show/hide sections
  function showSection(sectionToShow) {
    if (sectionToShow === 'main') {
      mainContentSection.classList.remove('factifi-hidden');
      imageCheckerPage.classList.add('factifi-hidden');
    } else if (sectionToShow === 'imageChecker') {
      mainContentSection.classList.add('factifi-hidden');
      imageCheckerPage.classList.remove('factifi-hidden');
    }
  }

  // Event listeners for section switching buttons
  showImageCheckerBtn.addEventListener('click', () => {
    showSection('imageChecker');
  });

  backToMainBtn.addEventListener('click', () => {
    showSection('main');
    // Optionally clear image checker state when going back to main
    selectedFile = null;
    imageUploadInput.value = '';
    uploadPreview.classList.add('factifi-hidden');
    previewImg.src = '';
    imageUrlInput.value = '';
    imageResult.classList.add('factifi-hidden');
    imageLoader.classList.add('factifi-hidden');
    updateCheckButtonState();
  });

  function showTab(tabName) {
    document.querySelectorAll('.factifi-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.factifi-tab-content').forEach(content => content.classList.remove('active'));

    if (tabName === 'upload') {
      uploadTabBtn.classList.add('active');
      uploadTabContent.classList.add('active');
      imageUrlInput.value = ''; // Clear URL input when switching to upload
    } else {
      urlTabBtn.classList.add('active');
      urlTabContent.classList.add('active');
      // Clear file selection when switching to URL
      selectedFile = null;
      imageUploadInput.value = '';
      uploadPreview.classList.add('factifi-hidden');
      previewImg.src = '';
    }
    updateCheckButtonState();
  }

  function updateCheckButtonState() {
    if (selectedFile || (imageUrlInput.value.trim() !== '' && imageUrlInput.checkValidity())) {
      checkImageBtn.disabled = false;
    } else {
      checkImageBtn.disabled = true;
    }
  }

  // Event Listeners for Tabs
  uploadTabBtn.addEventListener('click', () => showTab('upload'));
  urlTabBtn.addEventListener('click', () => showTab('url'));

  // Event Listeners for Image Upload
  uploadBtn.addEventListener('click', () => imageUploadInput.click());

  imageUploadInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        uploadPreview.classList.add('factifi-hidden'); // Ensure hidden on new file selection
      };
      reader.readAsDataURL(file);
    } else {
      selectedFile = null;
      uploadPreview.classList.add('factifi-hidden');
      previewImg.src = '';
    }
    updateCheckButtonState();
  });

  removeImageBtn.addEventListener('click', () => {
    selectedFile = null;
    imageUploadInput.value = '';
    uploadPreview.classList.add('factifi-hidden');
    previewImg.src = '';
    updateCheckButtonState();
  });

  // Event Listener for Image URL
  imageUrlInput.addEventListener('input', () => {
    updateCheckButtonState();
    if (imageUrlInput.value.trim() !== '') {
      uploadPreview.classList.add('factifi-hidden'); // Hide preview immediately for URL input
      previewImg.src = ''; // Clear previous image
    }
  });

  // Event Listener for Check Image Button
  checkImageBtn.addEventListener('click', performUnifiedImageAnalysis);

  // Initial state setup
  showTab('upload');
  updateCheckButtonState();
}

// Perform unified image analysis
async function performUnifiedImageAnalysis() {
    const imageResult = document.getElementById('factifi-image-result');
    const imageLoader = document.getElementById('factifi-image-loader');
    const checkImageBtn = document.getElementById('factifi-check-image-btn');
    const imageUrlInput = document.getElementById('factifi-image-url');
    const uploadPreview = document.getElementById('factifi-upload-preview'); // Get upload preview element
    const previewImg = document.getElementById('factifi-preview-img'); // Get preview image element

    imageResult.classList.add('factifi-hidden');
    imageLoader.classList.remove('factifi-hidden');
    imageLoader.innerHTML = '<div class="factifi-spinner"></div><p>Analyzing image with AI models...</p>';
    checkImageBtn.disabled = true;

    let formData = new FormData();
    let hasInput = false;

    if (selectedFile) {
        formData.append('image_file', selectedFile);
        hasInput = true;
    } else if (imageUrlInput.value.trim() !== '') {
        formData.append('image_url', imageUrlInput.value.trim());
        hasInput = true;
    }

    if (!hasInput) {
        imageLoader.classList.add('factifi-hidden');
        imageResult.innerHTML = '<div class="factifi-error">Please provide an image or a URL.</div>';
        imageResult.classList.remove('factifi-hidden');
        checkImageBtn.disabled = false;
        // Keep image hidden if no input
        uploadPreview.classList.add('factifi-hidden'); 
        return;
    }
    
    // Set image source for URL input if not already set by file upload
    if (imageUrlInput.value.trim() !== '' && previewImg.src === '') {
        previewImg.src = imageUrlInput.value.trim();
    }

    try {
        const [sightengineResponse, geminiDescriptionResponse, geminiReverseSearchResponse] = await Promise.allSettled([
            fetch('http://localhost:5001/image-check', { method: 'POST', body: formData }),
            fetch('http://localhost:5001/image-analyze-gemini', { method: 'POST', body: formData }),
            fetch('http://localhost:5001/image-reverse-search', { method: 'POST', body: formData }),
        ]);

        let resultsHtml = '<div class="factifi-analysis-container"><h3>Image Analysis Results</h3>';

        // Sightengine Result
        if (sightengineResponse.status === 'fulfilled' && sightengineResponse.value.ok) {
            const sightengineResult = await sightengineResponse.value.json();
            const aiGeneratedConfidence = (sightengineResult && sightengineResult.type && typeof sightengineResult.type.ai_generated === 'number') ? (sightengineResult.type.ai_generated * 100).toFixed(2) : 'N/A';
            resultsHtml += `<div class="factifi-analysis-section"><h4 class="factifi-analysis-title">AI-Generated Detection</h4><p class="factifi-analysis-text">Confidence: <strong>${aiGeneratedConfidence}%</strong></p></div>`;
        } else {
            const errorText = sightengineResponse.status === 'fulfilled' ? ((await sightengineResponse.value.json()).detail || 'Error') : sightengineResponse.reason.message;
            resultsHtml += `<div class="factifi-analysis-section"><h4 class="factifi-analysis-title">AI-Generated Detection</h4><p class="factifi-error">Failed to get result: ${errorText}</p></div>`;
        }

        // Gemini Description Result
        if (geminiDescriptionResponse.status === 'fulfilled' && geminiDescriptionResponse.value.ok) {
            const geminiDescriptionResult = await geminiDescriptionResponse.value.json();
            const description = geminiDescriptionResult && geminiDescriptionResult.description ? geminiDescriptionResult.description : 'No description available.';
            const truncatedDescription = truncateText(description, GEMINI_DESCRIPTION_MAX_LENGTH); // Truncate description
            resultsHtml += `<div class="factifi-analysis-section"><h4 class="factifi-analysis-title">Gemini Image Description</h4><p class="factifi-analysis-text">${truncatedDescription}</p></div>`;
        } else {
            const errorText = geminiDescriptionResponse.status === 'fulfilled' ? ((await geminiDescriptionResponse.value.json()).detail || 'Error') : geminiDescriptionResponse.reason.message;
            resultsHtml += `<div class="factifi-analysis-section"><h4 class="factifi-analysis-title">Gemini Image Description</h4><p class="factifi-error">Failed to get description: ${errorText}</p></div>`;
        }

        // Reverse Search Result
        if (geminiReverseSearchResponse.status === 'fulfilled' && geminiReverseSearchResponse.value.ok) {
            const geminiReverseSearchResult = await geminiReverseSearchResponse.value.json();
            if (geminiReverseSearchResult && geminiReverseSearchResult.image_results && geminiReverseSearchResult.image_results.length > 0) {
                let searchResultsHtml = `<div class="factifi-analysis-section"><h4 class="factifi-analysis-title">Reverse Search Results (Query: ${geminiReverseSearchResult.query_displayed || 'N/A'})</h4><ul class="factifi-search-results-list">`;
                geminiReverseSearchResult.image_results.forEach(item => {
                    searchResultsHtml += `<li class="factifi-search-result-item"><a href="${item.link}" target="_blank" class="factifi-search-result-link">${item.title}</a><p class="factifi-search-result-snippet">${item.snippet} (<span class="factifi-search-result-source">${item.source}</span>)</p></li>`;
                });
                searchResultsHtml += `</ul></div>`;
                resultsHtml += searchResultsHtml;
            } else {
                resultsHtml += `<div class="factifi-analysis-section"><h4 class="factifi-analysis-title">Reverse Search Results</h4><p class="factifi-analysis-text">No external search results found.</p></div>`;
            }
        }
        
        resultsHtml += '</div>'; // Close factifi-analysis-container
        imageResult.innerHTML = resultsHtml;
        imageResult.classList.remove('factifi-hidden');
        uploadPreview.classList.remove('factifi-hidden'); // Show image preview ONLY when results are ready

    } catch (error) {
        console.error('Error during unified image analysis:', error);
        imageResult.innerHTML = `<div class="factifi-error">Network error during analysis: ${error.message}</div>`;
        imageResult.classList.remove('factifi-hidden');
        uploadPreview.classList.add('factifi-hidden'); // Hide image preview if error
    } finally {
        imageLoader.classList.add('factifi-hidden');
        checkImageBtn.disabled = false;
    }
}

// Create the sidebar HTML structure
function createSidebar() {
  // Removed external script loading

  // Create main container
  factifiPanel = document.createElement("div");
  factifiPanel.id = "factifi-sidebar";
  factifiPanel.className = "factifi-sidebar factifi-hidden";

  // Create sidebar content
  factifiPanel.innerHTML = `
        <div class="factifi-header">
  <img src="${chrome.runtime.getURL('icon128.png')}" alt="Factifi Logo" class="factifi-logo">

  <h1 style="display: flex; align-items: center; gap: 8px;">
    Factifi
    <a href="https://www.factifi.me" target="_blank" title="Go to Factifi Website">
      <img src="${chrome.runtime.getURL('redirect.png')}" alt="Visit Website" class="redirect-icon" style="width: 15px; height: 15px;">
    </a>
  </h1>

  <div class="top-controls">
    <a href="https://www.factifi.me/feedback"
       class="bug-report-button"
       title="Report a Bug"
       target="_blank">
      <img src="${chrome.runtime.getURL('bug.png')}" alt="Report a Bug" class="bug-icon">
    </a>

    <button id="factifi-close-btn" class="factifi-close-button" aria-label="Close"></button>
  </div>
</div>

        
        <!-- Auth Section -->
        <div id="factifi-auth-section" class="factifi-content">
            <div id="factifi-login-form">
                <h3 class="factifi-auth-title">Sign In</h3>
                <input type="email" id="factifi-login-email" placeholder="Email" class="factifi-auth-input">
                <div class="factifi-password-container">
                    <input type="password" id="factifi-login-password" placeholder="Password" class="factifi-auth-input">
                    <button class="factifi-password-toggle" data-input-id="factifi-login-password">
                        <svg class="factifi-eye-icon" viewBox="0 0 24 24" width="18" height="18">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                    </button>
                </div>
                <button id="factifi-login-button" class="factifi-auth-button">Log In</button>
                <p class="factifi-auth-toggle">Don't have an account? <a href="#" id="factifi-show-signup">Sign Up</a></p>
            </div>
            
            <div id="factifi-signup-form" class="factifi-hidden">
                <h3 class="factifi-auth-title">Create Account</h3>
                <input type="email" id="factifi-signup-email" placeholder="Email" class="factifi-auth-input">
                <div class="factifi-password-container">
                    <input type="password" id="factifi-signup-password" placeholder="Password" class="factifi-auth-input">
                    <button class="factifi-password-toggle" data-input-id="factifi-signup-password">
                        <svg class="factifi-eye-icon" viewBox="0 0 24 24" width="18" height="18">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                    </button>
                </div>
                <div class="factifi-password-container">
                    <input type="password" id="factifi-signup-confirm-password" placeholder="Confirm Password" class="factifi-auth-input">
                    <button class="factifi-password-toggle" data-input-id="factifi-signup-confirm-password">
                        <svg class="factifi-eye-icon" viewBox="0 0 24 24" width="18" height="18">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                    </button>
                </div>
                <button id="factifi-signup-button" class="factifi-auth-button">Sign Up</button>
                <p class="factifi-auth-toggle">Already have an account? <a href="#" id="factifi-show-login">Log In</a></p>
            </div>
            
            <div id="factifi-auth-loader" class="factifi-hidden factifi-auth-loader">
                <div class="factifi-spinner"></div>
                <p>Authenticating...</p>
            </div>
            
            <div id="factifi-auth-error" class="factifi-hidden"></div>
        </div>
        
        <!-- Main Content Section -->
        <div id="factifi-content-section" class="factifi-content">
            <div class="factifi-user-info">
                <span id="factifi-user-email"></span>
                <button id="factifi-logout-button" class="factifi-logout-button">Log Out</button>
            </div>
            <button id="factifi-process-btn" class="factifi-primary-button">Process Content</button>
            <div id="factifi-loader" class="factifi-loader factifi-hidden">
                <div class="factifi-spinner"></div>
                <p>Processing content... this may take a few seconds</p>
            </div>
            <div id="factifi-result"></div>
            <div id="factifi-claims-container" class="factifi-claims-container"></div>

            <button id="factifi-show-image-checker-btn" class="factifi-secondary-button" style="margin-top: 20px;">Check AI-Generated Image</button>
        </div>
        
        <!-- Image Check Section (hidden by default) -->
        <div id="factifi-image-checker-page" class="factifi-content factifi-hidden">
          <button id="factifi-back-to-main-btn" class="factifi-back-button">&larr; Back to Main</button>
          <h2>Image Analysis</h2>

          <div class="factifi-tabs">
            <button class="factifi-tab-btn active" data-tab="upload">Upload File</button>
            <button class="factifi-tab-btn" data-tab="url">Image URL</button>
          </div>
          <div id="upload-tab" class="factifi-tab-content active">
            <input type="file" id="factifi-image-upload" accept="image/*" class="factifi-hidden">
            <button id="factifi-upload-btn" class="factifi-button factifi-upload-button">Select Image File</button>
            <div id="factifi-upload-preview" class="factifi-image-preview factifi-hidden">
              <img id="factifi-preview-img" src="" alt="Image preview">
              <button id="factifi-remove-image" class="factifi-remove-image-button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          </div>
          <div id="url-tab" class="factifi-tab-content">
            <input type="text" id="factifi-image-url" placeholder="Enter image URL" class="factifi-input">
          </div>
          <button id="factifi-check-image-btn" class="factifi-button" disabled>Analyze Image</button>
          <div id="factifi-image-loader" class="factifi-loader factifi-hidden"></div>
          <div id="factifi-image-result" class="factifi-result-box factifi-hidden"></div>
        </div>

        <div class="factifi-footer">
    <p>
        <span class="factifi-footer-icon">✦</span> Powered by AI-based fact checking technology 
        <span class="factifi-dot-separator">·</span> 
<a href="https://www.factifi.me/about" target="_blank" class="factifi-link">Learn more</a>
    </p>
</div>

    `;

  // Create toggle button that will always be visible
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "factifi-toggle-btn";
  toggleBtn.className = "factifi-tooltip factifi-draggable";
  toggleBtn.setAttribute("data-tooltip", "Toggle Factifi");
  toggleBtn.setAttribute("aria-label", "Toggle Factifi");

  // Create the icon image for a square icon
  const toggleIcon = document.createElement("img");
  toggleIcon.src = chrome.runtime.getURL("icon128.png");
  toggleIcon.alt = "Factifi";

  // Add to toggle button
  toggleBtn.appendChild(toggleIcon);

  // Add styles
  // Append directly to document.body to ensure top-level stacking
  const targetElement = document.body || document.documentElement;
  targetElement.appendChild(factifiPanel);
  targetElement.appendChild(toggleBtn);

  // Add event listeners
  document
    .getElementById("factifi-close-btn")
    .addEventListener("click", toggleSidebar);
  document
    .getElementById("factifi-toggle-btn")
    .addEventListener("click", function (e) {
      // We'll handle clicks in the initDraggable function
      e.stopPropagation();
    });

  // Auth listeners
  document
    .getElementById("factifi-show-signup")
    .addEventListener("click", function (e) {
      e.preventDefault();
      document
        .getElementById("factifi-login-form")
        .classList.add("factifi-hidden");
      document
        .getElementById("factifi-signup-form")
        .classList.remove("factifi-hidden");
      document
        .getElementById("factifi-auth-error")
        .classList.add("factifi-hidden");
    });

  document
    .getElementById("factifi-show-login")
    .addEventListener("click", function (e) {
      e.preventDefault();
      document
        .getElementById("factifi-signup-form")
        .classList.add("factifi-hidden");
      document
        .getElementById("factifi-login-form")
        .classList.remove("factifi-hidden");
      document
        .getElementById("factifi-auth-error")
        .classList.add("factifi-hidden");
    });

  document
    .getElementById("factifi-login-button")
    .addEventListener("click", handleLogin);
  document
    .getElementById("factifi-signup-button")
    .addEventListener("click", handleSignup);
  document
    .getElementById("factifi-logout-button")
    .addEventListener("click", handleLogout);
  document
    .getElementById("factifi-process-btn")
    .addEventListener("click", processContent);

  // Add this after the existing login form HTML in createSidebar()
  const loginForm = document.getElementById("factifi-login-form");
  const googleSignInButton = document.createElement("div");
  googleSignInButton.className = "factifi-google-signin";
  googleSignInButton.innerHTML = `
      <button id="factifi-google-signin-btn" class="factifi-google-button">
          <img src="${chrome.runtime.getURL('google-icon.png')}" alt="Google" class="factifi-google-icon">
          Sign in with Google
      </button>
  `;
  loginForm.appendChild(googleSignInButton);

  // Add event listener for Google Sign-In
  document.getElementById("factifi-google-signin-btn").addEventListener("click", handleGoogleSignIn);

  // Add event listeners for password toggles after creating the forms
  const passwordToggles = document.querySelectorAll('.factifi-password-toggle');
  passwordToggles.forEach(toggle => {
      toggle.addEventListener('click', function(e) {
          e.preventDefault();
          const inputId = this.getAttribute('data-input-id');
          window.togglePassword(inputId);
      });
  });
}

// // Inject the CSS for our sidebar
// function injectStyles() {
//   const styleSheet = document.createElement("style");
//   styleSheet.textContent = `
        

//     `;

//   document.head.appendChild(styleSheet);
// }

// Toggle the sidebar visibility
function toggleSidebar() {
  if (!factifiPanel) return;

  factifiPanel.classList.toggle("factifi-hidden");
  isPanelVisible = !factifiPanel.classList.contains("factifi-hidden");

  // Add a pulse effect to the toggle button when closing the sidebar
  if (!isPanelVisible) {
    const toggleBtn = document.getElementById("factifi-toggle-btn");
    if (toggleBtn) {
      toggleBtn.classList.add("factifi-pulse-once");
      setTimeout(() => {
        toggleBtn.classList.remove("factifi-pulse-once");
      }, 1000);
    }
  }
}

// Add authentication handlers and state management
function handleLogin() {
    const email = document.getElementById('factifi-login-email').value;
    const password = document.getElementById('factifi-login-password').value;
    
    if (!email || !password) {
        showAuthError('Please enter both email and password');
        return;
    }
    
    showAuthLoader();
    
    // Send login request to backend
    fetch('http://localhost:5001/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: email,
            password: password
        })
    })
    .then(response => {
        console.log('Login response status:', response.status);
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.detail || 'Login failed');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Login response data:', data);
        if (!data.access_token) {
            throw new Error('Invalid response format: missing access token');
        }
        
        // Store auth data in chrome.storage.local
        chrome.storage.local.set({
            'factifi_user': data.user,
            'factifi_logged_in': true,
            'factifi_token': data.access_token
        }, () => {
            // Update UI with user data
            showLoggedInUI(data.user || { email: email });
            
            // Notify background script about auth state change
            chrome.runtime.sendMessage({
                action: 'authStateChanged',
                isLoggedIn: true,
                user: data.user
            });
        });
    })
    .catch(error => {
        console.error('Login error:', error);
        showAuthError(error.message || 'Login failed. Please try again.');
    })
    .finally(() => {
        document.getElementById('factifi-auth-loader').classList.add('factifi-hidden');
    });
}

// Handle signup
function handleSignup() {
    const email = document.getElementById('factifi-signup-email').value;
    const password = document.getElementById('factifi-signup-password').value;
    const confirmPassword = document.getElementById('factifi-signup-confirm-password').value;
    
    if (!email || !password || !confirmPassword) {
        showAuthError('Please fill in all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        showAuthError('Passwords do not match');
        return;
    }
    
    showAuthLoader();
    
    // Send signup request to backend
    fetch('http://localhost:5001/auth/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: email,
            password: password
        })
    })
    .then(response => {
        console.log('Signup response status:', response.status);
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.detail || 'Signup failed');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Signup response data:', data);
        // Show success message
        showAuthError('Account created successfully! Please log in.', 'success');
        
        // Switch to login form after a delay
        setTimeout(() => {
            document.getElementById('factifi-signup-form').classList.add('factifi-hidden');
            document.getElementById('factifi-login-form').classList.remove('factifi-hidden');
            // Pre-fill the email field
            document.getElementById('factifi-login-email').value = email;
        }, 2000);
    })
    .catch(error => {
        console.error('Signup error:', error);
        showAuthError(error.message || 'Signup failed. Please try again.');
    })
    .finally(() => {
        document.getElementById('factifi-auth-loader').classList.add('factifi-hidden');
    });
}

// Handle logout
function handleLogout() {
    // Clear auth data from chrome.storage.local
    chrome.storage.local.remove(['factifi_user', 'factifi_logged_in', 'factifi_token'], () => {
        // Notify background script about auth state change
        chrome.runtime.sendMessage({
            action: 'authStateChanged',
            isLoggedIn: false
        });
        
        // Update UI
        showLoggedOutUI();
    });
}

// Check auth state
function checkAuthState() {
    chrome.storage.local.get(['factifi_user', 'factifi_logged_in', 'factifi_token'], function(result) {
        if (!result.factifi_logged_in || !result.factifi_token) {
            showLoggedOutUI();
            return;
        }

        fetch('http://localhost:5001/auth/check', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${result.factifi_token}`
            },
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Not authenticated');
            }
            return response.json();
        })
        .then(data => {
            if (data.isLoggedIn && data.user) {
                showLoggedInUI(data.user);
            } else {
                showLoggedOutUI();
            }
        })
        .catch(error => {
            console.error('Auth check error:', error);
            // Clear auth data from chrome.storage.local
            chrome.storage.local.remove(['factifi_user', 'factifi_logged_in', 'factifi_token'], () => {
                showLoggedOutUI();
            });
        });
    });
}

function updateAuthState(user, isLoggedIn) {
  if (isLoggedIn && user) {
    showLoggedInUI(user);
  } else {
    showLoggedOutUI();
  }
}

function showAuthLoader() {
  document
    .getElementById("factifi-auth-loader")
    .classList.remove("factifi-hidden");
  document.getElementById("factifi-login-form").classList.add("factifi-hidden");
  document.getElementById("factifi-signup-form").classList.add("factifi-hidden");
  document.getElementById("factifi-auth-error").classList.add("factifi-hidden");
}

function showLoggedInUI(user) {
  document
    .getElementById("factifi-auth-section")
    .classList.add("factifi-hidden");
  document
    .getElementById("factifi-content-section")
    .classList.remove("factifi-hidden");
  document
    .getElementById("factifi-auth-loader")
    .classList.add("factifi-hidden");
  document.getElementById("factifi-user-email").textContent = user.email;
}

function showLoggedOutUI() {
  document
    .getElementById("factifi-content-section")
    .classList.add("factifi-hidden");
  document
    .getElementById("factifi-auth-section")
    .classList.remove("factifi-hidden");
  document
    .getElementById("factifi-login-form")
    .classList.remove("factifi-hidden");
  document
    .getElementById("factifi-signup-form")
    .classList.add("factifi-hidden");
  document
    .getElementById("factifi-auth-loader")
    .classList.add("factifi-hidden");
  document.getElementById("factifi-auth-error").classList.add("factifi-hidden");
}

function showAuthError(message, type = "error") {
  document
    .getElementById("factifi-auth-loader")
    .classList.add("factifi-hidden");
  const authError = document.getElementById("factifi-auth-error");
  authError.classList.remove("factifi-hidden");
  authError.innerHTML = `<div class="factifi-${type}">${message}</div>`;

  if (
    document
      .getElementById("factifi-login-form")
      .classList.contains("factifi-hidden") &&
    document
      .getElementById("factifi-signup-form")
      .classList.contains("factifi-hidden")
  ) {
    document
      .getElementById("factifi-login-form")
      .classList.remove("factifi-hidden");
  }
}

// Process the current page content
function processContent() {
  // Check if user is logged in first
  chrome.storage.local.get(
    ["factifi_user", "factifi_logged_in"],
    function (data) {
      if (!data.factifi_user || !data.factifi_logged_in) {
        // Not logged in - show auth UI
        showLoggedOutUI();
        return;
      }

      const processButton = document.getElementById("factifi-process-btn");
      const loader = document.getElementById("factifi-loader");
      const resultDiv = document.getElementById("factifi-result");

      // Show loader
      processButton.disabled = true;
      loader.classList.remove("factifi-hidden");
      resultDiv.innerHTML = "";

      // Send message to background script to process content
      chrome.runtime.sendMessage({
        action: "processContent",
        url: window.location.href,
        user: data.factifi_user.id, // Send user ID for tracking/analytics
      });
    }
  );
}

// Show error message
function showError(message) {
  const loader = document.getElementById("factifi-loader");
  const result = document.getElementById("factifi-result");
  const processButton = document.getElementById("factifi-process-btn");

  loader.classList.add("factifi-hidden");
  result.innerHTML = `<div class="factifi-error">${message}</div>`;
  processButton.disabled = false;
}

// Display claims in the sidebar
function displayClaims(data) {
  const loader = document.getElementById("factifi-loader");
  const result = document.getElementById("factifi-result");
  const claimsContainer = document.getElementById("factifi-claims-container");
  const processButton = document.getElementById("factifi-process-btn");

  // Hide loader
  loader.classList.add("factifi-hidden");
  processButton.disabled = false;

  // Clear existing content
  result.innerHTML = "";
  claimsContainer.innerHTML = "";

  // Display the claims if they exist
  if (data.claims && data.claims.length > 0) {
    // Create header section with inline share buttons
    const headerSection = document.createElement("div");
    headerSection.className = "factifi-claims-header";

    const heading = document.createElement("h3");
    heading.textContent = "Key Claims";
    headerSection.appendChild(heading);

    // Create compact share buttons that will be visible but initially disabled
    // Create compact share buttons that will be visible but initially disabled
const shareButtons = document.createElement("div");
shareButtons.className = "factifi-inline-share-buttons";
shareButtons.innerHTML = `
        <button class="factifi-inline-share-button factifi-twitter-button" id="factifi-share-all-twitter" disabled title="Share on X">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </button>
        <button class="factifi-inline-share-button factifi-linkedin-button" id="factifi-share-all-linkedin" disabled title="Share on LinkedIn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.454C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>
        </button>
        <button class="factifi-inline-share-button factifi-copy-all-button" id="factifi-copy-all" disabled title="Copy All Fact Checks">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
        </button>
    `;

    headerSection.appendChild(shareButtons);
    claimsContainer.appendChild(headerSection);

    // Add a progress container
    const progressContainer = document.createElement("div");
    progressContainer.id = "factifi-progress-container";
    progressContainer.className = "factifi-progress-container";
    progressContainer.innerHTML =
      '<div class="factifi-progress-bar-container"><div class="factifi-progress-bar" style="width: 0%"></div></div><div class="factifi-progress-text">Starting verification...</div>';
    claimsContainer.appendChild(progressContainer);

    // Add each claim
    data.claims.forEach((claim, index) => {
      const claimContainer = document.createElement("div");
      claimContainer.className = "factifi-claim-container";
      claimContainer.dataset.claim = claim; // Store claim text as data attribute

      const claimText = document.createElement("div");
      claimText.className = "factifi-claim-text";
      claimText.textContent = claim;
      claimContainer.appendChild(claimText);

      // Add a placeholder for verification results
      const verificationResult = document.createElement("div");
      verificationResult.className =
        "factifi-verification-result factifi-hidden";
      verificationResult.innerHTML =
        '<div class="factifi-spinner"></div><div class="factifi-progress-text">Waiting for verification...</div>';
      claimContainer.appendChild(verificationResult);

      claimsContainer.appendChild(claimContainer);
    });

    // Automatically start verification
    console.log(
      "Automatically starting verification for",
      data.claims.length,
      "claims"
    );

    // Small delay to ensure UI is rendered before starting verification
    setTimeout(() => {
      verifyAllClaims(data.claims, window.location.href);
    }, 300);
  } else {
    result.innerHTML =
      '<div class="factifi-message">No claims were extracted from this content.</div>';
  }
}

// Function to verify all claims
function verifyAllClaims(claims, sourceUrl) {
  // Get progress container
  const progressContainer = document.getElementById(
    "factifi-progress-container"
  );

  // Initialize progress
  progressContainer.innerHTML = `
        <div class="factifi-progress-bar-container">
            <div class="factifi-progress-bar" style="width: 0%"></div>
        </div>
        <div class="factifi-progress-text">Initializing verification...</div>
    `;

  // Send message to background script to verify all claims
  chrome.runtime.sendMessage({
    action: "verifyAllClaims",
    claims: claims,
    sourceUrl: sourceUrl,
  });
}

// Function to display verification result
function displayVerificationResult(claimText, verification) {
  console.log("Displaying verification result:", verification);

  // Find the container for this claim
  const claimContainers = document.querySelectorAll(".factifi-claim-container");
  let targetContainer = null;

  for (const container of claimContainers) {
    if (container.dataset.claim === claimText) {
      targetContainer = container;
      break;
    }
  }

  if (!targetContainer) {
    console.error("Could not find container for claim:", claimText);
    return;
  }

  // Get verification result container
  const verificationResult = targetContainer.querySelector(
    ".factifi-verification-result"
  );

  // Clear existing content
  verificationResult.innerHTML = "";
  verificationResult.classList.remove("factifi-hidden");

  // Create verification details container
  const details = document.createElement("div");
  details.className = "factifi-verification-details";

  // Add verdict with appropriate styling
  const verdict = document.createElement("span");
  verdict.className = "factifi-verdict factifi-tooltip";

  // Ensure verdict is a string and convert to uppercase for consistency
  const verdictValue = (verification.verdict || "CAN'T SAY")
    .toString()
    .toUpperCase();

  // Style based on verdict
  let verdictClass = "factifi-verdict-cant-say"; // Default
  let verdictText = "CAN'T SAY";
  let verdictTooltip = "Not enough information to verify";

  if (verdictValue === "TRUE") {
    verdictClass = "factifi-verdict-true";
    verdictText = "TRUE";
    verdictTooltip = "Claim is verified as true";
  } else if (verdictValue === "FALSE") {
    verdictClass = "factifi-verdict-false";
    verdictText = "FALSE";
    verdictTooltip = "Claim is verified as false";
  }

  verdict.classList.add(verdictClass);
  verdict.textContent = verdictText;
  verdict.setAttribute("data-tooltip", verdictTooltip);
  details.appendChild(verdict);

  // Add confidence (ensure it's a number) with click interaction
  const confidenceValue =
    verification.confidence !== undefined ? verification.confidence : 0;
  const confidence = document.createElement("span");
  confidence.className = "factifi-confidence factifi-tooltip";
  confidence.textContent = `${confidenceValue}%`;
  confidence.setAttribute("data-tooltip", "Click to view evidence");

  // Add caret indicator to show this is expandable
  confidence.innerHTML = `${confidenceValue}% <span class="factifi-caret-icon">▾</span>`;

  details.appendChild(confidence);

  // Add compact share buttons directly in the verification details
  // Add compact share buttons directly in the verification details
const shareButtons = document.createElement("div");
shareButtons.className = "factifi-inline-share-buttons factifi-inline-result-share factifi-hidden";
shareButtons.innerHTML = `
        <button class="factifi-inline-share-button factifi-twitter-button" title="Share on X">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </button>
        <button class="factifi-inline-share-button factifi-linkedin-button" title="Share on LinkedIn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.454C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>
        </button>
        <button class="factifi-inline-share-button factifi-copy-button" title="Copy Fact Check">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
        </button>
    `;
  details.appendChild(shareButtons);

  // Create content wrapper for the collapsible evidence details
  const evidenceWrapper = document.createElement("div");
  evidenceWrapper.className = "factifi-evidence-wrapper factifi-hidden";

  // Add explanation
  const explanation = document.createElement("div");
  explanation.className = "factifi-explanation factifi-claim-analysis"; // Added factifi-claim-analysis for targeting
  explanation.textContent =
    verification.explanation || "No explanation provided.";
  evidenceWrapper.appendChild(explanation);

  // If there are evidence sources, show them
  if (
    verification.evidence_sources &&
    verification.evidence_sources.length > 0
  ) {
    const sourcesSection = document.createElement("div");
    sourcesSection.className = "factifi-sources-section";

    const sourcesTitle = document.createElement("div");
    sourcesTitle.className = "factifi-sources-title";
    sourcesTitle.textContent = "Evidence sources:";
    sourcesSection.appendChild(sourcesTitle);

    const sourcesList = document.createElement("ul");
    sourcesList.className = "factifi-sources-list";

    verification.evidence_sources.forEach((source) => {
      const sourceItem = document.createElement("li");
      sourceItem.textContent = source || "";
      sourcesList.appendChild(sourceItem);
    });

    sourcesSection.appendChild(sourcesList);
    evidenceWrapper.appendChild(sourcesSection);
  }

  // If there are citations, display them
  if (verification.citations && verification.citations.length > 0) {
    const citationsSection = document.createElement("div");
    citationsSection.className = "factifi-citations-section";

    const citationsTitle = document.createElement("div");
    citationsTitle.className = "factifi-citations-title";
    citationsTitle.textContent = "Citations:";
    citationsSection.appendChild(citationsTitle);

    const citationsList = document.createElement("ul");
    citationsList.className = "factifi-citations-list";

    verification.citations.forEach((citation, index) => {
      const citationItem = document.createElement("li");
      citationItem.className = "factifi-citation-item";

      // Add citation index as data attribute (without displaying it)
      citationItem.setAttribute("data-citation-number", index + 1);

      // Handle citation objects or strings with improved formatting
      if (typeof citation === "object" && citation !== null) {
        // Extract source name if available (before colon in text)
        let sourceText = "";
        let citationText = citation.text || "";

        // Try to extract source from citation text (e.g., "Business Insider: Report shows...")
        const sourceParts = citationText.split(":");
        if (sourceParts.length > 1) {
          sourceText = sourceParts[0].trim();
          citationText = sourceParts.slice(1).join(":").trim();
        }

        // Format as "Source: Citation text" with arrow link - removed the numbered index
        let formattedCitation = "";

        if (sourceText) {
          formattedCitation += `<span class="factifi-citation-source">${sourceText}:</span> `;
        }

        // Create a wrapper that contains the citation text and arrow
        formattedCitation += `<span class="factifi-citation-content">`;
        formattedCitation += `<span class="factifi-citation-text">${citationText}</span>`;

        // Add arrow as hyperlink if URL is available
        if (citation.url) {
          const imgURL = chrome.runtime.getURL("link.png");
          formattedCitation += `
     <a href="${citation.url}" target="_blank" class="factifi-citation-arrow" aria-label="View source">
       <img src="${imgURL}" alt="View source" width="10" height="10" style="vertical-align: middle;" />
     </a>
    `;
        }

        formattedCitation += `</span>`;

        citationItem.innerHTML = formattedCitation;
      } else if (citation) {
        // Removed the numbered index
        citationItem.innerHTML = `<span class="factifi-citation-text">${citation.toString()}</span>`;
      } else {
        citationItem.innerHTML = `<span class="factifi-citation-text">Citation information not available</span>`;
      }

      citationsList.appendChild(citationItem);
    });

    citationsSection.appendChild(citationsList);
    evidenceWrapper.appendChild(citationsSection);

    // Apply in-text citations to the explanation text
    // Add this function within the scope
    function addInTextCitations(analysisText, citations) {
      if (!citations || citations.length === 0) return analysisText;

      let updatedText = analysisText;

      // Add citation references as superscript numbers
      citations.forEach((citation, index) => {
        // Create a citation marker with the index + 1
        const citationMarker = `<sup class="factifi-in-text-citation">[${
          index + 1
        }]</sup>`;

        // Get the citation text to search for
        const citationText =
          typeof citation === "object"
            ? citation.text || ""
            : citation
            ? citation.toString()
            : "";

        // Find relevant sentences that might need this citation
        if (citationText) {
          // Extract keywords from citation (words with 5+ characters)
          const keywords = citationText.match(/\b\w{5,}\b/g) || [];

          // Try to find sentences containing these keywords
          keywords.forEach((keyword) => {
            // Find sentences containing the keyword that don't already have this citation
            const regex = new RegExp(
              `([^.!?]*\\b${keyword}\\b[^.!?]*[.!?])(?![^<]*\\[${
                index + 1
              }\\])`,
              "gi"
            );
            // Add the citation marker at the end of the matching sentence
            updatedText = updatedText.replace(regex, `$1${citationMarker}`);
          });
        }
      });

      return updatedText;
    }

    // Apply in-text citations to the explanation text
    explanation.textContent = explanation.textContent;

  }

  // Set up share buttons event listeners
  const twitterButton = shareButtons.querySelector(".factifi-twitter-button");
  const linkedinButton = shareButtons.querySelector(".factifi-linkedin-button");
// Set up copy button event listener
const copyButton = shareButtons.querySelector(".factifi-copy-button");
copyButton.addEventListener("click", function() {
    // Format the text for copying
    const formattedText = formatClaimForCopy(claimText, verdictText, confidenceValue, verification);
    
    // Copy to clipboard
    copyToClipboard(formattedText);
    
    // Show feedback
    showCopyFeedback(copyButton);
});
  twitterButton.addEventListener("click", function () {
    const pageTitle = document.title;
    let shareText = `Fact check by Factifi: "${claimText}" is ${verdictText} (${confidenceValue}% confidence).

`;

    if (verification.explanation) {
        shareText += `Analysis: ${truncateText(verification.explanation, 150)}
`;
    }
    if (verification.evidence_sources && verification.evidence_sources.length > 0) {
        shareText += `Evidence: ${truncateText(verification.evidence_sources.join(', '), 100)}
`;
    }

    shareText += `
Learn more: ${window.location.href}
#FactCheck #Factifi #AI`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText
    )}`;
    window.open(twitterUrl, "_blank", "width=550,height=420");
  });

  // Add LinkedIn API configuration
  const LINKEDIN_CONFIG = {
    clientId: "86xv0hybuzqk82",
    scope: "w_member_social",
  };

  // Update the LinkedIn share function for individual claims
  linkedinButton.addEventListener("click", function () {
    const pageTitle = document.title;
    const shareUrl = window.location.href;
    
    // Enhanced share text with better formatting and full information
    let shareText = `🔍 **Fact Check by Factifi** 🔍\n\n`;
    shareText += `**Claim:** "${claimText}"\n`;
    shareText += `**Verdict:** ${verdictText.toUpperCase()} (${confidenceValue}% confidence)\n\n`;
    
    // Add full analysis with better formatting
    if (verification.explanation) {
        shareText += `📊 **Analysis:**\n${verification.explanation}\n\n`;
    }
    
    // Add comprehensive evidence sources with links
    if (verification.evidence_sources && verification.evidence_sources.length > 0) {
        shareText += `📚 **Evidence Sources:**\n`;
        verification.evidence_sources.forEach((source, index) => {
            shareText += `${index + 1}. ${source}\n`;
        });
        shareText += `\n`;
    }
    
    // Add methodology or additional context if available
    if (verification.methodology) {
        shareText += `🔬 **Methodology:** ${verification.methodology}\n\n`;
    }
    
    // Add tags and call to action
    shareText += `🌐 **Discover more fact checks:** ${shareUrl}\n\n`;
    shareText += `#FactCheck #Factifi #AI #TruthMatters #FactChecking #Verification #MediaLiteracy`;
    
    // LinkedIn native share URL with enhanced content
    const linkedinUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(shareText)}`;
    window.open(linkedinUrl, "_blank", "width=550,height=420");
});


  // Add evidence wrapper to the details container
  details.appendChild(evidenceWrapper);

  // Add click event to confidence to toggle evidence visibility
  confidence.addEventListener("click", () => {
    const isHidden = evidenceWrapper.classList.contains("factifi-hidden");

    // Toggle visibility of evidence wrapper
    evidenceWrapper.classList.toggle("factifi-hidden");

    // Toggle visibility of share buttons
    shareButtons.classList.toggle("factifi-hidden");

    // Update caret icon direction
    const caret = confidence.querySelector(".factifi-caret-icon");
    if (caret) {
      caret.textContent = isHidden ? "▴" : "▾";
    }

    // Animate the height transition
    if (isHidden) {
      evidenceWrapper.style.maxHeight = `${evidenceWrapper.scrollHeight}px`;
      setTimeout(() => {
        evidenceWrapper.style.maxHeight = "1000px"; // Large value to accommodate all content
      }, 50);
    } else {
      evidenceWrapper.style.maxHeight = "0px";
    }
  });

  // Add details to verification result container
  verificationResult.appendChild(details);
}

// Handle claim verification update from background script
function updateClaimVerification(claim, verification) {
  // Find the container for this claim
  const claimContainers = document.querySelectorAll(".factifi-claim-container");
  let targetContainer = null;

  for (const container of claimContainers) {
    if (container.dataset.claim === claim) {
      targetContainer = container;
      break;
    }
  }

  if (!targetContainer) {
    console.error("Could not find container for claim:", claim);
    return;
  }

  // Highlight the claim being verified
  targetContainer.classList.add("factifi-verifying");

  // Scroll to the claim if needed
  targetContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });

  // Get verification result container
  const verificationResult = targetContainer.querySelector(
    ".factifi-verification-result"
  );
  verificationResult.classList.remove("factifi-hidden");

  // Update to show it's being verified
  verificationResult.innerHTML =
    '<div class="factifi-spinner"></div><div class="factifi-progress-text">Verifying claim...</div>';

  // If verification is provided, display it
  if (verification) {
    displayVerificationResult(claim, verification);

    // Apply a subtle pulse animation to the confidence percentage to attract attention
    setTimeout(() => {
      const confidence = targetContainer.querySelector(".factifi-confidence");
      if (confidence) {
        confidence.classList.add("factifi-pulse-attention");
        setTimeout(() => {
          confidence.classList.remove("factifi-pulse-attention");
        }, 1500);
      }
    }, 300);

    // Remove highlight with a slight delay
    setTimeout(() => {
      targetContainer.classList.remove("factifi-verifying");
    }, 300);
  }
}

// Update verification progress
function updateVerificationProgress(current, total) {
  const progressContainer = document.getElementById(
    "factifi-progress-container"
  );

  if (progressContainer) {
    const progressPercent = Math.round((current / total) * 100);
    progressContainer.innerHTML = `
            <div class="factifi-progress-bar-container">
                <div class="factifi-progress-bar" style="width: ${progressPercent}%"></div>
            </div>
            <div class="factifi-progress-text">Verifying claim ${current} of ${total}...</div>
        `;
  }
}

// Mark verification as complete
function markVerificationComplete(totalClaims) {
  const progressContainer = document.getElementById(
    "factifi-progress-container"
  );

  if (progressContainer) {
    progressContainer.innerHTML = `<div class="factifi-success"> All ${totalClaims} claims verified!</div>`;

    // Enable share buttons
const twitterButton = document.getElementById("factifi-share-all-twitter");
const linkedinButton = document.getElementById("factifi-share-all-linkedin");
const copyAllButton = document.getElementById("factifi-copy-all");

// Get all claims with their verification results
const claims = getAllVerifiedClaims();

if (twitterButton) {
    twitterButton.disabled = false;
    twitterButton.addEventListener("click", function() {
        shareAllClaimsTwitter(claims);
    });
}

if (linkedinButton) {
    linkedinButton.disabled = false;
    linkedinButton.addEventListener("click", function() {
        shareAllClaimsLinkedIn(claims);
    });
}

if (copyAllButton) {
    copyAllButton.disabled = false;
    copyAllButton.addEventListener("click", function() {
        copyAllClaims(claims);
    });
}

    // Add pulse to the share buttons to draw attention
    const shareButtons = document.querySelectorAll(
      ".factifi-inline-share-button"
    );
    shareButtons.forEach((button) => {
      button.classList.add("factifi-pulse-attention");
      setTimeout(() => {
        button.classList.remove("factifi-pulse-attention");
      }, 1500);
    });

    // Add pulse to attract attention if sidebar is closed
    if (!isPanelVisible) {
      const toggleBtn = document.getElementById("factifi-toggle-btn");
      if (toggleBtn) {
        toggleBtn.classList.add("factifi-pulse-once");
        setTimeout(() => {
          toggleBtn.classList.remove("factifi-pulse-once");
        }, 1000);
      }
    }
  }
}

// Helper function to get all verified claims with full verification details
function getAllVerifiedClaims() {
  const claimContainers = document.querySelectorAll(".factifi-claim-container");
  const claims = [];

  claimContainers.forEach((container) => {
    const claimText = container.dataset.claim;
    const verdict = container.querySelector(".factifi-verdict");

    if (claimText && verdict) {
      const verdictText = verdict.textContent;
      const confidenceElement = container.querySelector(".factifi-confidence");
      const confidenceText = confidenceElement
        ? confidenceElement.textContent.replace(/[^0-9]/g, "")
        : "";

      // Extract analysis/explanation
      const explanationElement = container.querySelector(".factifi-explanation");
      const explanation = explanationElement ? explanationElement.textContent : "";

      // Extract evidence sources
      const evidenceSources = [];
      const sourceItems = container.querySelectorAll(".factifi-sources-list li");
      sourceItems.forEach(item => {
        if (item.textContent.trim()) {
          evidenceSources.push(item.textContent.trim());
        }
      });

      // Extract citations
      const citations = [];
      const citationItems = container.querySelectorAll(".factifi-citations-list li");
      citationItems.forEach(item => {
        // Extract just the text content, excluding the link icons
        const citationText = item.querySelector(".factifi-citation-text");
        if (citationText && citationText.textContent.trim()) {
          citations.push(citationText.textContent.trim());
        } else if (item.textContent.trim()) {
          // Fallback to full text content if specific element not found
          citations.push(item.textContent.trim());
        }
      });

      claims.push({
        text: claimText,
        verdict: verdictText,
        confidence: confidenceText,
        explanation: explanation,
        evidence_sources: evidenceSources,
        citations: citations
      });
    }
  });

  return claims;
}

// Share all claims to Twitter
function shareAllClaimsTwitter(claims) {
  if (!claims || claims.length === 0) return;

  const pageTitle = document.title;
  const shareUrl = window.location.href;

  let shareText = `Factifi verified ${claims.length} claims on "${pageTitle}". Key findings:\n\n`;

  // Add up to 3 claims with verdict and confidence
  const maxClaims = Math.min(3, claims.length);
  for (let i = 0; i < maxClaims; i++) {
    shareText += `• "${truncateText(claims[i].text, 80)}" - ${
      claims[i].verdict
    } (${claims[i].confidence}%)\n`;
  }

  if (claims.length > 3) {
    shareText += `• Plus ${claims.length - 3} more claims...\n`;
  }

  shareText += `\nGet the full details on Factifi: ${shareUrl} \n#FactCheck #Factifi #AI`;

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareText
  )}`;
  window.open(twitterUrl, "_blank", "width=550,height=420");
}

// Update the shareAllClaimsLinkedIn function
function shareAllClaimsLinkedIn(claims) {
  if (!claims || claims.length === 0) return;
  
  const pageTitle = document.title;
  const shareUrl = window.location.href;
  
  // Start with eye-catching header
  let shareText = `🔍 **COMPREHENSIVE FACT CHECK REPORT** 🔍\n\n`;
  shareText += `📄 **Source:** "${pageTitle}"\n`;
  shareText += `📊 **Claims Verified:** ${claims.length}\n\n`;
  
  // Add summary statistics
  const trueClaims = claims.filter(c => c.verdict?.toLowerCase().includes('true')).length;
  const falseClaims = claims.filter(c => c.verdict?.toLowerCase().includes('false')).length;
  const partialClaims = claims.filter(c => c.verdict?.toLowerCase().includes('partial')).length;
  
  shareText += `📈 **SUMMARY:**\n`;
  shareText += `✅ True: ${trueClaims} claims\n`;
  shareText += `❌ False: ${falseClaims} claims\n`;
  shareText += `⚠️ Partially True: ${partialClaims} claims\n\n`;
  
  // Add detailed breakdown of key claims
  shareText += `🔍 **KEY FINDINGS:**\n\n`;
  
  const maxClaims = Math.min(5, claims.length);
  for (let i = 0; i < maxClaims; i++) {
      const claim = claims[i];
      const emoji = getVerdictEmoji(claim.verdict);
      
      shareText += `${i + 1}. ${emoji} **CLAIM:** "${truncateText(claim.text, 120)}"\n`;
      shareText += `   **VERDICT:** ${claim.verdict?.toUpperCase()} (${claim.confidence}% confidence)\n`;
      
      // Add explanation if available
      if (claim.explanation) {
          shareText += `   **ANALYSIS:** ${truncateText(claim.explanation, 150)}\n`;
      }
      
      // Add sources if available
      if (claim.evidence_sources && claim.evidence_sources.length > 0) {
          shareText += `   **SOURCES:** ${claim.evidence_sources.slice(0, 2).join(', ')}\n`;
      }
      
      shareText += `\n`;
  }
  
  // Add remaining claims count
  if (claims.length > 5) {
      shareText += `📋 **Plus ${claims.length - 5} additional claims verified...**\n\n`;
  }
  
  // Add methodology note
  shareText += `🔬 **Methodology:** AI-powered fact-checking with multiple source verification\n\n`;
  
  // Add call to action and links
  shareText += `🌐 **Full Report & Sources:** ${shareUrl}\n\n`;
  shareText += `#FactCheck #Factifi #AI #TruthMatters #FactChecking #Verification #MediaLiteracy #NewsVerification #DigitalLiteracy`;
  
  const linkedinUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(shareText)}`;
  window.open(linkedinUrl, "_blank", "width=550,height=420");
}

// Helper function to get appropriate emoji for verdict
function getVerdictEmoji(verdict) {
  if (!verdict) return "🔍";
  
  const v = verdict.toLowerCase();
  if (v.includes('true') && !v.includes('false')) return "✅";
  if (v.includes('false')) return "❌";
  if (v.includes('partial') || v.includes('mixed')) return "⚠️";
  if (v.includes('unclear') || v.includes('unverified')) return "❓";
  return "🔍";
}

// Enhanced truncate function that preserves word boundaries
function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

// After creating the sidebar, add the draggable functionality
function initDraggable() {
  const toggleBtn = document.getElementById("factifi-toggle-btn");
  if (!toggleBtn) return;

  let isDragging = false;
  let startY, startTop;

  // Load the saved position (only vertical)
  chrome.storage.local.get(["factifi_button_position"], function (result) {
    if (result.factifi_button_position && result.factifi_button_position.top) {
      toggleBtn.style.bottom = "auto";
      toggleBtn.style.top = result.factifi_button_position.top + "px";
      // Always keep right at 0 (pinned to edge)
      toggleBtn.style.right = "0";
    }
  });

  // Mouse events for desktop
  toggleBtn.addEventListener("mousedown", function (e) {
    // Only start dragging if it's not a click on the button itself
    if (e.target === toggleBtn || e.target === toggleBtn.querySelector("img")) {
      e.preventDefault();
      startDrag(e.clientY);

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }
  });

  // Touch events for mobile
  toggleBtn.addEventListener("touchstart", function (e) {
    if (e.target === toggleBtn || e.target === toggleBtn.querySelector("img")) {
      e.preventDefault();
      const touch = e.touches[0];
      startDrag(touch.clientY);

      document.addEventListener("touchmove", onTouchMove);
      document.addEventListener("touchend", onTouchEnd);
    }
  });

  function startDrag(clientY) {
    isDragging = true;

    // Get current position
    const rect = toggleBtn.getBoundingClientRect();
    startY = clientY;
    startTop = rect.top;

    // Change to absolute positioning if it's not already
    toggleBtn.style.bottom = "auto";
    toggleBtn.style.top = startTop + "px";
    // Always keep right at 0 (pinned to edge)
    toggleBtn.style.right = "0";

    // Add dragging class
    toggleBtn.classList.add("factifi-dragging");
  }

  function onMouseMove(e) {
    if (!isDragging) return;

    const deltaY = e.clientY - startY;

    // Update position (vertical only)
    toggleBtn.style.top = startTop + deltaY + "px";
  }

  function onTouchMove(e) {
    if (!isDragging) return;
    e.preventDefault();

    const touch = e.touches[0];
    const deltaY = touch.clientY - startY;

    // Update position (vertical only)
    toggleBtn.style.top = startTop + deltaY + "px";
  }

  function onMouseUp() {
    if (!isDragging) return;
    finishDrag();

    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }

  function onTouchEnd() {
    if (!isDragging) return;
    finishDrag();

    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", onTouchEnd);
  }

  function finishDrag() {
    isDragging = false;
    toggleBtn.classList.remove("factifi-dragging");

    // Save the final position
    const rect = toggleBtn.getBoundingClientRect();

    // Keep button in viewport boundaries (vertical only)
    let finalTop = rect.top;

    // Check if it's outside the viewport
    if (finalTop < 10) finalTop = 10;
    if (finalTop > window.innerHeight - rect.height - 10) {
      finalTop = window.innerHeight - rect.height - 10;
    }

    // Apply final position
    toggleBtn.style.top = finalTop + "px";

    // Store the position (vertical only)
    chrome.storage.local.set({
      factifi_button_position: {
        top: finalTop,
      },
    });
  }

  // Handle click separately to avoid confusion with drag
  toggleBtn.addEventListener("click", function (e) {
    // Only toggle if we didn't drag
    if (!isDragging) {
      toggleSidebar();
    }
  });
}

// Initialize when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFactifiSidebar);
} else {
  initFactifiSidebar();
}

// Helper to truncate text for display in limited spaces

// Format a single claim for copying
function formatClaimForCopy(claimText, verdict, confidence, verification) {
    let formattedText = `${'='.repeat(50)}\n`;
    formattedText += `FACTIFI FACT CHECK\n`;
    formattedText += `${'='.repeat(50)}\n\n`;
    
    formattedText += `Claim: "${claimText}"\n\n`;
    formattedText += `Verdict: ${verdict}\n`;
    formattedText += `Confidence: ${confidence}%\n\n`;
    
    if (verification && verification.explanation) {
        formattedText += `Analysis:\n${verification.explanation}\n\n`;
    }
    
    if (verification && verification.evidence_sources && verification.evidence_sources.length > 0) {
        formattedText += `Evidence Sources:\n`;
        verification.evidence_sources.forEach((source, index) => {
            formattedText += `${index + 1}. ${source}\n`;
        });
        formattedText += `\n`;
    }
    
    if (verification && verification.citations && verification.citations.length > 0) {
        formattedText += `Citations:\n`;
        verification.citations.forEach((citation, index) => {
            const citationText = typeof citation === 'object' ? citation.text || "" : citation || "";
            formattedText += `${index + 1}. ${citationText}\n`;
        });
        formattedText += `\n`;
    }
    
    formattedText += `${'='.repeat(50)}\n`;
    formattedText += `Verified by Factifi - ${new Date().toLocaleDateString()}\n`;
    formattedText += `Source: ${window.location.href}`;
    
    return formattedText;
}

// Updated copy all claims function with full details
function copyAllClaims(claims) {
    if (!claims || claims.length === 0) return;
    
    let formattedText = `FACTIFI FACT CHECK SUMMARY\n\n`;
    formattedText += `Page: ${document.title}\n`;
    formattedText += `URL: ${window.location.href}\n`;
    formattedText += `Date: ${new Date().toLocaleDateString()}\n\n`;
    formattedText += `${claims.length} claims verified:\n\n`;
    
    claims.forEach((claim, index) => {
        formattedText += `${'='.repeat(50)}\n`;
        formattedText += `CLAIM ${index + 1}\n`;
        formattedText += `${'='.repeat(50)}\n\n`;
        
        formattedText += `Claim: "${claim.text}"\n\n`;
        formattedText += `Verdict: ${claim.verdict}\n`;
        formattedText += `Confidence: ${claim.confidence}%\n\n`;
        
        if (claim.explanation && claim.explanation.trim()) {
            formattedText += `Analysis:\n${claim.explanation.trim()}\n\n`;
        }
        
        if (claim.evidence_sources && claim.evidence_sources.length > 0) {
            formattedText += `Evidence Sources:\n`;
            claim.evidence_sources.forEach((source, sourceIndex) => {
                formattedText += `${sourceIndex + 1}. ${source}\n`;
            });
            formattedText += `\n`;
        }
        
        if (claim.citations && claim.citations.length > 0) {
            formattedText += `Citations:\n`;
            claim.citations.forEach((citation, citationIndex) => {
                formattedText += `${citationIndex + 1}. ${citation}\n`;
            });
            formattedText += `\n`;
        }
        
        formattedText += `\n`;
    });
    
    formattedText += `${'='.repeat(50)}\n`;
    formattedText += `Verified by Factifi - ${new Date().toLocaleDateString()}\n`;
    formattedText += `Source: ${window.location.href}`;
    
    copyToClipboard(formattedText);
    
    // Show feedback
    const copyButton = document.getElementById("factifi-copy-all");
    if (copyButton) {
        showCopyFeedback(copyButton);
    }
}

// Copy text to clipboard
function copyToClipboard(text) {
    // Create a temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    
    // Select the text and copy it
    textarea.select();
    document.execCommand('copy');
    
    // Remove the textarea
    document.body.removeChild(textarea);
}

// Show visual feedback when copied
// Show visual feedback when copied
function showCopyFeedback(button) {
    // Store original title and icon
    const originalTitle = button.getAttribute('title');
    const originalIcon = button.innerHTML;
    
    // Add feedback class and change to checkmark icon
    button.classList.add('factifi-copy-success');
    button.setAttribute('title', 'Copied!');
    
    // Replace the copy icon with a checkmark icon
    button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
    `;
    
    // Reset after a delay
    setTimeout(() => {
        button.classList.remove('factifi-copy-success');
        button.setAttribute('title', originalTitle);
        button.innerHTML = originalIcon; // Restore original icon
    }, 2000);
}

// Add this after the existing event listeners in createSidebar()
document.getElementById("factifi-google-signin-btn").addEventListener("click", handleGoogleSignIn);

// Add these new functions after the existing authentication functions
async function handleGoogleSignIn() {
  try {
    showAuthLoader();
    
    // Get the auth URL from the backend
    const response = await fetch('http://localhost:5001/auth/google/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to get auth URL');
    }
    
    const { auth_url } = await response.json();
    
    // Open popup window for Google OAuth
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      auth_url,
      'Google Sign In',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    // Listen for the message from the popup
    window.addEventListener('message', async function(event) {
      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        const { access_token, user } = event.data.data;
        
        // Store auth data in chrome.storage.local
        chrome.storage.local.set({
          'factifi_user': user,
          'factifi_logged_in': true,
          'factifi_token': access_token
        }, () => {
          // Update UI with user data
          showLoggedInUI(user);
          
          // Notify background script about auth state change
          chrome.runtime.sendMessage({
            action: 'authStateChanged',
            isLoggedIn: true,
            user: user
          });
        });
        
        // Close the popup if it's still open
        if (popup) {
          popup.close();
        }
        
        // Remove the event listener
        window.removeEventListener('message', arguments.callee);
      } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        showAuthError(event.data.error || 'Google sign in failed');
        if (popup) {
          popup.close();
        }
      }
    });
    
  } catch (error) {
    showAuthError(`Failed to start Google sign in: ${error.message}`);
  } finally {
    document.getElementById('factifi-auth-loader').classList.add('factifi-hidden');
  }
}

// Add this function for password toggle
window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    const toggle = input.nextElementSibling;
    const eyeIcon = toggle.querySelector('.factifi-eye-icon');
    
    if (input.type === "password") {
        input.type = "text";
        eyeIcon.innerHTML = `
            <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
        `;
    } else {
        input.type = "password";
        eyeIcon.innerHTML = `
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        `;
    }
};

// Update the CSS for the password toggle
const style = document.createElement('style');
style.textContent = `
    .factifi-password-container {
        position: relative;
        width: 100%;
    }
    
    .factifi-password-toggle {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        cursor: pointer;
        user-select: none;
        padding: 5px;
        background: none;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #666;
        transition: color 0.2s ease;
    }
    
    .factifi-password-toggle:hover {
        color: #333;
    }
    
    .factifi-eye-icon {
        fill: currentColor;
    }
`;
document.head.appendChild(style);




// Handle selected text fact-checking
function handleSelectedTextCheck(selectedText) {
  // Ensure sidebar is visible
  if (!isPanelVisible) {
    toggleSidebar();
  }
  
  // Check authentication first
  chrome.storage.local.get(['factifi_user', 'factifi_logged_in'], function(data) {
    if (!data.factifi_user || !data.factifi_logged_in) {
      showLoggedOutUI();
      return;
    }
    
    // Display the selected text as a single claim
    displaySelectedTextClaim(selectedText);
    
    // Start verification
    setTimeout(() => {
      verifySelectedText(selectedText);
    }, 300);
  });
}

// Display selected text as a claim
function displaySelectedTextClaim(text) {
  const claimsContainer = document.getElementById('factifi-claims-container');
  // const result = document.getElementById('factifi-result'); // Removed as result is cleared in handleSelectedTextCheck
  
  // Clear existing content (moved to handleSelectedTextCheck)
  // result.innerHTML = "";
  // claimsContainer.innerHTML = "";
  
  // Create header for selected text
  const headerSection = document.createElement('div');
  headerSection.className = 'factifi-claims-header';
  
  const heading = document.createElement('h3');
  heading.textContent = 'Selected Text Fact Check';
  headerSection.appendChild(heading);
  
  claimsContainer.appendChild(headerSection);
  
  // Create claim container for selected text
  const claimContainer = document.createElement('div');
  claimContainer.className = 'factifi-claim-container';
  claimContainer.dataset.claim = text;
  
  const claimText = document.createElement('div');
  claimText.className = 'factifi-claim-text';
  claimText.textContent = text;
  claimContainer.appendChild(claimText);
  
  // Add verification placeholder with spinner and text
  const verificationResult = document.createElement('div');
  verificationResult.className = 'factifi-verification-result';
  verificationResult.innerHTML = '<div class="factifi-spinner"></div><div class="factifi-progress-text">Analyzing selected text...</div>';
  claimContainer.appendChild(verificationResult);
  
  claimsContainer.appendChild(claimContainer);
}
// Verify selected text
async function verifySelectedText(text) {
  try {
    // Hide any initial loading text/spinner if present from displaySelectedTextClaim
    const existingVerificationResult = document.querySelector('.factifi-verification-result');
    if (existingVerificationResult) {
      existingVerificationResult.innerHTML = ''; // Clear the spinner/analyzing text
    }

    // Get the current user token
    const data = await new Promise(resolve => {
      chrome.storage.local.get(['factifi_user'], resolve);
    });

    const sourceUrl = window.location.href;
    const result = await chrome.runtime.sendMessage({
      action: 'verifySelectedText',
      text: text,
      sourceUrl: sourceUrl,
      userToken: data.factifi_user.token
    });

    if (result.success) {
      displayVerificationResult(text, result);
    } else {
      throw new Error(result.message || 'Verification failed');
    }
  } catch (error) {
    console.error('Error verifying selected text:', error);
    const resultDiv = document.getElementById('factifi-result');
    resultDiv.innerHTML = `<div class="factifi-error">Error: ${error.message}</div>`;
  }
}

// Add this constant at the end of the file for the Gemini description length
const GEMINI_DESCRIPTION_MAX_LENGTH = 300; // Adjust this value as needed
