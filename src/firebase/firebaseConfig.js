import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const appId =
  import.meta.env.VITE_APP_ID || window.__app_id || "default-app-id";

const firebaseConfigStr =
  import.meta.env.VITE_FIREBASE_CONFIG || window.__firebase_config;

let tempFirebaseConfig = {};
if (firebaseConfigStr) {
  try {
    const cleanConfigStr = firebaseConfigStr
      .replace(/[\\]/g, "")
      .replace(/[\n]/g, "");

    tempFirebaseConfig = JSON.parse(cleanConfigStr);
  } catch (error) {
    console.error("!!! CRITICAL: Failed to parse Firebase config. !!!");
    console.error("Error:", error.message);
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

const initialAuthToken =
  import.meta.env.VITE_INITIAL_AUTH_TOKEN ||
  window.__initial_auth_token ||
  null;

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

  console.log(
    "VITE_FIREBASE_CONFIG (raw):",
    import.meta.env.VITE_FIREBASE_CONFIG
  );
  console.log("__firebase_config (raw):", window.__firebase_config);
}

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
        unsubscribe();
        return;
      }

      try {
        if (initialAuthToken && initialAuthToken !== "null") {
          console.log("Signing in with custom token...");
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          console.log("Signing in anonymously...");
          const userCredential = await signInAnonymously(auth);
          resolve(userCredential.user.uid);
        }
      } catch (error) {
        console.error("Firebase Auth Error:", error);
        reject(error);
      }
    });
  });
};

export const getCollectionPath = (userId) =>
  `/artifacts/${appId}/users/${userId}/invoice_data`;
export const getDocPath = (userId) => `data_summary`;

export { db, auth };
