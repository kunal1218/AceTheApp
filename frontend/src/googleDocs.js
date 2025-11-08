import { cleanEssayPrompt } from "./cleanEssayPrompt";
import { getUser, getCollegeDocs, saveCollegeDoc } from "./api"; // <-- Import your API helpers

window.addEventListener('unhandledrejection', function(event) {
  console.error('UNHANDLED PROMISE REJECTION:', event.reason);
  alert('UNHANDLED PROMISE REJECTION: ' + (event.reason && event.reason.message ? event.reason.message : JSON.stringify(event.reason)));
});

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SCOPES = "https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file";

let accessToken = null;

export function gapiLoad() {
  return new Promise(resolve => {
    if (window.gapi) {
      window.gapi.load("client", resolve);
    } else {
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => window.gapi.load("client", resolve);
      document.body.appendChild(script);
    }
  });
}

export async function gapiInit() {
  await window.gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [
      "https://docs.googleapis.com/$discovery/rest?version=v1",
      "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
    ],
  });
}

export async function gapiSignIn() {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      reject(new Error("Google Identity Services not loaded"));
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => {
        try {
          if (tokenResponse && tokenResponse.access_token) {
            accessToken = tokenResponse.access_token;
            window.gapi.client.setToken({ access_token: accessToken });
            console.debug("[gapiSignIn] Received access token:", accessToken);
            // Try to get user info for debugging
            window.gapi.client.request({
              path: 'https://www.googleapis.com/oauth2/v3/userinfo'
            }).then(userinfo => {
              console.debug("[gapiSignIn] Google user info:", userinfo);
              resolve();
            }).catch(err => {
              console.warn("[gapiSignIn] Could not fetch user info:", err);
              resolve();
            });
          } else {
            console.error("[gapiSignIn] No access token in response:", tokenResponse);
            reject(tokenResponse);
          }
        } catch (err) {
          reject(err);
        }
      },
    });
    client.requestAccessToken();
  });
}

// Create a Google Doc and save its URL to the backend
export async function createCollegeDoc(collegeId, collegeName, essayText, collegeSlug) {
  try {
    // Get user name from backend
    let userName = "User";
    try {
      const user = await getUser();
      // Prefer fullName, then name, then fallback
      userName = user.fullName || user.name || "User";
      console.debug("[createCollegeDoc] Using userName:", userName, "from user object:", user);
    } catch (e) {
      // fallback to "User"
      console.warn("[createCollegeDoc] Failed to fetch user name, using fallback 'User'.", e);
    }
    const docTitle = `${userName} - ${collegeName} 2025 essays`;

    // If essayText is not provided, try to fetch from prompts
    let finalEssayText = essayText;
    if (!finalEssayText && collegeSlug) {
      const prompts = await getEssayPrompts(collegeSlug, "2025");
      if (prompts && prompts.length > 0) {
        finalEssayText = prompts.map((q, i) => `${i + 1}. ${q}`).join("\n\n");
      } else {
        finalEssayText = `Essay prompts for ${collegeName} (none found)`;
      }
    }
    finalEssayText = cleanEssayPrompt(finalEssayText);

    await gapiLoad();
    await gapiInit();
    await gapiSignIn();
    if (!accessToken) {
      throw new Error("Google access token not set. Please sign in to Google.");
    }
    // 1. Create the doc
    let createRes;
    try {
      createRes = await window.gapi.client.docs.documents.create({ title: docTitle });
    } catch (err) {
      console.error("[createCollegeDoc] Google Docs API create error:", err);
      throw err;
    }
    let docId = createRes.result.documentId;

    // 2. Insert essay questions
    try {
      await window.gapi.client.docs.documents.batchUpdate({
        documentId: docId,
        requests: [{
          insertText: {
            location: { index: 1 },
            text: finalEssayText,
          }
        }]
      });
    } catch (err) {
      console.error("[createCollegeDoc] Google Docs API batchUpdate error:", err);
      throw err;
    }

    // 3. Get the doc link
    const docUrl = `https://docs.google.com/document/d/${docId}/edit`;

    // 4. Save doc URL to backend
    await saveCollegeDoc(collegeId, docUrl);

    return docUrl;
  } catch (err) {
    console.error("createCollegeDoc failed:", err);
    alert("createCollegeDoc failed: " + (err.message || JSON.stringify(err)));
    throw err;
  }
}

// Get a college doc URL from the backend
export async function getCollegeDocUrl(collegeId) {
  try {
    const docs = await getCollegeDocs();
    return docs[collegeId] || null;
  } catch (e) {
    return null;
  }
}

// Fetch essay prompts from the static JSON file in public/
export async function getEssayPrompts(collegeSlug, year = "2025") {
  try {
    const res = await fetch("/essay_prompts.json");
    if (!res.ok) throw new Error("Failed to fetch essay prompts");
    const data = await res.json();
    if (data[collegeSlug] && data[collegeSlug][year]) {
      return data[collegeSlug][year];
    }
    return [];
  } catch (err) {
    console.error("Error fetching essay prompts:", err);
    return [];
  }
}

export async function checkGoogleDocExists(docUrl) {
  try {
    // Extract docId from the URL
    const match = docUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return false;
    const docId = match[1];
    // Try to get the document metadata
    await gapiLoad();
    await gapiInit();
    await gapiSignIn();
    await window.gapi.client.docs.documents.get({ documentId: docId });
    return true;
  } catch (err) {
    // If the doc is deleted or inaccessible, treat as non-existent
    return false;
  }
}