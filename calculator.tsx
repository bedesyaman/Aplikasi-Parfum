import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiRequest, Formula, Ingredient } from "@/src/api";
import { formatGrams, formatIDR } from "@/src/format";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: 20 },
  eyebrow: { color: colors.brand, fontSize: 11, letterSpacing: 2, fontWeight: "700", textTransform: "uppercase", marginBottom: 8 },
  title: { color: colors.onSurface, fontSize: 29, fontWeight: "500", letterSpacing: -0.5 },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 23, maxWidth: 330 },
  label: { color: colors.onSurfaceSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  picker: { flexDirection: "row", gap: 8, paddingBottom: 20 },
  pill: { minHeight: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, justifyContent: "center", backgroundColor: colors.surfaceSecondary, flexShrink: 0 },
  pillActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandSecondary },
  pillText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  pillTextActive: { color: colors.onBrandTertiary },
  panel: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 5, padding: 17, marginBottom: 13 },
  inputRow: { flexDirection: "row", gap: 10 },
  inputWrap: { flex: 1 },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 4, backgroundColor: colors.surface, paddingHorizontal: 14, color: colors.onSurface, fontSize: 20, fontWeight: "600" },
  suffix: { color: colors.muted, fontSize: 13, marginTop: 8 },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  resultTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "600" },
  resultBadge: { color: colors.onBrandTertiary, backgroundColor: colors.brandTertiary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, fontSize: 11, fontWeight: "700" },
  resultRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.divider },
  resultLabel: { color: colors.onSurfaceSecondary, fontSize: 14 },
  resultValue: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  total: { backgroundColor: colors.surfaceInverse, borderRadius: 5, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  totalLabel: { color: colors.muted, fontSize: 12 },
  totalValue: { color: colors.onSurfaceInverse, fontSize: 22, fontWeight: "600" },
  cost: { color: colors.brand, fontSize: 14, fontWeight: "700" },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  empty: { color: colors.muted, lineHeight: 21, paddingVertical: 18 },
  loading: { padding: 30, alignItems: "center" },
}));

export default function CalculatorScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState("");
  const [batch, setBatch] = useState("100");
  const [concentration, setConcentration] = useState("18");
  const formulas = useQuery({ queryKey: ["formulas"], queryFn: () => apiRequest<Formula[]>("/formulas") });
  const ingredients = useQuery({ queryKey: ["ingredients"], queryFn: () => apiRequest<Ingredient[]>("/ingredients") });
  const selected = formulas.data?.find((formula) => formula.id === (selectedId || formulas.data[0]?.id));
  const calculations = useMemo(() => {
    const finalBatch = Math.max(Number(batch) || 0, 0);
    const strength = Math.min(Math.max(Number(concentration) || 0, 0), 100);
    const oil = finalBatch * strength / 100;
    const alcohol = finalBatch - oil;
    const formulaMass = selected?.items.reduce((sum, item) => sum + item.weightGrams, 0) || 1;
    const rawCost = selected?.items.reduce((sum, item) => {
      const ingredient = ingredients.data?.find((entry) => entry.id === item.ingredientId);
      return sum + (item.weightGrams / formulaMass) * oil * (ingredient?.costPerGram ?? 0);
    }, 0) ?? 0;
    return { finalBatch, strength, oil, alcohol, rawCost, formulaMass };
  }, [batch, concentration, ingredients.data, selected]);

  return <View style={styles.root} testID="calculator-screen"><ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: usesNativeTabs ? insets.bottom + 24 : 28 }]} showsVerticalScrollIndicator={false}><Text style={styles.eyebrow}>Production / Calculator</Text><Text style={styles.title}>Scale a batch</Text><Text style={styles.intro}>Translate a lab trial into a repeatable production weight. The calculator keeps oil, alcohol, and material cost (HPP) visible in Rupiah.</Text><Text style={styles.label}>Source formula</Text>{formulas.isLoading ? <View style={styles.loading}><ActivityIndicator color={colors.brand} /></View> : formulas.data?.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>{formulas.data.map((formula) => <Pressable testID={`calculator-formula-pill-${formula.id}`} key={formula.id} onPress={() => setSelectedId(formula.id)} style={[styles.pill, (selected?.id === formula.id) && styles.pillActive]}><Text style={[styles.pillText, selected?.id === formula.id && styles.pillTextActive]}>{formula.title}</Text></Pressable>)}</ScrollView> : <Text style={styles.empty}>Create a formula first, then return here to scale it.</Text>}
    <View style={styles.panel}><Text style={styles.label}>Target batch</Text><View style={styles.inputRow}><View style={styles.inputWrap}><TextInput testID="calculator-batch-input" value={batch} onChangeText={setBatch} keyboardType="decimal-pad" style={styles.input} /><Text style={styles.suffix}>grams final weight</Text></View><View style={styles.inputWrap}><TextInput testID="calculator-concentration-input" value={concentration} onChangeText={setConcentration} keyboardType="decimal-pad" style={styles.input} /><Text style={styles.suffix}>% fragrance oil</Text></View></View></View>
    {selected ? <View style={styles.panel} testID="calculator-breakdown-panel"><View style={styles.resultHeader}><Text style={styles.resultTitle}>Batch breakdown</Text><Text style={styles.resultBadge}>{calculations.strength}% / {100 - calculations.strength}%</Text></View><View style={styles.resultRow}><Text style={styles.resultLabel}>Fragrance concentrate</Text><Text style={styles.resultValue} testID="calculator-result-oil">{formatGrams(calculations.oil)} g</Text></View><View style={styles.resultRow}><Text style={styles.resultLabel}>Perfumer&apos;s alcohol</Text><Text style={styles.resultValue} testID="calculator-result-alcohol">{formatGrams(calculations.alcohol)} g</Text></View><View style={styles.resultRow}><Text style={styles.resultLabel}>Water / modifiers</Text><Text style={styles.resultValue}>0.000 g</Text></View><View style={styles.total}><View><Text style={styles.totalLabel}>Total batch weight</Text><Text style={styles.hint}>{selected.title} · {selected.version}</Text></View><Text style={styles.totalValue} testID="calculator-result-total">{formatGrams(calculations.finalBatch)} g</Text></View></View> : null}
    {selected ? <View style={styles.panel}><View style={styles.resultHeader}><Text style={styles.resultTitle}>Cost estimate (HPP)</Text><Ionicons name="pricetag-outline" size={18} color={colors.brand} /></View><View style={styles.resultRow}><Text style={styles.resultLabel}>Raw material cost</Text><Text style={styles.cost} testID="calculator-result-cost">{formatIDR(calculations.rawCost)}</Text></View><Text style={styles.hint}>Excludes alcohol, packaging, labor, and overhead. Based on {formatGrams(calculations.oil)} g fragrance concentrate at IDR material prices.</Text></View> : null}
  </ScrollView></View>;
}
