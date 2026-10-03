import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

import { apiRequest, setApiToken, User } from "@/src/api";

WebBrowser.maybeCompleteAuthSession();
const TOKEN_KEY = "aromaform_session_token";
const processedSessions = new Set<string>();

async function readToken() {
  if (Platform.OS === "web") return window.localStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}
async function saveToken(token: string) {
  if (Platform.OS === "web") window.localStorage.setItem(TOKEN_KEY, token);
  else await SecureStore.setItemAsync(TOKEN_KEY, token);
}
async function clearToken() {
  if (Platform.OS === "web") window.localStorage.removeItem(TOKEN_KEY);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}
function extractSessionId(url: string | null | undefined) {
  if (!url) return null;
  const match = url.match(/[?#&]session_id=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const completeGoogleSession = async (url: string) => {
    const sessionId = extractSessionId(url);
    if (!sessionId || processedSessions.has(sessionId)) return false;
    processedSessions.add(sessionId);
    try {
      const result = await apiRequest<{ session_token: string; user: User }>("/auth/session", {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId }),
      });
      await saveToken(result.session_token);
      setApiToken(result.session_token);
      setUser(result.user);
      if (Platform.OS === "web") window.history.replaceState(window.history.state, "", window.location.pathname);
      return true;
    } catch (error) {
      processedSessions.delete(sessionId);
      throw error;
    }
  };

  useEffect(() => {
    let active = true;
    const boot = async () => {
      try {
        let callbackUrl: string | null = null;
        if (Platform.OS === "web") callbackUrl = window.location.href;
        else callbackUrl = await Linking.getInitialURL();
        if (callbackUrl && extractSessionId(callbackUrl)) await completeGoogleSession(callbackUrl);
        if (!active || user) return;
        const token = await readToken();
        if (!token) return;
        setApiToken(token);
        const current = await apiRequest<User>("/auth/me");
        if (active) setUser(current);
      } catch {
        await clearToken();
        setApiToken(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void boot();
    const listener = Platform.OS === "web" ? undefined : Linking.addEventListener("url", ({ url }) => {
      void completeGoogleSession(url).catch(() => undefined);
    });
    return () => {
      active = false;
      listener?.remove();
    };
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    signIn: async (email, password) => {
      const result = await apiRequest<{ session_token: string; user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      await saveToken(result.session_token); setApiToken(result.session_token); setUser(result.user);
    },
    signUp: async (name, email, password) => {
      const result = await apiRequest<{ session_token: string; user: User }>("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
      await saveToken(result.session_token); setApiToken(result.session_token); setUser(result.user);
    },
    signInWithGoogle: async () => {
      const redirectUrl = Platform.OS === "web" ? `${window.location.origin}/` : Linking.createURL("");
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      if (Platform.OS === "web") { window.location.href = authUrl; return; }
      let deepLink: string | null = null;
      const listener = Linking.addEventListener("url", ({ url }) => { deepLink = url; });
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      listener.remove();
      await completeGoogleSession(result.type === "success" ? result.url : deepLink ?? await Linking.getInitialURL() ?? "");
    },
    signOut: async () => {
      try { await apiRequest("/auth/logout", { method: "POST" }); } catch { /* local cleanup still wins */ }
      await clearToken(); setApiToken(null); setUser(null);
    },
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}