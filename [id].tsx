import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, Share, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiRequest, Formula, FormulaItem, Ingredient } from "@/src/api";
import { clearDraft, FormulaDraft, loadDraft, saveDraft } from "@/src/drafts";
import { DEFAULT_DROP_WEIGHT_GRAMS, dropsToGrams, formatGrams, formatIDR, gramsToDrops } from "@/src/format";
import { buildLabSheet, exportLabSheetCsv, exportLabSheetPdf } from "@/src/labsheet";
import { makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.divider },
  headerButton: { minWidth: 40, minHeight: 54, justifyContent: "center", alignItems: "center" },
  headerButtonRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "700", flex: 1, textAlign: "center" },
  body: { paddingHorizontal: 20 },
  eyebrow: { color: colors.brand, fontSize: 11, letterSpacing: 1.9, fontWeight: "700", textTransform: "uppercase", marginTop: 22, marginBottom: 8 },
  titleInput: { color: colors.onSurface, fontSize: 28, fontWeight: "500", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.border },
  metaRow: { flexDirection: "row", gap: 10, marginTop: 15 },
  metaInput: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 4, backgroundColor: colors.surfaceSecondary, color: colors.onSurface, paddingHorizontal: 12, fontSize: 14 },
  draftBanner: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: colors.brandTertiary, borderWidth: 1, borderColor: colors.brandSecondary, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 10, marginTop: 16 },
  draftBannerText: { color: colors.onBrandTertiary, fontSize: 12, flex: 1, lineHeight: 17 },
  draftDiscard: { color: colors.onBrandTertiary, fontSize: 12, fontWeight: "700", textDecorationLine: "underline" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 28, marginBottom: 12 },
  sectionTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "600" },
  addButton: { minHeight: 40, paddingHorizontal: 13, borderRadius: 4, backgroundColor: colors.brandTertiary, flexDirection: "row", alignItems: "center", gap: 6 },
  addText: { color: colors.onBrandTertiary, fontSize: 12, fontWeight: "700" },
  row: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 5, padding: 14, marginBottom: 9 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  rowName: { color: colors.onSurface, fontSize: 15, fontWeight: "600", flex: 1 },
  rowCas: { color: colors.muted, fontSize: 11, marginTop: 4 },
  noteBadge: { backgroundColor: colors.surfaceTertiary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginLeft: 8 },
  noteText: { color: colors.onSurfaceTertiary, fontSize: 10, fontWeight: "700" },
  rowBottom: { flexDirection: "row", alignItems: "flex-end", marginTop: 13, gap: 10 },
  weightWrap: { flex: 1 },
  weightHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
  smallLabel: { color: colors.muted, fontSize: 10 },
  unitToggle: { flexDirection: "row", borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: "hidden" },
  unitChip: { paddingHorizontal: 10, minHeight: 24, justifyContent: "center", backgroundColor: colors.surface },
  unitChipActive: { backgroundColor: colors.brandTertiary },
  unitText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  unitTextActive: { color: colors.onBrandTertiary },
  dropsHint: { color: colors.muted, fontSize: 10, marginTop: 5 },
  weightInput: { minHeight: 39, borderWidth: 1, borderColor: colors.border, borderRadius: 3, color: colors.onSurface, backgroundColor: colors.surface, paddingHorizontal: 9, fontSize: 14 },
  rowStat: { width: 64, paddingBottom: 8 },
  statValue: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  statLabel: { color: colors.muted, fontSize: 10, marginTop: 3 },
  warning: { backgroundColor: colors.error, borderRadius: 4, padding: 11, flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 4 },
  warningText: { color: colors.onError, fontSize: 12, lineHeight: 17, flex: 1, fontWeight: "600" },
  safetyPanel: { borderRadius: 4, padding: 13, flexDirection: "row", alignItems: "flex-start", gap: 9, marginTop: 6 },
  safetyText: { fontSize: 12, lineHeight: 17, flex: 1, fontWeight: "600" },
  chart: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, borderRadius: 5, padding: 15 },
  chartBar: { height: 12, backgroundColor: colors.surfaceTertiary, borderRadius: 6, overflow: "hidden", flexDirection: "row", marginTop: 14 },
  chartSegment: { height: "100%" },
  legend: { flexDirection: "row", gap: 15, marginTop: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { color: colors.muted, fontSize: 11 },
  save: { minHeight: 53, backgroundColor: colors.brandPrimary, borderRadius: 4, alignItems: "center", justifyContent: "center", marginTop: 26, marginBottom: 30 },
  saveText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "700" },
  helper: { color: colors.muted, fontSize: 12, marginTop: 10, lineHeight: 18 },
  notice: { color: colors.info, fontSize: 12, marginTop: 10, lineHeight: 17 },
  modal: { flex: 1, backgroundColor: colors.surface },
  modalContent: { paddingHorizontal: 20 },
  modalHeader: { minHeight: 64, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { color: colors.onSurface, fontSize: 21, fontWeight: "600" },
  modalClose: { minHeight: 44, minWidth: 44, alignItems: "flex-end", justifyContent: "center" },
  search: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 4, backgroundColor: colors.surfaceSecondary, color: colors.onSurface, paddingHorizontal: 13, marginBottom: 14, fontSize: 15 },
  ingredientPick: { minHeight: 58, borderBottomWidth: 1, borderBottomColor: colors.divider, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickName: { color: colors.onSurfaceSecondary, fontSize: 14, fontWeight: "600" },
  pickMeta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  sheetCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 5, backgroundColor: colors.surfaceSecondary, padding: 16, marginBottom: 14 },
  sheetTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "600" },
  sheetMeta: { color: colors.muted, fontSize: 12, marginTop: 5, marginBottom: 6 },
  sheetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.divider },
  sheetRowName: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600", flex: 1 },
  sheetRowMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  sheetIfraOk: { color: colors.success, fontSize: 11, fontWeight: "700" },
  sheetIfraBad: { color: colors.error, fontSize: 11, fontWeight: "700" },
  sheetTotal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.borderStrong },
  sheetTotalLabel: { color: colors.muted, fontSize: 12 },
  sheetTotalValue: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  exportButton: { minHeight: 52, borderRadius: 4, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 9, marginTop: 10 },
  exportPrimary: { backgroundColor: colors.brandPrimary },
  exportSecondary: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.borderStrong },
  exportPrimaryText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "700" },
  exportSecondaryText: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  exportError: { color: colors.error, fontSize: 13, marginTop: 12 },
}));

