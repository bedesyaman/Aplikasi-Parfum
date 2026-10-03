import Constants from "expo-constants";
import { Platform } from "react-native";

// API base URL contract:
// - Web preview: same-origin (`window.location.origin`) so requests ride the Kubernetes
//   ingress (`/api/*` -> backend :8001) and never hit cross-origin failures.
// - Native (Expo Go / builds): `EXPO_PUBLIC_BACKEND_URL` from frontend/.env, the single
//   configured backend URL. Falls back to app config `extra` if the env was inlined there.
const configuredUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL as string | undefined;
const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
const runtimeUrl = Platform.OS === "web" ? window.location.origin : (envUrl ?? configuredUrl ?? "");
export const API_URL = `${runtimeUrl.replace(/\/$/, "")}/api`;

let memoryToken: string | null = null;

export function setApiToken(token: string | null) {
  memoryToken = token;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (memoryToken) headers.set("Authorization", `Bearer ${memoryToken}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export type User = { user_id: string; email: string; name: string; picture?: string | null };
export type Ingredient = {
  id: string; name: string; casNumber?: string | null; supplier?: string | null;
  category: string; noteType: string; volatilityRate?: string | null; costPerGram: number;
  ifraLimitPercentage?: number | null; dropWeightGrams: number; flashPoint?: number | null; createdDate: string;
};
export type FormulaItem = { id: string; ingredientId: string; weightGrams: number; dilutionPercentage: number };
export type Formula = {
  id: string; title: string; version: string; createdDate: string; updatedDate: string;
  targetConcentration: number; items: FormulaItem[]; notes?: string | null;
};