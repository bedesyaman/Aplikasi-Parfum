import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiRequest, Formula, Ingredient } from "@/src/api";
import { useAuth } from "@/src/auth";
import { FormulaDraft, loadDraft } from "@/src/drafts";
import { formatGrams } from "@/src/format";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: 20, paddingTop: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  brand: { color: colors.brand, fontSize: 12, fontWeight: "700", letterSpacing: 2.2, textTransform: "uppercase" },
  greeting: { color: colors.onSurface, fontSize: 15, marginTop: 7 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  hero: { backgroundColor: colors.surfaceInverse, borderRadius: 7, padding: 22, marginBottom: 22 },
  heroEyebrow: { color: colors.brand, fontSize: 11, letterSpacing: 1.6, fontWeight: "700", textTransform: "uppercase", marginBottom: 12 },
  heroTitle: { color: colors.onSurfaceInverse, fontSize: 25, fontWeight: "500", marginBottom: 8, letterSpacing: -0.4 },
  heroBody: { color: colors.muted, fontSize: 14, lineHeight: 21, maxWidth: 270 },
  heroButton: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 20, minHeight: 44 },
  heroButtonText: { color: colors.brand, fontSize: 14, fontWeight: "700" },
  draftCard: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: colors.brandTertiary, borderWidth: 1, borderColor: colors.brandSecondary, borderRadius: 5, padding: 14, marginBottom: 22 },
  draftTitle: { color: colors.onBrandTertiary, fontSize: 13, fontWeight: "700" },
  draftMeta: { color: colors.onBrandTertiary, fontSize: 11, marginTop: 3, opacity: 0.8 },
  draftResume: { color: colors.onBrandTertiary, fontSize: 12, fontWeight: "700", textDecorationLine: "underline" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 13 },
  sectionTitle: { color: colors.onSurface, fontSize: 19, fontWeight: "600", letterSpacing: -0.2 },
  sectionLink: { color: colors.brand, fontSize: 13, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, marginBottom: 28 },
  action: { flex: 1, minHeight: 78, borderRadius: 5, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, padding: 13, justifyContent: "space-between" },
  actionAccent: { backgroundColor: colors.brandTertiary, borderColor: colors.brandSecondary },
  actionLabel: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600", marginTop: 8 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: 5, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 10 },
  formulaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  formulaName: { color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  version: { color: colors.muted, fontSize: 12, marginTop: 5 },
  concentration: { alignItems: "flex-end" },
  concentrationValue: { color: colors.brand, fontSize: 16, fontWeight: "700" },
  concentrationLabel: { color: colors.muted, fontSize: 11, marginTop: 3 },
  formulaMeta: { borderTopWidth: 1, borderTopColor: colors.divider, marginTop: 14, paddingTop: 11, flexDirection: "row", justifyContent: "space-between" },
  metaText: { color: colors.muted, fontSize: 12 },
  chartCard: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 5, padding: 16, marginBottom: 20 },
  chartRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  chartLabel: { color: colors.onSurfaceSecondary, fontSize: 12, width: 48, fontWeight: "600" },
  barTrack: { flex: 1, height: 7, backgroundColor: colors.surfaceTertiary, borderRadius: 5, overflow: "hidden", marginHorizontal: 10 },
  barFill: { height: "100%", borderRadius: 5 },
  chartValue: { color: colors.muted, fontSize: 12, width: 38, textAlign: "right" },
  stats: { flexDirection: "row", gap: 10, marginBottom: 28 },
  stat: { flex: 1, backgroundColor: colors.surfaceTertiary, borderRadius: 5, padding: 13 },
  statValue: { color: colors.onSurface, fontSize: 20, fontWeight: "600" },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 5 },
  loading: { paddingVertical: 40, alignItems: "center" },
  error: { color: colors.error, fontSize: 13, paddingVertical: 10 },
  empty: { color: colors.muted, fontSize: 14, lineHeight: 21, paddingVertical: 12 },
}));

function concentrationLabel(value: number) {
  if (value > 20) return "Extrait";
  if (value >= 15) return "EDP";
  if (value >= 5) return "EDT";
  return "EDC";
}

