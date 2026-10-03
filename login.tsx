import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth";
import { makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 42, paddingBottom: 28, justifyContent: "center" },
  mark: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: 28 },
  eyebrow: { color: colors.brand, fontSize: 12, letterSpacing: 2.4, fontWeight: "700", textTransform: "uppercase", marginBottom: 10 },
  title: { color: colors.onSurface, fontSize: 34, fontWeight: "500", letterSpacing: -0.8, marginBottom: 10 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24, marginBottom: 30, maxWidth: 330 },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 22 },
  tab: { minHeight: 44, paddingHorizontal: 4, marginRight: 26, justifyContent: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: colors.brand },
  tabText: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: colors.onSurface },
  fieldLabel: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 4, backgroundColor: colors.surfaceSecondary, paddingHorizontal: 15, color: colors.onSurface, fontSize: 16, marginBottom: 16 },
  primary: { minHeight: 52, backgroundColor: colors.brandPrimary, borderRadius: 4, alignItems: "center", justifyContent: "center", marginTop: 4 },
  primaryPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  primaryText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
  google: { minHeight: 52, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 4, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, marginTop: 12 },
  googleText: { color: colors.onSurface, fontSize: 15, fontWeight: "600" },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 20 },
  dividerLine: { height: 1, backgroundColor: colors.divider, flex: 1 },
  dividerText: { color: colors.muted, fontSize: 12 },
  error: { color: colors.error, fontSize: 13, marginBottom: 12 },
  demo: { color: colors.brand, fontSize: 13, textAlign: "center", marginTop: 18, textDecorationLine: "underline" },
  footer: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 24 },
}));

export default function LoginScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(""); setBusy(true);
    try { if (mode === "signin") await signIn(email.trim(), password); else await signUp(name.trim(), email.trim(), password); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to continue"); }
    finally { setBusy(false); }
  };
  const demo = async () => { setEmail("studio@aromaform.app"); setPassword("AromaForm123!"); setError(""); setBusy(true); try { await signIn("studio@aromaform.app", "AromaForm123!"); } catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in"); } finally { setBusy(false); } };

  return (
    <KeyboardAwareScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 30, paddingBottom: insets.bottom + 20 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.mark}><Ionicons name="flask-outline" size={24} color={colors.brand} /></View>
      <Text style={styles.eyebrow}>AromaForm / Studio</Text>
      <Text style={styles.title}>Compose with intention.</Text>
      <Text style={styles.subtitle}>A quiet workspace for the formulas, materials, and decisions behind your next signature scent.</Text>
      <View style={styles.tabs}>
        <Pressable testID="login-tab-signin" onPress={() => setMode("signin")} style={[styles.tab, mode === "signin" && styles.tabActive]}><Text style={[styles.tabText, mode === "signin" && styles.tabTextActive]}>Sign in</Text></Pressable>
        <Pressable testID="login-tab-signup" onPress={() => setMode("signup")} style={[styles.tab, mode === "signup" && styles.tabActive]}><Text style={[styles.tabText, mode === "signup" && styles.tabTextActive]}>Create account</Text></Pressable>
      </View>
      {mode === "signup" ? <><Text style={styles.fieldLabel}>Name</Text><TextInput testID="login-name-input" value={name} onChangeText={setName} placeholder="Your studio name" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="words" /></> : null}
      <Text style={styles.fieldLabel}>Email</Text>
      <TextInput testID="login-email-input" value={email} onChangeText={setEmail} placeholder="you@studio.com" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" keyboardType="email-address" />
      <Text style={styles.fieldLabel}>Password</Text>
      <TextInput testID="login-password-input" value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor={colors.muted} style={styles.input} secureTextEntry />
      {error ? <Text testID="login-error-text" style={styles.error}>{error}</Text> : null}
      <Pressable testID="login-submit-button" onPress={submit} disabled={busy} style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed, busy && { opacity: 0.6 }]}><Text style={styles.primaryText}>{busy ? "Opening studio…" : mode === "signin" ? "Enter workspace" : "Create workspace"}</Text>{busy ? <ActivityIndicator color={colors.onBrandPrimary} style={{ position: "absolute", right: 16 }} /> : null}</Pressable>
      <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>or</Text><View style={styles.dividerLine} /></View>
      <Pressable testID="login-google-button" onPress={() => void signInWithGoogle()} style={({ pressed }) => [styles.google, pressed && styles.primaryPressed]}><Ionicons name="logo-google" size={18} color={colors.onSurface} /><Text style={styles.googleText}>Continue with Google</Text></Pressable>
      {mode === "signin" ? <Pressable testID="login-demo-button" onPress={() => void demo()}><Text style={styles.demo}>Use the AromaForm studio account</Text></Pressable> : null}
      <Text style={styles.footer}>Your workspace stays yours. Drafts are cached locally while changes sync online.</Text>
    </KeyboardAwareScrollView>
  );
}
