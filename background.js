// background.js
import { API_URL } from './config.js';

// Global variables
let panelVisible = false;
let currentTabId = null;

// Listen for messages from content script
// Replace your message listener in background.js with this fixed version

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "logMessage") {
        console.log("Message from content script:", request.message);
        sendResponse({ status: "Message logged" });
    } else if (request.action === "processContent") {
        // Add user authentication check
        chrome.storage.local.get(['factifi_user', 'factifi_logged_in'], function(result) {
            if (result.factifi_user && result.factifi_logged_in) {
                processContent(request.url, sender.tab.id, request.user);
                sendResponse({ status: "Processing content" });
            } else {
                // Not authenticated
                chrome.tabs.sendMessage(sender.tab.id, {
                    action: "showError",
                    message: "Please log in to use Factifi"
                });
                
                // Notify content script about auth state
                chrome.tabs.sendMessage(sender.tab.id, {
                    action: "authStateChanged",
                    isLoggedIn: false
                });
                sendResponse({ status: "Authentication required" });
            }
        });
        return true; // Keep channel open for async response
    } else if (request.action === "verifyAllClaims") {
        // Add user authentication check
        chrome.storage.local.get(['factifi_user', 'factifi_logged_in'], function(result) {
            if (result.factifi_user && result.factifi_logged_in) {
                verifyAllClaims(request.claims, request.sourceUrl, sender.tab.id);
                sendResponse({ status: "Starting verification" });
            } else {
                // Not authenticated
                chrome.tabs.sendMessage(sender.tab.id, {
                    action: "showError",
                    message: "Please log in to use Factifi"
                });
                
                // Notify content script about auth state
                chrome.tabs.sendMessage(sender.tab.id, {
                    action: "authStateChanged",
                    isLoggedIn: false
                });
                sendResponse({ status: "Authentication required" });
            }
        });
        return true; // Keep channel open for async response
    } else if (request.action === "googleSignIn") {
        // Get the auth URL from your backend
        fetch(`${API_URL}/auth/google/login`)
            .then(response => response.json())
            .then(data => {
                // Use chrome.tabs.create instead of window.open
                chrome.tabs.create({
                    url: data.auth_url,
                    active: true
                }, (tab) => {
                    const authTabId = tab.id;
                    
                    // Listen for tab updates to detect when auth is complete
                    const onTabUpdated = (tabId, changeInfo, updatedTab) => {
                        if (tabId === authTabId && changeInfo.url) {
                            // Check if the URL indicates successful auth
                            if (changeInfo.url.includes('/auth/callback') || 
                                changeInfo.url.includes('success') ||
                                changeInfo.url.includes('token=')) {
                                
                                // Remove the listener
                                chrome.tabs.onUpdated.removeListener(onTabUpdated);
                                chrome.tabs.onRemoved.removeListener(onTabRemoved);
                                
                                // Handle auth success
                                handleAuthSuccess(changeInfo.url, authTabId, sendResponse);
                            }
                        }
                    };
                    
                    // Listen for tab removal (user closed auth tab)
                    const onTabRemoved = (tabId) => {
                        if (tabId === authTabId) {
                            chrome.tabs.onRemoved.removeListener(onTabRemoved);
                            chrome.tabs.onUpdated.removeListener(onTabUpdated);
                            sendResponse({ error: 'Authentication cancelled' });
                        }
                    };
                    
                    chrome.tabs.onUpdated.addListener(onTabUpdated);
                    chrome.tabs.onRemoved.addListener(onTabRemoved);
                });
            })
            .catch(error => {
                console.error('Google Sign-In error:', error);
                sendResponse({ error: error.message });
            });
        
        return true; // Keep channel open for async response
    } else if (request.action === "selectedText") {
        console.log("Received selected text:", request.text);
        const tabId = sender.tab.id;
        const sourceUrl = sender.tab.url;

        // Add user authentication check
        chrome.storage.local.get(['factifi_user', 'factifi_logged_in'], function(result) {
            if (result.factifi_user && result.factifi_logged_in) {
                // Show loading state in the sidebar for the selected text
                chrome.tabs.sendMessage(tabId, {
                    action: "showVerificationLoading",
                    text: request.text
                });

                // Trigger verification
                verifySelectedText(request.text, sourceUrl, tabId);
            } else {
                // Not authenticated
                chrome.tabs.sendMessage(tabId, {
                    action: "showError",
                    message: "Please log in to use Factifi to fact-check selected text."
                });
                // Notify content script about auth state to potentially show login UI
                chrome.tabs.sendMessage(tabId, {
                    action: "authStateChanged",
                    isLoggedIn: false
                });
            }
        });
        return true; // Keep channel open for async response
    } else if (request.action === "verifySelectedText") {
        console.log("Verifying selected text:", request.text);
        
        // Get token from storage (check both possible keys)
        chrome.storage.local.get(['factifi_token', 'factifi_user_token'], async function(data) {
            try {
                const userToken = data.factifi_token || data.factifi_user_token;
                
                if (!userToken) {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        action: "showError",
                        message: "Please log in to use Factifi"
                    });
                    sendResponse({ success: false, error: "Not authenticated" });
                    return;
                }
                
                const verification = await verifySelectedTextWithAPI(
                    request.text, 
                    request.sourceUrl, 
                    userToken
                );
                
                if (verification.success) {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        action: "updateClaimVerification",
                        claim: request.text,
                        verification: verification.verification
                    });
                    sendResponse({ success: true });
                } else {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        action: "showError",
                        message: verification.message || "Failed to verify selected text."
                    });
                    sendResponse({ success: false, error: verification.message });
                }
            } catch (error) {
                console.error("Error verifying selected text:", error);
                chrome.tabs.sendMessage(sender.tab.id, {
                    action: "showError",
                    message: "Failed to verify selected text."
                });
                sendResponse({ success: false, error: error.message });
            }
        });
        
        return true; // Keep channel open for async response
    }
    
    // For actions that don't need async response, don't return true
    // return true; // Remove this line - only return true for async handlers
});

