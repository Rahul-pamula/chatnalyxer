import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthToken } from "../services/api";
import { BASE_URL } from "../config";

type User = {
  id?: number;
  phone_number?: string;
  username?: string;
  is_verified?: boolean;
  user_type?: 'STUDENT' | 'FACULTY' | 'CASUAL';
  profile_data?: any;
  is_profile_complete?: boolean;
} | null;
type AuthContextType = {
  token: string | null;
  user: User;
  loading: boolean;
  signInWithOTP: (phone_number: string, otp_code: string) => Promise<void>;
  signInWithPassword: (phone: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${BASE_URL}/users/profile`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        await AsyncStorage.setItem("user", JSON.stringify(userData));
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("token");
        const savedUser = await AsyncStorage.getItem("user");
        if (saved) {
          setToken(saved);
          setAuthToken(saved);

          // Fetch fresh user data in background
          try {
            const response = await fetch(`${BASE_URL}/users/profile`, {
              headers: { "Authorization": `Bearer ${saved}` }
            });
            if (response.ok) {
              const userData = await response.json();
              setUser(userData);
              await AsyncStorage.setItem("user", JSON.stringify(userData));
            } else if (savedUser) {
              setUser(JSON.parse(savedUser));
            }
          } catch (e) {
            if (savedUser) setUser(JSON.parse(savedUser));
          }
        }
      } catch (e) {
        console.warn("Auth init error", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAuthSuccess = async (data: any) => {
    const t = data.token;
    const u = data.user ?? null;

    setToken(t);
    setUser(u);
    setAuthToken(t);
    await AsyncStorage.setItem("token", t);
    if (u) await AsyncStorage.setItem("user", JSON.stringify(u));
  };

  const signInWithOTP = async (phone_number: string, otp_code: string) => {
    // We can use the api.ts function now, but keep using fetch for continuity if preferred.
    // Let's switch to the fetch from api.ts wrapper inside the component or here. 
    // Actually, let's keep the existing logic but route it correctly.
    // The previous implementation used fetch directly to OTP_URL. 
    // Now verify-otp is on BASE_URL same as others.

    // NOTE: Previous implementation used OTP_URL to verify. backend auth router has verify-otp.
    // If backend is single instance now, we should use BASE_URL.
    // Assuming new backend router handles it.

    // Using direct fetch to match existing pattern but fixing URL to BASE_URL if needed
    // The auth router calls are all on BASE_URL in api.ts.
    // Let's use the api functions for consistency if possible, but for minimal diff:

    const response = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone_number, otp_code })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "OTP verification failed");
    }

    const data = await response.json();
    await handleAuthSuccess(data);
  };

  const signInWithPassword = async (phone: string, pass: string) => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone_number: phone, password: pass })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Login failed");
    }

    const data = await response.json();
    await handleAuthSuccess(data);
  };

  const signOut = async () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, signInWithOTP, signInWithPassword, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
