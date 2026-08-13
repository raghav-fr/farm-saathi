// FarmSaathi AI — Firebase Auth Context
// Provides authenticated user state throughout the app

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  auth,
  db,
  onAuthStateChanged,
  getIdToken,
  signInWithGoogle,
  signInWithEmail,
  registerWithEmail,
  logout,
  type User,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "@/lib/firebase";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FarmerProfile {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  language: "en" | "hi" | "od";
  state: string;
  district: string;
  village?: string;
  farming_type?: string;
  photoURL?: string;
  createdAt?: string;
  updatedAt?: string;
  onboardingComplete: boolean;
}

interface AuthContextValue {
  user: User | null;
  profile: FarmerProfile | null;
  loading: boolean;
  idToken: string | null;
  signInGoogle: () => Promise<{ onboardingComplete: boolean }>;
  signInEmail: (email: string, password: string) => Promise<void>;
  registerEmail: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);

  const fetchProfile = useCallback(async (uid: string) => {
    try {
      const snap = await getDoc(doc(db, "farmers", uid));
      if (snap.exists()) {
        const data = snap.data() as FarmerProfile;
        setProfile(data);
        
        // Sync Google Translate cookie globally
        if (typeof window !== "undefined") {
          const lang = data.language || 'en';
          const gtLang = lang === 'od' ? 'or' : lang;
          const domain = window.location.hostname;
          
          if (lang === 'en') {
             document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain}`;
             document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          } else {
             document.cookie = `googtrans=/en/${gtLang}; path=/; domain=${domain}`;
             document.cookie = `googtrans=/en/${gtLang}; path=/;`;
          }
        }
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error("Failed to fetch farmer profile:", err);
      setProfile(null);
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const token = await getIdToken();
      setIdToken(token);
      return token;
    } catch (err) {
      console.error("Failed to refresh Firebase token:", err);
      return null;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setIdToken(token);
        await fetchProfile(firebaseUser.uid);
      } else {
        setIdToken(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [fetchProfile]);

  // Refresh token every 50 minutes (Firebase tokens expire after 60 min)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshToken, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, refreshToken]);

  const handleSignInGoogle = async () => {
    const result = await signInWithGoogle();
    // Create initial Firestore profile if first sign-in
    const uid = result.user.uid;
    const snap = await getDoc(doc(db, "farmers", uid));
    if (!snap.exists()) {
      await setDoc(doc(db, "farmers", uid), {
        uid,
        name: result.user.displayName || "",
        email: result.user.email || "",
        photoURL: result.user.photoURL || "",
        language: "en",
        state: "",
        district: "",
        onboardingComplete: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { onboardingComplete: false };
    }
    const data = snap.data();
    return { onboardingComplete: data?.onboardingComplete || false };
  };

  const handleSignInEmail = async (email: string, password: string) => {
    await signInWithEmail(email, password);
  };

  const handleRegisterEmail = async (
    email: string,
    password: string,
    name: string
  ) => {
    const result = await registerWithEmail(email, password, name);
    await setDoc(doc(db, "farmers", result.user.uid), {
      uid: result.user.uid,
      name,
      email,
      language: "en",
      state: "",
      district: "",
      onboardingComplete: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const handleSignOut = async () => {
    await logout();
    setProfile(null);
    setIdToken(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.uid);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        idToken,
        signInGoogle: handleSignInGoogle,
        signInEmail: handleSignInEmail,
        registerEmail: handleRegisterEmail,
        signOut: handleSignOut,
        refreshProfile,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