// Handle browser action click (extension icon)
chrome.action.onClicked.addListener((tab) => {
    currentTabId = tab.id;
    
    // Check if URL is valid for processing
    const url = tab.url || "";
    if (!url.startsWith('http')) {
        console.log("Not a valid web page URL");
        return;
    }
    
    // Toggle the sidebar
    chrome.tabs.sendMessage(tab.id, { action: "toggleSidebar" })
        .catch(error => {
            console.log("Error communicating with content script. Injecting it first...");
            
            // If content script isn't loaded yet, we need to execute it
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            }).then(() => {
                // Now try again after a short delay
                setTimeout(() => {
                    chrome.tabs.sendMessage(tab.id, { action: "toggleSidebar" });
                }, 100);
            }).catch(err => {
                console.error("Failed to inject content script:", err);
            });
        });
});

// Process content function 
function processContent(url, tabId, userId = null) {
    console.log("Processing content from URL:", url);
    console.log("User ID (if provided):", userId);
    
    // Show loading state
    chrome.tabs.sendMessage(tabId, { 
        action: "showLoader"
    });
    
    // Check if YouTube or regular webpage
    if (isYouTubeUrl(url)) {
        processYouTubeVideo(url, tabId);
    } else {
        processWebpage(url, tabId);
    }
}

// Process YouTube video
function processYouTubeVideo(url, tabId) {
    // Extract video ID
    const videoId = extractYouTubeId(url);
    
    if (!videoId) {
        showError(tabId, "Could not extract YouTube video ID");
        return;
    }
    
    // Check server health first
    checkServerHealth()
        .then(() => {
            return fetch(`${API_URL}/process_video`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId: videoId })
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                // Add source URL to data
                data.sourceUrl = url;
                
                // Send claims to content script for display
                // The content script will automatically start verification
                chrome.tabs.sendMessage(tabId, {
                    action: "displayClaims",
                    data: data
                });
            } else {
                throw new Error(data.message || 'Unknown error occurred');
            }
        })
        .catch(error => {
            showError(tabId, `Error: ${error.message}. Make sure the backend server is running.`);
        });
}

