import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, setColorScheme, useTheme } from "@/src/theme";
import { storage } from "@/src/utils/storage";

const THEME_KEY = "aromaform_theme";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: 20 },
  eyebrow: { color: colors.brand, fontSize: 11, letterSpacing: 2, fontWeight: "700", textTransform: "uppercase", marginBottom: 8 },
  title: { color: colors.onSurface, fontSize: 29, fontWeight: "500", letterSpacing: -0.5, marginBottom: 24 },
  profile: { backgroundColor: colors.surfaceInverse, borderRadius: 5, padding: 18, flexDirection: "row", alignItems: "center", marginBottom: 28 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", marginRight: 13 },
  avatarText: { color: colors.onBrand, fontSize: 18, fontWeight: "700" },
  name: { color: colors.onSurfaceInverse, fontSize: 16, fontWeight: "600" },
  email: { color: colors.muted, fontSize: 12, marginTop: 5 },
  section: { color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 },
  row: { minHeight: 58, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", marginBottom: 8 },
  rowIcon: { width: 30, alignItems: "flex-start" },
  rowTitle: { color: colors.onSurfaceSecondary, fontSize: 14, fontWeight: "600", flex: 1 },
  rowValue: { color: colors.muted, fontSize: 12, marginRight: 8 },
  signOut: { minHeight: 52, borderWidth: 1, borderColor: colors.error, borderRadius: 4, alignItems: "center", justifyContent: "center", marginTop: 27 },
  signOutText: { color: colors.error, fontSize: 14, fontWeight: "700" },
  foot: { textAlign: "center", color: colors.muted, fontSize: 12, marginTop: 28, lineHeight: 18 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(18,18,18,0.45)", alignItems: "center", justifyContent: "center", padding: 28 },
  dialog: { backgroundColor: colors.surfaceSecondary, borderRadius: 6, borderWidth: 1, borderColor: colors.border, padding: 22, width: "100%", maxWidth: 340 },
  dialogTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "600", marginBottom: 8 },
  dialogBody: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 20 },
  dialogActions: { flexDirection: "row", gap: 10 },
  dialogButton: { flex: 1, minHeight: 48, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  dialogCancel: { borderWidth: 1, borderColor: colors.borderStrong },
  dialogCancelText: { color: colors.onSurface, fontSize: 14, fontWeight: "600" },
  dialogConfirm: { backgroundColor: colors.error },
  dialogConfirmText: { color: colors.onError, fontSize: 14, fontWeight: "700" },
}));

export default function SettingsScreen() {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const initials = user?.name?.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "AF";
  const [confirmVisible, setConfirmVisible] = useState(false);
  const confirmSignOut = () => setConfirmVisible(true);
  const doSignOut = async () => { setConfirmVisible(false); await signOut(); };
  const toggleTheme = () => {
    const next = scheme === "dark" ? "light" : "dark";
    setColorScheme(next);
    void storage.setItem(THEME_KEY, next);
  };
  return <View style={styles.root} testID="settings-screen"><ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: usesNativeTabs ? insets.bottom + 24 : 28 }]}><Text style={styles.eyebrow}>Studio / Preferences</Text><Text style={styles.title}>Settings</Text><View style={styles.profile} testID="settings-profile"><View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View><View><Text style={styles.name}>{user?.name}</Text><Text style={styles.email}>{user?.email}</Text></View></View><Text style={styles.section}>Workspace</Text><Pressable testID="settings-material-library-row" onPress={() => router.push("/(tabs)/ingredients")} style={styles.row}><View style={styles.rowIcon}><Ionicons name="leaf-outline" size={18} color={colors.brand} /></View><Text style={styles.rowTitle}>Material library</Text><Text style={styles.rowValue}>Synced</Text><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Pressable><View style={styles.row}><View style={styles.rowIcon}><Ionicons name="cloud-done-outline" size={18} color={colors.success} /></View><Text style={styles.rowTitle}>Cloud sync</Text><Text style={styles.rowValue}>Online</Text><Ionicons name="checkmark" size={17} color={colors.success} /></View><View style={styles.row}><View style={styles.rowIcon}><Ionicons name="cash-outline" size={18} color={colors.brand} /></View><Text style={styles.rowTitle}>Currency · HPP</Text><Text style={styles.rowValue} testID="settings-currency-value">IDR (Rp)</Text></View><Text style={[styles.section, { marginTop: 24 }]}>Appearance</Text><Pressable testID="settings-theme-toggle" onPress={toggleTheme} style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}><View style={styles.rowIcon}><Ionicons name={scheme === "dark" ? "moon-outline" : "sunny-outline"} size={18} color={colors.brand} /></View><Text style={styles.rowTitle}>Theme</Text><Text style={styles.rowValue} testID="settings-theme-value">{scheme === "dark" ? "Dark" : "Light"}</Text><Ionicons name="swap-horizontal" size={16} color={colors.muted} /></Pressable><Pressable testID="settings-signout-button" onPress={confirmSignOut} style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.7 }]}><Text style={styles.signOutText}>Sign out</Text></Pressable><Text style={styles.foot}>AromaForm v1.0 · Built for considered composition{"\n"}Drafts cache locally and sync when you return online.</Text></ScrollView>
  <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}><View style={styles.modalBackdrop} testID="settings-signout-modal"><View style={styles.dialog}><Text style={styles.dialogTitle}>Leave the studio?</Text><Text style={styles.dialogBody}>Your synced formulas will stay safe. Local drafts on this device remain available when you sign back in.</Text><View style={styles.dialogActions}><Pressable testID="settings-signout-cancel" onPress={() => setConfirmVisible(false)} style={({ pressed }) => [styles.dialogButton, styles.dialogCancel, pressed && { opacity: 0.8 }]}><Text style={styles.dialogCancelText}>Cancel</Text></Pressable><Pressable testID="settings-signout-confirm" onPress={() => void doSignOut()} style={({ pressed }) => [styles.dialogButton, styles.dialogConfirm, pressed && { opacity: 0.85 }]}><Text style={styles.dialogConfirmText}>Sign out</Text></Pressable></View></View></View></Modal></View>;
}
