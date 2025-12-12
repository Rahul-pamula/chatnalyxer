import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiLogin, apiRegister, setAuthToken } from "../services/api";
import { BASE_URL, OTP_URL } from "../config";

type User = { id?: number; phone_number?: string, username?: string, is_verified?: boolean } | null;
type AuthContextType = {
  token: string | null;
  user: User;
  loading: boolean;
  signInWithOTP: (phone_number: string, otp_code: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("token");
        const savedUser = await AsyncStorage.getItem("user");
        if (saved) {
          setToken(saved);
          setAuthToken(saved);
        }
        if (savedUser) setUser(JSON.parse(savedUser));
      } catch (e) {
        console.warn("Auth init error", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signInWithOTP = async (phone_number: string, otp_code: string) => {
    const response = await fetch(`${OTP_URL}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone_number, otp_code })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "OTP verification failed");
    }

    const data = await response.json();
    const t = data.token;
    const u = data.user ?? null;

    setToken(t);
    setUser(u);
    setAuthToken(t);
    await AsyncStorage.setItem("token", t);
    if (u) await AsyncStorage.setItem("user", JSON.stringify(u));
  };

  const signOut = async () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, signInWithOTP, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