// Process webpage
function processWebpage(url, tabId) {
    // Check server health first
    checkServerHealth()
        .then(() => {
            return fetch(`${API_URL}/process_webpage_claims`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url })
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                // Add source URL to data
                data.sourceUrl = url;
                
                // Send claims to content script for display
                // The content script will automatically start verification
                chrome.tabs.sendMessage(tabId, {
                    action: "displayClaims",
                    data: data
                });
            } else {
                throw new Error(data.message || 'Unknown error occurred');
            }
        })
        .catch(error => {
            showError(tabId, `Error: ${error.message}. Make sure the backend server is running.`);
        });
}

// Function to verify all claims
function verifyAllClaims(claims, sourceUrl, tabId) {
    console.log(`Starting verification of ${claims.length} claims`);
    
    // Process claims one by one
    function verifyNextClaim(index) {
        if (index >= claims.length) {
            // All claims processed
            chrome.tabs.sendMessage(tabId, {
                action: "verificationComplete",
                totalClaims: claims.length
            });
            return;
        }
        
        const claim = claims[index];
        
        // Update progress
        chrome.tabs.sendMessage(tabId, {
            action: "updateVerificationProgress",
            current: index + 1,
            total: claims.length
        });
        
        // Update UI to show this claim is being verified
        chrome.tabs.sendMessage(tabId, {
            action: "updateClaimVerification",
            claim: claim
        });
        
        // Verify the claim
        verifyClaim(claim, sourceUrl)
            .then(verification => {
                // Update the UI with the result
                chrome.tabs.sendMessage(tabId, {
                    action: "updateClaimVerification",
                    claim: claim,
                    verification: verification
                });
                
                // Move to next claim with a slight delay for visual feedback
                setTimeout(() => verifyNextClaim(index + 1), 500);
            })
            .catch(error => {
                // This shouldn't happen often since verifyClaim now handles errors internally
                console.error('Unexpected error verifying claim:', error);
                
                // Show error in UI and move to next claim
                chrome.tabs.sendMessage(tabId, {
                    action: "updateClaimVerification",
                    claim: claim,
                    verification: {
                        verdict: "CAN'T SAY",
                        confidence: 0,
                        explanation: `Unexpected verification error: ${error.message}`,
                        evidence_sources: [],
                        citations: []
                    }
                });
                
                // Move to next claim even if this one failed
                setTimeout(() => verifyNextClaim(index + 1), 500);
            });
    }
    
    // Start the verification process
    verifyNextClaim(0);
}

