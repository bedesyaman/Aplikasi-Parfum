import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiRequest, Ingredient } from "@/src/api";
import { DEFAULT_DROP_WEIGHT_GRAMS, formatIDR } from "@/src/format";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: 20 },
  header: { paddingTop: 20, paddingBottom: 20, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  eyebrow: { color: colors.brand, fontSize: 11, letterSpacing: 2, fontWeight: "700", textTransform: "uppercase", marginBottom: 8 },
  title: { color: colors.onSurface, fontSize: 29, fontWeight: "500", letterSpacing: -0.5 },
  addButton: { width: 44, height: 44, backgroundColor: colors.brandPrimary, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  search: { minHeight: 50, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, borderRadius: 4, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginBottom: 13 },
  searchInput: { flex: 1, color: colors.onSurface, fontSize: 15, marginLeft: 9 },
  filters: { gap: 8, paddingBottom: 20 },
  filter: { paddingHorizontal: 14, minHeight: 36, justifyContent: "center", borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, flexShrink: 0 },
  filterActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandSecondary },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  filterTextActive: { color: colors.onBrandTertiary },
  count: { color: colors.muted, fontSize: 12, marginBottom: 12 },
  card: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 5, padding: 15, marginBottom: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ingredientName: { color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  cas: { color: colors.muted, fontSize: 12, marginTop: 4 },
  note: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, backgroundColor: colors.brandTertiary },
  noteText: { color: colors.onBrandTertiary, fontSize: 11, fontWeight: "700" },
  cardMeta: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.divider, marginTop: 13, paddingTop: 11 },
  meta: { color: colors.muted, fontSize: 12 },
  price: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "700" },
  loading: { padding: 40, alignItems: "center" },
  empty: { color: colors.muted, textAlign: "center", paddingVertical: 30, lineHeight: 21 },
  modal: { flex: 1, backgroundColor: colors.surface },
  modalContent: { paddingHorizontal: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16 },
  modalTitle: { color: colors.onSurface, fontSize: 22, fontWeight: "600" },
  close: { minWidth: 44, minHeight: 44, alignItems: "flex-end", justifyContent: "center" },
  label: { color: colors.onSurfaceSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 7, marginTop: 14 },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 4, backgroundColor: colors.surfaceSecondary, color: colors.onSurface, fontSize: 15, paddingHorizontal: 13 },
  dropHint: { color: colors.muted, fontSize: 11, marginTop: 6, lineHeight: 16 },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  selectRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  select: { minHeight: 38, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 19 },
  selectActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandSecondary },
  selectText: { color: colors.muted, fontSize: 12 },
  selectTextActive: { color: colors.onBrandTertiary, fontWeight: "700" },
  save: { minHeight: 52, backgroundColor: colors.brandPrimary, borderRadius: 4, alignItems: "center", justifyContent: "center", marginTop: 24 },
  saveText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "700" },
  formError: { color: colors.error, fontSize: 13, marginTop: 10 },
}));

const noteTypes = ["All", "Top", "Heart", "Base", "Solvent"];
const categories = ["Citrus", "Floral", "Woody", "Ambery", "Musk", "Gourmand", "Herbal", "Fresh", "Solvent"];