export default function DashboardScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const formulas = useQuery({ queryKey: ["formulas"], queryFn: () => apiRequest<Formula[]>("/formulas") });
  const ingredients = useQuery({ queryKey: ["ingredients"], queryFn: () => apiRequest<Ingredient[]>("/ingredients") });
  const [draft, setDraft] = useState<FormulaDraft | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    void loadDraft("new").then((stored) => {
      if (active) setDraft(stored && (stored.items.length > 0 || stored.title !== "Untitled study") ? stored : null);
    });
    return () => { active = false; };
  }, []));

  const latest = formulas.data?.[0];
  const balance = useMemo(() => {
    const totals = { Top: 0, Heart: 0, Base: 0 };
    if (!latest || !ingredients.data) return totals;
    const sum = latest.items.reduce((total, item) => total + item.weightGrams, 0) || 1;
    latest.items.forEach((item) => {
      const note = ingredients.data.find((ingredient) => ingredient.id === item.ingredientId)?.noteType;
      if (note === "Top" || note === "Heart" || note === "Base") totals[note] += item.weightGrams;
    });
    return { Top: Math.round((totals.Top / sum) * 100), Heart: Math.round((totals.Heart / sum) * 100), Base: Math.round((totals.Base / sum) * 100) };
  }, [ingredients.data, latest]);

  return <View style={styles.root} testID="dashboard-screen">
    <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: bottomChrome + 24 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View><Text style={styles.brand}>AROMAFORM / STUDIO</Text><Text style={styles.greeting}>Good morning, {user?.name?.split(" ")[0] ?? "perfumer"}.</Text></View><Pressable testID="dashboard-notification-button" style={styles.iconButton}><Ionicons name="notifications-outline" size={19} color={colors.onSurface} /></Pressable></View>
      <View style={styles.hero}><Text style={styles.heroEyebrow}>Your formulation desk</Text><Text style={styles.heroTitle}>Make space for a new idea.</Text><Text style={styles.heroBody}>Build, balance, and document every detail of your fragrance work.</Text><Pressable testID="dashboard-new-formula-hero" onPress={() => router.push("/formula/new")} style={({ pressed }) => [styles.heroButton, pressed && { opacity: 0.7 }]}><Text style={styles.heroButtonText}>Start a new formula</Text><Ionicons name="arrow-forward" size={16} color={colors.brand} /></Pressable></View>
      {draft ? <View style={styles.draftCard} testID="dashboard-draft-card"><Ionicons name="time-outline" size={20} color={colors.onBrandTertiary} /><View style={{ flex: 1 }}><Text style={styles.draftTitle}>Unsaved draft — {draft.title}</Text><Text style={styles.draftMeta}>{draft.items.length} materials · cached on this device</Text></View><Pressable testID="dashboard-resume-draft" onPress={() => router.push("/formula/new")} hitSlop={8}><Text style={styles.draftResume}>Resume</Text></Pressable></View> : null}
      <View style={styles.actions}><Pressable testID="dashboard-action-new-formula" onPress={() => router.push("/formula/new")} style={({ pressed }) => [styles.action, styles.actionAccent, pressed && { opacity: 0.8 }]}><Ionicons name="add" size={20} color={colors.brand} /><Text style={styles.actionLabel}>New formula</Text></Pressable><Pressable testID="dashboard-action-add-material" onPress={() => router.push("/(tabs)/ingredients")} style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]}><Ionicons name="leaf-outline" size={19} color={colors.onSurfaceSecondary} /><Text style={styles.actionLabel}>Add material</Text></Pressable><Pressable testID="dashboard-action-scale-batch" onPress={() => router.push("/(tabs)/calculator")} style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]}><Ionicons name="calculator-outline" size={19} color={colors.onSurfaceSecondary} /><Text style={styles.actionLabel}>Scale batch</Text></Pressable></View>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Recent formulas</Text></View>
      {formulas.isLoading ? <View style={styles.loading}><ActivityIndicator color={colors.brand} /></View> : formulas.error ? <Text testID="dashboard-formulas-error" style={styles.error}>Could not load your formulas.</Text> : formulas.data?.length ? formulas.data.slice(0, 3).map((formula) => <Pressable testID={`dashboard-formula-card-${formula.id}`} key={formula.id} onPress={() => router.push(`/formula/${formula.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.82 }]}><View style={styles.formulaRow}><View><Text style={styles.formulaName}>{formula.title}</Text><Text style={styles.version}>{formula.version} · updated {new Date(formula.updatedDate).toLocaleDateString()}</Text></View><View style={styles.concentration}><Text style={styles.concentrationValue}>{formula.targetConcentration}%</Text><Text style={styles.concentrationLabel}>{concentrationLabel(formula.targetConcentration)}</Text></View></View><View style={styles.formulaMeta}><Text style={styles.metaText}>{formula.items.length} materials</Text><Text style={styles.metaText}>{formatGrams(formula.items.reduce((sum, item) => sum + item.weightGrams, 0))} g concentrate</Text><Ionicons name="chevron-forward" size={15} color={colors.muted} /></View></Pressable>) : <Text style={styles.empty}>Your formula shelf is waiting. Start with a new study and make it yours.</Text>}
      {latest ? <><View style={[styles.sectionHeader, { marginTop: 18 }]}><Text style={styles.sectionTitle}>Note balance</Text><Text style={styles.sectionLink}>{latest.title}</Text></View><View style={styles.chartCard} testID="dashboard-note-balance"><Text style={styles.metaText}>Aromatic structure by weight</Text>{(["Top", "Heart", "Base"] as const).map((note) => <View style={styles.chartRow} key={note} testID={`dashboard-balance-${note.toLowerCase()}`}><Text style={styles.chartLabel}>{note}</Text><View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.max(balance[note], 2)}%`, backgroundColor: note === "Top" ? colors.info : note === "Heart" ? colors.brand : colors.onSurface }]} /></View><Text style={styles.chartValue}>{balance[note]}%</Text></View>)}</View></> : null}
      <View style={styles.stats} testID="dashboard-stats"><View style={styles.stat}><Text style={styles.statValue} testID="dashboard-stat-formulas">{formulas.data?.length ?? 0}</Text><Text style={styles.statLabel}>Formula studies</Text></View><View style={styles.stat}><Text style={styles.statValue} testID="dashboard-stat-materials">{ingredients.data?.length ?? 0}</Text><Text style={styles.statLabel}>Raw materials</Text></View><View style={styles.stat}><Text style={styles.statValue}>{latest ? `${latest.targetConcentration}%` : "—"}</Text><Text style={styles.statLabel}>Latest strength</Text></View></View>
    </ScrollView>
  </View>;
}