function sameComposition(draft: FormulaDraft, formula: Formula) {
  return draft.title === formula.title
    && draft.version === formula.version
    && draft.targetConcentration === formula.targetConcentration
    && (draft.notes ?? "") === (formula.notes ?? "")
    && JSON.stringify(draft.items) === JSON.stringify(formula.items);
}

export default function FormulaBuilderScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isNew = id === "new";
  const draftId = isNew ? "new" : String(id);
  const [title, setTitle] = useState(isNew ? "Untitled study" : "");
  const [version, setVersion] = useState("v1.0");
  const [targetConcentration, setTargetConcentration] = useState("18");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<FormulaItem[]>([]);
  const [unitByItem, setUnitByItem] = useState<Record<string, "g" | "drops">>({});
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [exportVisible, setExportVisible] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const [exportError, setExportError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const dirty = useRef(false);
  const serverSnapshot = useRef<Formula | null>(null);
  const formula = useQuery({ queryKey: ["formula", id], queryFn: () => apiRequest<Formula>(`/formulas/${id}`), enabled: !isNew });
  const ingredients = useQuery({ queryKey: ["ingredients"], queryFn: () => apiRequest<Ingredient[]>("/ingredients") });

  // Hydration: new formulas restore the device draft; existing formulas restore it only
  // when the draft is newer than the synced record and actually differs from it.
  useEffect(() => {
    if (hydrated) return;
    let cancelled = false;
    const applyDraft = (draft: FormulaDraft) => {
      setTitle(draft.title);
      setVersion(draft.version);
      setTargetConcentration(String(draft.targetConcentration));
      setItems(draft.items);
      setNotes(draft.notes ?? "");
    };
    const applyFormula = (data: Formula) => {
      serverSnapshot.current = data;
      setTitle(data.title);
      setVersion(data.version);
      setTargetConcentration(String(data.targetConcentration));
      setItems(data.items);
      setNotes(data.notes ?? "");
    };
    const hydrate = async () => {
      if (isNew) {
        const draft = await loadDraft("new");
        if (cancelled) return;
        if (draft) {
          applyDraft(draft);
          if (draft.items.length > 0 || draft.title !== "Untitled study") setDraftRestored(true);
        }
        setHydrated(true);
        return;
      }
      if (!formula.data) return;
      const draft = await loadDraft(draftId);
      if (cancelled) return;
      if (draft && draft.savedAt > formula.data.updatedDate && !sameComposition(draft, formula.data)) {
        serverSnapshot.current = formula.data;
        applyDraft(draft);
        setDraftRestored(true);
      } else {
        applyFormula(formula.data);
      }
      setHydrated(true);
    };
    void hydrate();
    return () => { cancelled = true; };
  }, [hydrated, isNew, formula.data, draftId]);

  // Local draft caching: every user edit is persisted on-device so an unsaved formula
  // survives restarts and offline periods. Cleared on a successful save or discard.
  useEffect(() => {
    if (!hydrated || !dirty.current) return;
    saveDraft(draftId, { title, version, targetConcentration: Number(targetConcentration) || 0, items, notes });
  }, [hydrated, draftId, title, version, targetConcentration, items, notes]);

  // Transient notice (e.g. share fell back to clipboard) auto-clears after a few seconds.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const concentration = Number(targetConcentration) || 0;
  const concentrationType = concentration > 20 ? "Extrait" : concentration >= 15 ? "EDP" : concentration >= 5 ? "EDT" : "EDC";
  const sheet = useMemo(
    () => buildLabSheet({ title: title.trim() || "Untitled study", version: version.trim() || "v1.0", targetConcentration: concentration, items, notes }, ingredients.data ?? []),
    [concentration, ingredients.data, items, notes, title, version],
  );
  const filteredIngredients = ingredients.data?.filter((ingredient) => ingredient.name.toLowerCase().includes(pickerSearch.toLowerCase())) ?? [];

  const editTitle = (value: string) => { dirty.current = true; setTitle(value); };
  const editVersion = (value: string) => { dirty.current = true; setVersion(value); };
  const editConcentration = (value: string) => { dirty.current = true; setTargetConcentration(value); };
  const editNotes = (value: string) => { dirty.current = true; setNotes(value); };
  const addIngredient = (ingredient: Ingredient) => { if (items.some((item) => item.ingredientId === ingredient.id)) return; dirty.current = true; setItems((current) => [...current, { id: `item_${Date.now()}`, ingredientId: ingredient.id, weightGrams: 1, dilutionPercentage: 100 }]); setPickerVisible(false); };
  const updateWeight = (itemId: string, value: string) => { dirty.current = true; setItems((current) => current.map((item) => item.id === itemId ? { ...item, weightGrams: Math.max(Number(value) || 0, 0) } : item)); };
  const updateWeightDrops = (itemId: string, value: string, dropWeightGrams: number) => { dirty.current = true; setItems((current) => current.map((item) => item.id === itemId ? { ...item, weightGrams: Math.max(dropsToGrams(Number(value) || 0, dropWeightGrams), 0) } : item)); };
  const setUnit = (itemId: string, unit: "g" | "drops") => setUnitByItem((current) => ({ ...current, [itemId]: unit }));
  const removeItem = (itemId: string) => { dirty.current = true; setItems((current) => current.filter((item) => item.id !== itemId)); };

  const discardDraft = () => {
    dirty.current = false;
    clearDraft(draftId);
    setDraftRestored(false);
    const snapshot = serverSnapshot.current;
    if (snapshot) {
      setTitle(snapshot.title);
      setVersion(snapshot.version);
      setTargetConcentration(String(snapshot.targetConcentration));
      setItems(snapshot.items);
      setNotes(snapshot.notes ?? "");
    } else {
      setTitle("Untitled study");
      setVersion("v1.0");
      setTargetConcentration("18");
      setItems([]);
      setNotes("");
    }
  };

  const save = async () => {
    if (!title.trim() || !items.length) { setSaveError("Add a title and at least one material before saving."); return; }
    setSaveError(""); setSaving(true);
    const payload = { title: title.trim(), version: version.trim() || "v1.0", targetConcentration: concentration, items, notes: notes.trim() || null };
    try {
      const result = await apiRequest<Formula>(isNew ? "/formulas" : `/formulas/${id}`, { method: isNew ? "POST" : "PUT", body: JSON.stringify(payload) });
      dirty.current = false;
      clearDraft(draftId);
      setDraftRestored(false);
      await queryClient.invalidateQueries({ queryKey: ["formulas"] });
      await queryClient.invalidateQueries({ queryKey: ["formula"] });
      router.replace(`/formula/${result.id}`);
    }
    catch (err) { setSaveError(err instanceof Error ? `${err.message} — your draft is cached on this device.` : "Could not save formula. Your draft is cached on this device."); }
    finally { setSaving(false); }
  };
  const shareFormula = async () => {
    const lines = sheet.rows.map((row) => `${row.name}, ${formatGrams(row.weightGrams)}g (${row.drops.toFixed(1)} drops), ${row.formulaPercentage.toFixed(1)}%`);
    const message = `${sheet.title} ${sheet.version}\nTarget concentration: ${concentration}%\n\n${lines.join("\n")}\n\nTotal concentrate: ${formatGrams(sheet.totalGrams)}g · HPP ${formatIDR(sheet.totalCost)}`;
    try {
      await Share.share({ message });
    } catch {
      // navigator.share is unavailable in some desktop/headless browsers — fall back to clipboard.
      try {
        if (Platform.OS === "web" && navigator.clipboard) {
          await navigator.clipboard.writeText(message);
          setNotice("Sharing is not available in this browser — the formula was copied to your clipboard.");
        } else {
          setNotice("Sharing is not available on this device.");
        }
      } catch {
        setNotice("Sharing is not available on this device.");
      }
    }
  };
  const duplicate = async () => { if (isNew) return; const copy = await apiRequest<Formula>(`/formulas/${id}/duplicate`, { method: "POST" }); await queryClient.invalidateQueries({ queryKey: ["formulas"] }); router.push(`/formula/${copy.id}`); };
  const newVersion = async () => { if (isNew) return; const copy = await apiRequest<Formula>(`/formulas/${id}/duplicate?as_version=true`, { method: "POST" }); await queryClient.invalidateQueries({ queryKey: ["formulas"] }); router.push(`/formula/${copy.id}`); };
  const runExport = async (kind: "csv" | "pdf") => {
    setExportError(""); setExporting(kind);
    try {
      if (kind === "csv") await exportLabSheetCsv(sheet);
      else await exportLabSheetPdf(sheet);
      if (Platform.OS === "web" && kind === "csv") setExportVisible(false);
    }
    catch (err) { setExportError(err instanceof Error ? err.message : "Export failed. Try again."); }
    finally { setExporting(null); }
  };

  return <View style={styles.root} testID="formula-screen"><View style={[styles.header, { paddingTop: insets.top }]}><Pressable testID="formula-back-button" onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)"); }} style={styles.headerButton}><Ionicons name="chevron-back" size={24} color={colors.onSurface} /></Pressable><Text style={styles.headerTitle}>{isNew ? "New formula" : "Formula workspace"}</Text><View style={styles.headerButtonRight}><Pressable testID="formula-export-button" onPress={() => { setExportError(""); setExportVisible(true); }} style={styles.headerButton}><Ionicons name="document-text-outline" size={20} color={colors.onSurface} /></Pressable><Pressable testID="formula-share-button" onPress={() => void shareFormula()} style={styles.headerButton}><Ionicons name="share-outline" size={20} color={colors.onSurface} /></Pressable>{!isNew ? <Pressable testID="formula-duplicate-button" onPress={() => void duplicate()} style={styles.headerButton}><Ionicons name="copy-outline" size={20} color={colors.onSurface} /></Pressable> : null}{!isNew ? <Pressable testID="formula-new-version-button" onPress={() => void newVersion()} style={styles.headerButton}><Ionicons name="git-branch-outline" size={20} color={colors.onSurface} /></Pressable> : null}</View></View>
    <KeyboardAwareScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled" bottomOffset={20}>
      <Text style={styles.eyebrow}>Formula / Composition</Text>
      <TextInput testID="formula-title-input" value={title} onChangeText={editTitle} style={styles.titleInput} placeholder="Formula title" placeholderTextColor={colors.muted} />
      {notice ? <Text style={styles.notice} testID="formula-notice">{notice}</Text> : null}
      {draftRestored ? <View style={styles.draftBanner} testID="formula-draft-banner"><Ionicons name="time-outline" size={16} color={colors.onBrandTertiary} /><Text style={styles.draftBannerText}>Unsaved draft restored from this device.</Text><Pressable testID="formula-draft-discard-button" onPress={discardDraft} hitSlop={8}><Text style={styles.draftDiscard}>Discard</Text></Pressable></View> : null}
      <View style={styles.metaRow}><TextInput testID="formula-version-input" value={version} onChangeText={editVersion} style={styles.metaInput} placeholder="Version" placeholderTextColor={colors.muted} /><TextInput testID="formula-concentration-input" value={targetConcentration} onChangeText={editConcentration} style={styles.metaInput} placeholder="Concentration %" placeholderTextColor={colors.muted} keyboardType="decimal-pad" /></View>
      <Text style={styles.helper}>Target strength: {concentrationType} · {concentration}% fragrance oil</Text>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Formula materials</Text><Pressable testID="formula-add-material-button" onPress={() => setPickerVisible(true)} style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.8 }]}><Ionicons name="add" size={16} color={colors.onBrandTertiary} /><Text style={styles.addText}>Add material</Text></Pressable></View>
      {!hydrated || formula.isLoading ? <ActivityIndicator color={colors.brand} /> : items.length ? items.map((item, index) => {
        const row = sheet.rows[index];
        const unit = unitByItem[item.id] ?? "g";
        const dropWeight = row?.dropWeightGrams ?? DEFAULT_DROP_WEIGHT_GRAMS;
        return <View style={styles.row} key={item.id} testID={`formula-item-row-${item.id}`}><View style={styles.rowTop}><View style={{ flex: 1 }}><Text style={styles.rowName}>{row?.name ?? "Unknown material"}</Text><Text style={styles.rowCas}>{row?.casNumber ?? "CAS not recorded"} · {row?.noteType ?? "—"}</Text></View><View style={styles.noteBadge}><Text style={styles.noteText}>{row?.noteType ?? "—"}</Text></View><Pressable testID={`formula-item-remove-${item.id}`} onPress={() => removeItem(item.id)} hitSlop={8} style={{ marginLeft: 10 }}><Ionicons name="close-circle-outline" size={18} color={colors.muted} /></Pressable></View><View style={styles.rowBottom}><View style={styles.weightWrap}><View style={styles.weightHeader}><Text style={styles.smallLabel}>{unit === "g" ? "Weight / grams (0.001)" : "Amount / drops (tetes)"}</Text><View style={styles.unitToggle}><Pressable testID={`formula-unit-g-${item.id}`} onPress={() => setUnit(item.id, "g")} style={[styles.unitChip, unit === "g" && styles.unitChipActive]}><Text style={[styles.unitText, unit === "g" && styles.unitTextActive]}>g</Text></Pressable><Pressable testID={`formula-unit-drops-${item.id}`} onPress={() => setUnit(item.id, "drops")} style={[styles.unitChip, unit === "drops" && styles.unitChipActive]}><Text style={[styles.unitText, unit === "drops" && styles.unitTextActive]}>drops</Text></Pressable></View></View><TextInput testID={`formula-item-weight-${item.id}`} value={unit === "g" ? String(item.weightGrams) : String(gramsToDrops(item.weightGrams, dropWeight))} onChangeText={(value) => unit === "g" ? updateWeight(item.id, value) : updateWeightDrops(item.id, value, dropWeight)} keyboardType="decimal-pad" style={styles.weightInput} /><Text style={styles.dropsHint} testID={`formula-item-conversion-${item.id}`}>{unit === "g" ? `≈ ${gramsToDrops(item.weightGrams, dropWeight)} drops · ${dropWeight} g/drop` : `= ${formatGrams(item.weightGrams)} g · ${dropWeight} g/drop`}</Text></View><View style={styles.rowStat}><Text style={styles.statValue}>{(row?.formulaPercentage ?? 0).toFixed(1)}%</Text><Text style={styles.statLabel}>of formula</Text></View><View style={styles.rowStat}><Text style={styles.statValue}>{(row?.finishedPercentage ?? 0).toFixed(2)}%</Text><Text style={styles.statLabel}>in product</Text></View></View>{row?.ifraExceeded ? <View style={styles.warning} testID={`formula-ifra-warning-${item.id}`}><Ionicons name="alert-circle" size={16} color={colors.onError} /><Text style={styles.warningText}>IFRA limit exceeded — {row.finishedPercentage.toFixed(2)}% in the finished product vs {row.ifraLimit?.toFixed(2)}% recommended maximum.</Text></View> : null}</View>;
      }) : <Text style={styles.helper}>Add materials to begin composing this formula.</Text>}
      {items.length > 0 ? (sheet.exceeded.length ? <View style={[styles.safetyPanel, { backgroundColor: colors.error }]} testID="formula-safety-panel"><Ionicons name="warning-outline" size={17} color={colors.onError} /><Text style={[styles.safetyText, { color: colors.onError }]}>IFRA check: {sheet.exceeded.length} material{sheet.exceeded.length > 1 ? "s" : ""} above the recorded limit at {concentration}% strength — {sheet.exceeded.map((row) => row.name).join(", ")}.</Text></View> : <View style={[styles.safetyPanel, { backgroundColor: colors.success }]} testID="formula-safety-panel"><Ionicons name="checkmark-circle-outline" size={17} color={colors.onSuccess} /><Text style={[styles.safetyText, { color: colors.onSuccess }]}>IFRA check passed — every material is within its recorded limit at {concentration}% strength.</Text></View>) : null}
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Note balance</Text><Text style={styles.helper}>{formatGrams(sheet.totalGrams)} g total</Text></View>
      <View style={styles.chart} testID="formula-note-chart"><Text style={styles.helper}>Aromatic pyramid by formula weight</Text><View style={styles.chartBar}>{(["Top", "Heart", "Base"] as const).map((note) => <View key={note} style={[styles.chartSegment, { width: `${sheet.balance[note]}%`, backgroundColor: note === "Top" ? colors.info : note === "Heart" ? colors.brand : colors.onSurface }]} />)}</View><View style={styles.legend}>{(["Top", "Heart", "Base"] as const).map((note) => <View style={styles.legendItem} key={note}><View style={[styles.dot, { backgroundColor: note === "Top" ? colors.info : note === "Heart" ? colors.brand : colors.onSurface }]} /><Text style={styles.legendText}>{note} {sheet.balance[note].toFixed(0)}%</Text></View>)}</View></View>
      <TextInput testID="formula-notes-input" value={notes} onChangeText={editNotes} style={[styles.metaInput, { marginTop: 14, minHeight: 76, textAlignVertical: "top", paddingTop: 12 }]} placeholder="Add a lab note (optional)" placeholderTextColor={colors.muted} multiline />
      {saveError ? <Text testID="formula-save-error" style={[styles.helper, { color: colors.error }]}>{saveError}</Text> : null}
      <Pressable testID="formula-save-button" onPress={() => void save()} disabled={saving} style={({ pressed }) => [styles.save, pressed && { opacity: 0.8 }, saving && { opacity: 0.6 }]}><Text style={styles.saveText}>{saving ? "Saving formula…" : "Save formula"}</Text></Pressable>
    </KeyboardAwareScrollView>
    <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickerVisible(false)}><View style={styles.modal}><KeyboardAwareScrollView contentContainerStyle={[styles.modalContent, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled" bottomOffset={20}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Choose a material</Text><Pressable testID="formula-picker-close" onPress={() => setPickerVisible(false)} style={styles.modalClose}><Ionicons name="close" size={24} color={colors.onSurface} /></Pressable></View><TextInput testID="formula-picker-search" value={pickerSearch} onChangeText={setPickerSearch} style={styles.search} placeholder="Search your library" placeholderTextColor={colors.muted} autoFocus />{filteredIngredients.map((ingredient) => <Pressable testID={`formula-picker-ingredient-${ingredient.id}`} key={ingredient.id} onPress={() => addIngredient(ingredient)} style={styles.ingredientPick}><View><Text style={styles.pickName}>{ingredient.name}</Text><Text style={styles.pickMeta}>{ingredient.noteType} · {ingredient.category} · {formatIDR(ingredient.costPerGram)}/g · {ingredient.dropWeightGrams ?? DEFAULT_DROP_WEIGHT_GRAMS} g/drop</Text></View><Ionicons name="add-circle-outline" size={22} color={colors.brand} /></Pressable>)}</KeyboardAwareScrollView></View></Modal>
    <Modal visible={exportVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setExportVisible(false)}><View style={styles.modal} testID="lab-sheet-modal"><KeyboardAwareScrollView contentContainerStyle={[styles.modalContent, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]} bottomOffset={20}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Lab sheet</Text><Pressable testID="lab-sheet-close" onPress={() => setExportVisible(false)} style={styles.modalClose}><Ionicons name="close" size={24} color={colors.onSurface} /></Pressable></View>
      <View style={styles.sheetCard}><Text style={styles.sheetTitle}>{sheet.title} · {sheet.version}</Text><Text style={styles.sheetMeta}>Recorded {sheet.date.slice(0, 10)} · {concentration}% target strength · {formatGrams(sheet.totalGrams)} g concentrate</Text>
        {sheet.rows.map((row) => <View style={styles.sheetRow} key={row.itemId}><View style={{ flex: 1 }}><Text style={styles.sheetRowName}>{row.name}</Text><Text style={styles.sheetRowMeta}>{formatGrams(row.weightGrams)} g ≈ {row.drops.toFixed(1)} drops · {row.formulaPercentage.toFixed(1)}% of concentrate · {row.finishedPercentage.toFixed(2)}% in product · {formatIDR(row.cost)}</Text></View><Text style={row.ifraLimit == null ? styles.sheetRowMeta : row.ifraExceeded ? styles.sheetIfraBad : styles.sheetIfraOk}>{row.ifraLimit == null ? "—" : row.ifraExceeded ? "IFRA exceeded" : "IFRA OK"}</Text></View>)}
        <View style={styles.sheetTotal}><Text style={styles.sheetTotalLabel}>HPP (raw materials)</Text><Text style={styles.sheetTotalValue} testID="lab-sheet-cost">{formatIDR(sheet.totalCost)}</Text></View>
        <View style={styles.sheetTotal}><Text style={styles.sheetTotalLabel}>Note balance</Text><Text style={styles.sheetTotalValue}>Top {sheet.balance.Top.toFixed(0)} · Heart {sheet.balance.Heart.toFixed(0)} · Base {sheet.balance.Base.toFixed(0)}</Text></View>
      </View>
      <Pressable testID="lab-sheet-csv-button" onPress={() => void runExport("csv")} disabled={exporting !== null} style={({ pressed }) => [styles.exportButton, styles.exportPrimary, pressed && { opacity: 0.85 }, exporting !== null && { opacity: 0.6 }]}><Ionicons name="download-outline" size={18} color={colors.onBrandPrimary} /><Text style={styles.exportPrimaryText}>{exporting === "csv" ? "Preparing CSV…" : "Export CSV"}</Text></Pressable>
      <Pressable testID="lab-sheet-pdf-button" onPress={() => void runExport("pdf")} disabled={exporting !== null} style={({ pressed }) => [styles.exportButton, styles.exportSecondary, pressed && { opacity: 0.85 }, exporting !== null && { opacity: 0.6 }]}><Ionicons name="print-outline" size={18} color={colors.onSurface} /><Text style={styles.exportSecondaryText}>{exporting === "pdf" ? "Preparing PDF…" : "Print / PDF"}</Text></Pressable>
      {exportError ? <Text testID="lab-sheet-error" style={styles.exportError}>{exportError}</Text> : null}
    </KeyboardAwareScrollView></View></Modal>
  </View>;
}