export default function IngredientsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [noteType, setNoteType] = useState("All");
  const [modalVisible, setModalVisible] = useState(false);
  const [formError, setFormError] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Woody");
  const [formNote, setFormNote] = useState("Heart");
  const [cost, setCost] = useState("");
  const [ifra, setIfra] = useState("");
  const [dropWeight, setDropWeight] = useState(String(DEFAULT_DROP_WEIGHT_GRAMS));
  const [saving, setSaving] = useState(false);
  const ingredients = useQuery({ queryKey: ["ingredients", search, noteType], queryFn: () => apiRequest<Ingredient[]>(`/ingredients?search=${encodeURIComponent(search)}${noteType !== "All" ? `&note_type=${noteType}` : ""}`) });

  const save = async () => {
    if (!name.trim() || !cost) { setFormError("Name and cost per gram are required."); return; }
    setFormError(""); setSaving(true);
    const dropWeightValue = Number(dropWeight);
    try { await apiRequest<Ingredient>("/ingredients", { method: "POST", body: JSON.stringify({ name: name.trim(), category, noteType: formNote, costPerGram: Number(cost), ifraLimitPercentage: ifra ? Number(ifra) : null, dropWeightGrams: dropWeightValue > 0 ? dropWeightValue : DEFAULT_DROP_WEIGHT_GRAMS }) }); await queryClient.invalidateQueries({ queryKey: ["ingredients"] }); setModalVisible(false); setName(""); setCost(""); setIfra(""); setDropWeight(String(DEFAULT_DROP_WEIGHT_GRAMS)); }
    catch (err) { setFormError(err instanceof Error ? err.message : "Could not save material"); }
    finally { setSaving(false); }
  };

  return <View style={styles.root} testID="ingredients-screen"><ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top, paddingBottom: usesNativeTabs ? insets.bottom + 24 : 28 }]} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>Materials / Library</Text><Text style={styles.title}>Raw materials</Text></View><Pressable testID="ingredients-add-button" onPress={() => setModalVisible(true)} style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.8 }]}><Ionicons name="add" size={23} color={colors.onBrandPrimary} /></Pressable></View>
    <View style={styles.search}><Ionicons name="search-outline" size={18} color={colors.muted} /><TextInput testID="ingredients-search-input" value={search} onChangeText={setSearch} placeholder="Search by material name" placeholderTextColor={colors.muted} style={styles.searchInput} autoCapitalize="none" /></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{noteTypes.map((note) => <Pressable testID={`ingredient-filter-${note.toLowerCase()}`} key={note} onPress={() => setNoteType(note)} style={[styles.filter, noteType === note && styles.filterActive]}><Text style={[styles.filterText, noteType === note && styles.filterTextActive]}>{note}</Text></Pressable>)}</ScrollView>
    <Text style={styles.count} testID="ingredients-count">{ingredients.data?.length ?? 0} materials in your library</Text>
    {ingredients.isLoading ? <View style={styles.loading}><ActivityIndicator color={colors.brand} /></View> : ingredients.error ? <Text style={styles.empty}>Unable to load your library right now.</Text> : ingredients.data?.length ? ingredients.data.map((ingredient) => <View style={styles.card} key={ingredient.id} testID={`ingredient-card-${ingredient.id}`}><View style={styles.cardTop}><View><Text style={styles.ingredientName}>{ingredient.name}</Text><Text style={styles.cas}>{ingredient.casNumber ?? "CAS not recorded"} · {ingredient.category}</Text></View><View style={styles.note}><Text style={styles.noteText}>{ingredient.noteType}</Text></View></View><View style={styles.cardMeta}><Text style={styles.meta}>{ingredient.supplier ?? "Independent material"} · {ingredient.dropWeightGrams ?? DEFAULT_DROP_WEIGHT_GRAMS} g/drop</Text><Text style={styles.price}>{formatIDR(ingredient.costPerGram)}/g</Text></View></View>) : <Text style={styles.empty}>No materials match your search. Try another note family.</Text>}
  </ScrollView>
  <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}><View style={styles.modal} testID="ingredient-modal"><KeyboardAwareScrollView contentContainerStyle={[styles.modalContent, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled" bottomOffset={20}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Add raw material</Text><Pressable testID="ingredient-modal-close" onPress={() => setModalVisible(false)} style={styles.close}><Ionicons name="close" size={24} color={colors.onSurface} /></Pressable></View><Text style={styles.label}>Material name</Text><TextInput testID="ingredient-name-input" value={name} onChangeText={setName} placeholder="e.g. Orris butter" placeholderTextColor={colors.muted} style={styles.input} /><Text style={styles.label}>Category</Text><View style={styles.selectRow}>{categories.map((item) => <Pressable testID={`ingredient-category-${item.toLowerCase()}`} key={item} onPress={() => setCategory(item)} style={[styles.select, category === item && styles.selectActive]}><Text style={[styles.selectText, category === item && styles.selectTextActive]}>{item}</Text></Pressable>)}</View><Text style={styles.label}>Pyramid note</Text><View style={styles.selectRow}>{["Top", "Heart", "Base", "Solvent"].map((item) => <Pressable testID={`ingredient-note-${item.toLowerCase()}`} key={item} onPress={() => setFormNote(item)} style={[styles.select, formNote === item && styles.selectActive]}><Text style={[styles.selectText, item === formNote && styles.selectTextActive]}>{item}</Text></Pressable>)}</View><View style={styles.row}><View style={styles.half}><Text style={styles.label}>Cost / gram (Rp)</Text><TextInput testID="ingredient-cost-input" value={cost} onChangeText={setCost} placeholder="e.g. 12500" placeholderTextColor={colors.muted} style={styles.input} keyboardType="decimal-pad" /></View><View style={styles.half}><Text style={styles.label}>IFRA max %</Text><TextInput testID="ingredient-ifra-input" value={ifra} onChangeText={setIfra} placeholder="Optional" placeholderTextColor={colors.muted} style={styles.input} keyboardType="decimal-pad" /></View></View><Text style={styles.label}>Grams per drop (tetes)</Text><TextInput testID="ingredient-drop-weight-input" value={dropWeight} onChangeText={setDropWeight} placeholder="0.05" placeholderTextColor={colors.muted} style={styles.input} keyboardType="decimal-pad" /><Text style={styles.dropHint}>Converts drops into weight in the formula builder. Standard: 0.05 g (50 mg) per drop — adjust for thicker materials.</Text>{formError ? <Text testID="ingredient-form-error" style={styles.formError}>{formError}</Text> : null}<Pressable testID="ingredient-save-button" onPress={() => void save()} disabled={saving} style={({ pressed }) => [styles.save, pressed && { opacity: 0.8 }, saving && { opacity: 0.6 }]}><Text style={styles.saveText}>{saving ? "Saving material…" : "Save material"}</Text></Pressable></KeyboardAwareScrollView></View></Modal>
  </View>;
}
