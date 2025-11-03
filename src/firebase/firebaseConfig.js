import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- Global Setup & Configuration (MANDATORY) -------------------------------
// This now reads from Vite's .env file (import.meta.env.VITE_...) for local dev
// OR falls back to the window globals (window.__...) provided by the platform.

export const appId =
  import.meta.env.VITE_APP_ID || window.__app_id || "default-app-id";

const firebaseConfigStr =
  import.meta.env.VITE_FIREBASE_CONFIG || window.__firebase_config;

// --- Safely parse firebaseConfig ---
let tempFirebaseConfig = {};
if (firebaseConfigStr) {
  try {
    // *** ADDED FIX ***
    // Clean up backslashes and newlines from multi-line .env copy-paste
    // This removes the characters that cause the JSON.parse() error.
    const cleanConfigStr = firebaseConfigStr
      .replace(/[\\]/g, "")
      .replace(/[\n]/g, "");

    tempFirebaseConfig = JSON.parse(cleanConfigStr); // Parse the cleaned string
  } catch (error) {
    console.error("!!! CRITICAL: Failed to parse Firebase config. !!!");
    console.error("Error:", error.message);
    // Log the *original* string for debugging, as it's the source of the problem
    console.error(
      "Original config string (first 50 chars):",
      firebaseConfigStr.substring(0, 50) + "..."
    );
    console.warn(
      "Firebase will not be initialized. Please check your .env.local file (VITE_FIREBASE_CONFIG) or the platform's __firebase_config variable."
    );
    console.warn(
      "HINT: If using .env.local, your VITE_FIREBASE_CONFIG should be a single line of valid JSON."
    );
  }
}
export const firebaseConfig = tempFirebaseConfig;
// --- End safe parse ---

const initialAuthToken =
  import.meta.env.VITE_INITIAL_AUTH_TOKEN ||
  window.__initial_auth_token ||
  null;

// --- Initialize Firebase ----------------------------------------------------
let app;
let auth;
let db;

if (Object.keys(firebaseConfig).length > 0) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("Firebase Initialized Successfully.");
} else {
  console.warn(
    "Firebase config not available. App will not connect to Firestore."
  );
  // Log the original values for debugging
  console.log(
    "VITE_FIREBASE_CONFIG (raw):",
    import.meta.env.VITE_FIREBASE_CONFIG
  );
  console.log("__firebase_config (raw):", window.__firebase_config);
}

// --- Authentication Service -------------------------------------------------
/**
 * Authenticates the user using the provided token or anonymously.
 * @returns {Promise<string>} The user's UID.
 */
export const authenticateUser = () => {
  return new Promise((resolve, reject) => {
    if (!auth) {
      const localUserId = "local-user-id";
      console.warn("Auth not initialized. Using local fallback.");
      resolve(localUserId);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("User already authenticated:", user.uid);
        resolve(user.uid);
        unsubscribe(); // Clean up listener
        return;
      }

      try {
        // Check if token is null or "null"
        if (initialAuthToken && initialAuthToken !== "null") {
          console.log("Signing in with custom token...");
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          console.log("Signing in anonymously...");
          const userCredential = await signInAnonymously(auth);
          resolve(userCredential.user.uid);
        }
        // onAuthStateChanged will trigger again with the new user state
        // and resolve the promise on the next call (if (user) block)
      } catch (error) {
        console.error("Firebase Auth Error:", error);
        reject(error);
      }
    });
  });
};

// --- Firestore Collection Paths ---------------------------------------------
export const getCollectionPath = (userId) =>
  `/artifacts/${appId}/users/${userId}/invoice_data`;
export const getDocPath = (userId) => `data_summary`;

export { db, auth };
