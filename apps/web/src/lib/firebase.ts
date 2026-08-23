// FarmSaathi AI — Firebase client-side initialization
// Uses environment variables from .env.local

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  GoogleAuthProvider,
  PhoneAuthProvider,
  signInWithPopup,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  initializeAuth,
  browserLocalPersistence,
  browserSessionPersistence,
  type User,
  type RecaptchaVerifier,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// ─── Firebase config ─────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "placeholder-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "placeholder.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "placeholder-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "placeholder.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000000000000:web:placeholder",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const isFirebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// Initialize Firebase (singleton) — only initializes with real config when env vars are set
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ─── Services ────────────────────────────────────────────────────────────────
export const auth = initializeAuth(app, {
  persistence: [browserLocalPersistence, browserSessionPersistence]
});
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics (only in browser)
export const analytics =
  typeof window !== "undefined"
    ? isSupported().then((yes) => (yes ? getAnalytics(app) : null))
    : null;

// ─── Auth helpers ────────────────────────────────────────────────────────────
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const registerWithEmail = async (
  email: string,
  password: string,
  displayName: string
) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  return result;
};

export const logout = () => signOut(auth);

export const getIdToken = async (): Promise<string | null> => {
  if (!auth.currentUser) return null;
  return auth.currentUser.getIdToken();
};

// ─── Firestore collections ───────────────────────────────────────────────────
export const farmersCol = () => collection(db, "farmers");
export const farmsCol = (uid: string) =>
  collection(db, "farmers", uid, "farms");
export const cropsCol = (uid: string, farmId: string) =>
  collection(db, "farmers", uid, "farms", farmId, "crops");
export const soilTestsCol = (uid: string, farmId: string) =>
  collection(db, "farmers", uid, "farms", farmId, "soilTests");
export const alertsCol = (uid: string) =>
  collection(db, "farmers", uid, "alerts");
export const conversationsCol = (uid: string) =>
  collection(db, "farmers", uid, "conversations");
export const messagesCol = (uid: string, convId: string) =>
  collection(db, "farmers", uid, "conversations", convId, "messages");
export const diseaseScansCol = (uid: string) =>
  collection(db, "farmers", uid, "diseaseScans");

// ─── Storage helpers ─────────────────────────────────────────────────────────
export const uploadImage = async (
  file: File,
  path: string
): Promise<string> => {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
};

export const uploadDiseaseScanImage = (uid: string, file: File): Promise<string> => {
  const path = `disease_scans/${uid}/${Date.now()}_${file.name}`;
  return uploadImage(file, path);
};

export const uploadProfilePhoto = (uid: string, file: File): Promise<string> => {
  const path = `profile_photos/${uid}/avatar_${Date.now()}`;
  return uploadImage(file, path);
};

export const uploadSoilImage = (uid: string, farmId: string, file: File): Promise<string> => {
  const path = `soil_images/${uid}/${farmId}/${Date.now()}_${file.name}`;
  return uploadImage(file, path);
};

// ─── Re-exports for convenience ──────────────────────────────────────────────
export {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  onAuthStateChanged,
  type User,
};
