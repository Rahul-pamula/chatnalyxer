// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiLogin, apiRegister, setAuthToken } from "../services/api";

type User = { id?: string; email?: string } | null;
type AuthContextType = {
  token: string | null;
  user: User;
  loading: boolean;
  signIn: (email: string, pwd: string) => Promise<void>;
  signUp: (email: string, pwd: string) => Promise<void>;
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

  const signIn = async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    const t = data.token;
    const u = data.user ?? null;
    setToken(t);
    setUser(u);
    setAuthToken(t);
    await AsyncStorage.setItem("token", t);
    if (u) await AsyncStorage.setItem("user", JSON.stringify(u));
  };

  const signUp = async (email: string, password: string) => {
    const data = await apiRegister(email, password);
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
    <AuthContext.Provider value={{ token, user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