// Function to verify a single claim
function verifyClaim(claim, sourceUrl = '') {
    console.log(`Verifying claim: "${claim.substring(0, 40)}${claim.length > 40 ? '...' : ''}"`);
    console.log(`Using source URL: ${sourceUrl}`);
    
    return checkServerHealth()
        .then(() => {
            return fetch(`${API_URL}/verify_claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    claim: claim,
                    source_url: sourceUrl
                })
            });
        })
        .then(res => {
            if (!res.ok) {
                console.error(`Server responded with status: ${res.status}`);
                throw new Error(`Server responded with status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            if (data.status === 'error') {
                console.error(`Server returned error: ${data.message}`);
                throw new Error(data.message || 'Unknown error occurred');
            }
            
            // Extract the verification data from the response
            // The server returns a nested structure where verification has the actual data
            const verification = data.verification;
            
            // Log verification details for debugging
            console.log(`Verification complete for claim:`, claim.substring(0, 40));
            console.log(`Verdict: ${verification.verdict}`);
            console.log(`Confidence: ${verification.confidence}%`);
            console.log(`Explanation: ${verification.explanation}`);
            
            if (verification.evidence_sources) {
                console.log(`Evidence sources: ${verification.evidence_sources.length}`);
            }
            if (verification.citations) {
                console.log(`Citations: ${verification.citations.length}`);
            }
            
            return verification;
        })
        .catch(error => {
            console.error('Error during claim verification:', error);
            // Return a default verification object with error information
            return {
                verdict: "CAN'T SAY",
                confidence: 0,
                explanation: `Verification error: ${error.message}. Please check the server connection and try again.`,
                evidence_sources: [],
                citations: []
            };
        });
}

// Helper function to show error in content script
function showError(tabId, message) {
    chrome.tabs.sendMessage(tabId, {
        action: "showError",
        message: message
    });
}

// Helper function to check if URL is YouTube
function isYouTubeUrl(url) {
    return url.includes('youtube.com/watch') || url.includes('youtu.be/') || url.includes('youtube.com/shorts');
}

// Helper function to extract YouTube ID
function extractYouTubeId(url) {
    let videoId = null;
    
    // Handle regular youtube.com/watch?v= format
    if (url.includes('youtube.com/watch')) {
        const urlObj = new URL(url);
        videoId = urlObj.searchParams.get("v");
    } 
    // Handle youtu.be/ short link format
    else if (url.includes('youtu.be/')) {
        const urlParts = url.split('youtu.be/');
        if (urlParts.length > 1) {
            videoId = urlParts[1].split('?')[0].split('&')[0];
        }
    }
    // Handle youtube.com/shorts/ format
    else if (url.includes('youtube.com/shorts/')) {
        const urlParts = url.split('shorts/');
        if (urlParts.length > 1) {
            videoId = urlParts[1].split('?')[0].split('&')[0];
        }
    }
    
    return videoId;
}

// Check if server is healthy
function checkServerHealth() {
    return fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: {'Content-Type': 'application/json'},
        signal: AbortSignal.timeout(2000)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server health check failed with status: ${response.status}`);
        }
        return true;
    });
}

// Set up alarm for periodic checking
chrome.alarms.create("checkForUpdates", { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "checkForUpdates") {
        console.log("Checking for server status...");
        checkServerHealth()
            .then(() => console.log("Factifi server is running"))
            .catch(error => console.error("Factifi server issue:", error));
    }
});

// Setup chrome extension installation and update handling
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        console.log("Factifi extension installed");
    } else if (details.reason === "update") {
        console.log("Factifi extension updated");
    }
    
    // Create context menu item
    chrome.contextMenus.create({
        id: "factifi-check-text",
        title: "Fact-check with Factifi",
        contexts: ["selection"]
    });
});

// FIXED: Handle context menu clicks - Direct verification without double processing
// Replace your context menu handler in background.js with this fixed version

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "factifi-check-text" && info.selectionText) {
        console.log("Context menu clicked - verifying selected text directly");
        
        try {
            // Get authentication token
            const data = await new Promise((resolve) => {
                chrome.storage.local.get(['factifi_token', 'factifi_user_token'], resolve);
            });
            
            const userToken = data.factifi_token || data.factifi_user_token;
            
            if (!userToken) {
                chrome.tabs.sendMessage(tab.id, {
                    action: "showError",
                    message: "Please log in to use Factifi"
                }).catch(error => {
                    console.log("Could not send message to tab - content script may not be loaded:", error);
                });
                return;
            }
            
            // First, try to toggle the sidebar to ensure content script is loaded and panel is open
            try {
                await chrome.tabs.sendMessage(tab.id, { action: "toggleSidebar" });
                console.log("Sidebar toggled successfully.");
            } catch (error) {
                console.log("Error communicating with content script. Injecting it first...", error);
                // If content script isn't loaded yet, we need to execute it
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
                // Now try again after a short delay
                await new Promise(resolve => setTimeout(resolve, 100));
                await chrome.tabs.sendMessage(tab.id, { action: "toggleSidebar" });
                console.log("Content script injected and sidebar toggled.");
            }

            // Show loading state immediately after ensuring sidebar is open
            chrome.tabs.sendMessage(tab.id, {
                action: "showVerificationLoading",
                text: info.selectionText
            }).catch(error => {
                console.log("Could not send loading message to tab after injection:", error);
            });
            
            // Verify directly without sending to content script first
            const verification = await verifySelectedTextWithAPI(
                info.selectionText, 
                tab.url, 
                userToken
            );
            
            if (verification.success) {
                chrome.tabs.sendMessage(tab.id, {
                    action: "showVerificationResult",
                    claim: info.selectionText,
                    verification: verification.verification
                }).catch(error => {
                    console.log("Could not send verification result to tab after injection:", error);
                });
            } else {
                chrome.tabs.sendMessage(tab.id, {
                    action: "showError",
                    message: verification.message || "Failed to verify selected text."
                }).catch(error => {
                    console.log("Could not send error message to tab after injection:", error);
                });
            }
        } catch (error) {
            console.error("Error verifying selected text from context menu:", error);
            chrome.tabs.sendMessage(tab.id, {
                action: "showError",
                message: "Failed to verify selected text due to an unexpected error."
            }).catch(err => {
                console.log("Could not send error message to tab after final catch:", err);
            });
        }
    }
});

// API function to verify selected text
async function verifySelectedTextWithAPI(text, sourceUrl, userToken) {
    try {
        const response = await fetch(`${API_URL}/verify_claim`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({
                claim: text,
                source_url: sourceUrl
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Verification API response:', data);

        if (data.status === 'error') {
            throw new Error(data.message || 'Unknown error occurred');
        }

        return {
            success: true,
            verification: data.verification
        };
    } catch (error) {
        console.error('Error in verifySelectedTextWithAPI:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// Add this helper function to your background.js

function handleAuthSuccess(url, authTabId, sendResponse) {
    try {
        const urlObj = new URL(url);
        const token = urlObj.searchParams.get('token');
        const userDataStr = urlObj.searchParams.get('user');
        
        if (token) {
            const userData = userDataStr ? JSON.parse(decodeURIComponent(userDataStr)) : null;
            
            // Store the user data and token
            chrome.storage.local.set({
                'factifi_user': userData,
                'factifi_logged_in': true,
                'factifi_token': token
            }, () => {
                // Close the auth tab
                chrome.tabs.remove(authTabId);
                
                sendResponse({ 
                    success: true,
                    token: token,
                    user: userData
                });
            });
            return;
        }
        
        // If no token in URL params, try to handle auth code
        const authCode = urlObj.searchParams.get('code');
        
        if (authCode) {
            // Exchange the code for user data
            fetch(`${API_URL}/auth/google/callback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: authCode })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Store the user data and token
                    chrome.storage.local.set({
                        'factifi_user': data.user,
                        'factifi_logged_in': true,
                        'factifi_token': data.access_token
                    }, () => {
                        // Close the auth tab
                        chrome.tabs.remove(authTabId);
                        
                        sendResponse({ 
                            success: true,
                            token: data.access_token,
                            user: data.user
                        });
                    });
                } else {
                    chrome.tabs.remove(authTabId);
                    sendResponse({ error: data.message || 'Authentication failed' });
                }
            })
            .catch(error => {
                console.error('Error during auth callback:', error);
                chrome.tabs.remove(authTabId);
                sendResponse({ error: 'Authentication failed' });
            });
        } else {
            // No recognizable auth data in URL
            chrome.tabs.remove(authTabId);
            sendResponse({ error: 'Authentication failed - no auth data received' });
        }
    } catch (error) {
        console.error('Error parsing auth URL:', error);
        chrome.tabs.remove(authTabId);
        sendResponse({ error: 'Authentication parsing error' });
    }
}

