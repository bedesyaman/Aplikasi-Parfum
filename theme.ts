import { useMemo, useSyncExternalStore } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FBFBF9",
  onSurface: "#252522",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#3F3F3A",
  surfaceTertiary: "#F3F1EA",
  onSurfaceTertiary: "#686860",
  surfaceInverse: "#252522",
  onSurfaceInverse: "#FBFBF9",
  muted: "#8B8B84",
  brand: "#C5A059",
  onBrand: "#FFFFFF",
  brandPrimary: "#252522",
  onBrandPrimary: "#FBFBF9",
  brandSecondary: "#E8DFCF",
  onBrandSecondary: "#63512F",
  brandTertiary: "#F4EEDD",
  onBrandTertiary: "#80662E",
  success: "#4E785A",
  onSuccess: "#FFFFFF",
  warning: "#B98235",
  onWarning: "#FFFFFF",
  error: "#B6574A",
  onError: "#FFFFFF",
  info: "#637B87",
  onInfo: "#FFFFFF",
  border: "#E5E2DA",
  borderStrong: "#C9C2B5",
  divider: "#ECEAE4",
};

const dark: typeof light = {
  ...light,
  surface: "#121212",
  onSurface: "#F5F2EA",
  surfaceSecondary: "#1D1D1A",
  onSurfaceSecondary: "#DFDCD2",
  surfaceTertiary: "#292823",
  onSurfaceTertiary: "#B6B1A5",
  surfaceInverse: "#F5F2EA",
  onSurfaceInverse: "#121212",
  muted: "#928E84",
  brandPrimary: "#F5F2EA",
  onBrandPrimary: "#121212",
  brandSecondary: "#3B3326",
  onBrandSecondary: "#E8C985",
  brandTertiary: "#332C20",
  onBrandTertiary: "#E8C985",
  border: "#38362F",
  borderStrong: "#5C564A",
  divider: "#2A2924",
};

export type ThemeColors = typeof light;
export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark: ThemeColors } = { light, dark };

// User-selected scheme override. Appearance.setColorScheme is a no-op on react-native-web,
// so the override is held in a module store and useTheme subscribes to it — the toggle in
// Settings repaints the whole app on every platform.
let schemeOverride: ColorScheme | null = null;
const schemeListeners = new Set<() => void>();

function subscribeScheme(listener: () => void) {
  schemeListeners.add(listener);
  return () => { schemeListeners.delete(listener); };
}

export function setColorScheme(scheme: ColorScheme | null) {
  schemeOverride = scheme;
  Appearance.setColorScheme?.(scheme ?? "unspecified");
  schemeListeners.forEach((listener) => listener());
}

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const override = useSyncExternalStore(subscribeScheme, () => schemeOverride, () => schemeOverride);
  const scheme: ColorScheme = override ?? (system === "dark" ? "dark" : defaultScheme);
  return { scheme, colors: themes[scheme] };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}