async function verifySelectedText(text, sourceUrl, tabId) {
    // Show loading state in the sidebar for the selected text
    chrome.tabs.sendMessage(tabId, {
        action: "showVerificationLoading",
        text: text
    }).catch(error => {
        console.log("Could not send loading message to tab:", error);
    });

    try {
        // Get authentication token
        const data = await new Promise((resolve) => {
            chrome.storage.local.get(['factifi_token', 'factifi_user_token'], resolve);
        });

        const userToken = data.factifi_token || data.factifi_user_token;

        if (!userToken) {
            chrome.tabs.sendMessage(tabId, {
                action: "showError",
                message: "Please log in to use Factifi to fact-check selected text."
            }).catch(error => {
                console.log("Could not send error message to tab:", error);
            });
            return;
        }

        const verification = await verifySelectedTextWithAPI(
            text,
            sourceUrl,
            userToken
        );

        if (verification.success) {
            chrome.tabs.sendMessage(tabId, {
                action: "showVerificationResult",
                claim: text,
                verification: verification.verification
            }).catch(error => {
                console.log("Could not send verification result to tab:", error);
            });
        } else {
            chrome.tabs.sendMessage(tabId, {
                action: "showError",
                message: verification.message || "Failed to verify selected text."
            }).catch(error => {
                console.log("Could not send error message to tab:", error);
            });
        }
    } catch (error) {
        console.error("Error verifying selected text:", error);
        chrome.tabs.sendMessage(tabId, {
            action: "showError",
            message: "Failed to verify selected text due to an unexpected error."
        }).catch(err => {
            console.log("Could not send error message to tab:", err);
        });
    }
}
