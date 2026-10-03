// Lab sheet engine: shared composition math, IFRA evaluation, drops conversion, and
// CSV / printable-HTML export for a formula. Used by the formula builder screen for
// live calculations and by the export actions for the printable lab sheet.
// Conventions: weights at 0.001 g precision, costs in Indonesian Rupiah (IDR).

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform, Share } from "react-native";

import { FormulaItem, Ingredient } from "@/src/api";
import { DEFAULT_DROP_WEIGHT_GRAMS, formatIDR, gramsToDrops } from "@/src/format";

export type LabSheetInput = {
  title: string;
  version: string;
  targetConcentration: number;
  items: FormulaItem[];
  notes?: string | null;
};

export type LabSheetRow = {
  itemId: string;
  name: string;
  casNumber: string;
  noteType: string;
  weightGrams: number;
  drops: number;
  dropWeightGrams: number;
  formulaPercentage: number;
  pureGrams: number;
  finishedPercentage: number;
  cost: number;
  ifraLimit: number | null;
  ifraExceeded: boolean;
};

export type LabSheet = {
  title: string;
  version: string;
  date: string;
  targetConcentration: number;
  notes: string;
  rows: LabSheetRow[];
  totalGrams: number;
  totalCost: number;
  balance: { Top: number; Heart: number; Base: number };
  exceeded: LabSheetRow[];
};

// Finished-product percentage = (pure material weight / total concentrate) x target strength.
// This is the figure IFRA limits are evaluated against.
export function buildLabSheet(input: LabSheetInput, ingredients: Ingredient[]): LabSheet {
  const totalGrams = input.items.reduce((sum, item) => sum + item.weightGrams, 0);
  const balance = { Top: 0, Heart: 0, Base: 0 };
  const rows: LabSheetRow[] = input.items.map((item) => {
    const ingredient = ingredients.find((entry) => entry.id === item.ingredientId);
    const pureGrams = (item.weightGrams * item.dilutionPercentage) / 100;
    const formulaPercentage = totalGrams > 0 ? (item.weightGrams / totalGrams) * 100 : 0;
    const finishedPercentage = totalGrams > 0 ? (pureGrams / totalGrams) * input.targetConcentration : 0;
    const ifraLimit = ingredient?.ifraLimitPercentage ?? null;
    const dropWeightGrams = ingredient?.dropWeightGrams ?? DEFAULT_DROP_WEIGHT_GRAMS;
    if (ingredient?.noteType === "Top" || ingredient?.noteType === "Heart" || ingredient?.noteType === "Base") {
      balance[ingredient.noteType] += item.weightGrams;
    }
    return {
      itemId: item.id,
      name: ingredient?.name ?? "Unknown material",
      casNumber: ingredient?.casNumber ?? "—",
      noteType: ingredient?.noteType ?? "—",
      weightGrams: item.weightGrams,
      drops: gramsToDrops(item.weightGrams, dropWeightGrams),
      dropWeightGrams,
      formulaPercentage,
      pureGrams,
      finishedPercentage,
      cost: item.weightGrams * (ingredient?.costPerGram ?? 0),
      ifraLimit,
      ifraExceeded: ifraLimit != null && finishedPercentage > ifraLimit,
    };
  });
  const scale = totalGrams > 0 ? 100 / totalGrams : 0;
  return {
    title: input.title,
    version: input.version,
    date: new Date().toISOString(),
    targetConcentration: input.targetConcentration,
    notes: input.notes ?? "",
    rows,
    totalGrams,
    totalCost: rows.reduce((sum, row) => sum + row.cost, 0),
    balance: { Top: balance.Top * scale, Heart: balance.Heart * scale, Base: balance.Base * scale },
    exceeded: rows.filter((row) => row.ifraExceeded),
  };
}

const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

export function labSheetToCsv(sheet: LabSheet): string {
  const header = [
    "Material", "CAS", "Note", "Weight (g)", "Drops", "% of concentrate",
    "Pure weight (g)", "% in finished product", "IFRA max %", "IFRA status", "Cost (IDR)",
  ];
  const lines = sheet.rows.map((row) => [
    csvEscape(row.name),
    csvEscape(row.casNumber),
    row.noteType,
    row.weightGrams.toFixed(3),
    row.drops.toFixed(1),
    row.formulaPercentage.toFixed(2),
    row.pureGrams.toFixed(3),
    row.finishedPercentage.toFixed(3),
    row.ifraLimit != null ? row.ifraLimit.toFixed(2) : "",
    row.ifraLimit == null ? "Not recorded" : row.ifraExceeded ? "EXCEEDED" : "OK",
    csvEscape(formatIDR(row.cost)),
  ].join(","));
  return [
    csvEscape(`AromaForm Lab Sheet - ${sheet.title} ${sheet.version}`),
    `Date,${sheet.date.slice(0, 10)}`,
    `Target concentration,${sheet.targetConcentration}%`,
    "",
    header.join(","),
    ...lines,
    "",
    `Total concentrate (g),${sheet.totalGrams.toFixed(3)}`,
    `HPP (raw material cost),${csvEscape(formatIDR(sheet.totalCost))}`,
    csvEscape(`Note balance: Top ${sheet.balance.Top.toFixed(0)}% / Heart ${sheet.balance.Heart.toFixed(0)}% / Base ${sheet.balance.Base.toFixed(0)}%`),
    sheet.notes ? `Notes,${csvEscape(sheet.notes)}` : "",
  ].filter((line) => line !== "").join("\n");
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function labSheetToHtml(sheet: LabSheet): string {
  const rows = sheet.rows.map((row) => `
    <tr>
      <td><strong>${escapeHtml(row.name)}</strong><br/><span class="muted">${escapeHtml(row.casNumber)}</span></td>
      <td>${row.noteType}</td>
      <td class="num">${row.weightGrams.toFixed(3)}</td>
      <td class="num">${row.drops.toFixed(1)}</td>
      <td class="num">${row.formulaPercentage.toFixed(2)}%</td>
      <td class="num">${row.finishedPercentage.toFixed(3)}%</td>
      <td class="num">${row.ifraLimit != null ? `${row.ifraLimit.toFixed(2)}%` : "—"}</td>
      <td class="${row.ifraLimit == null ? "muted" : row.ifraExceeded ? "bad" : "ok"}">${row.ifraLimit == null ? "—" : row.ifraExceeded ? "EXCEEDED" : "OK"}</td>
      <td class="num">${formatIDR(row.cost)}</td>
    </tr>`).join("");
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(sheet.title)} ${escapeHtml(sheet.version)} — Lab Sheet</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; background: #FBFBF9; color: #252522; margin: 40px; }
  .eyebrow { color: #C5A059; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; font-family: Helvetica, Arial, sans-serif; }
  h1 { font-size: 30px; font-weight: 500; margin: 8px 0 2px; }
  .meta { color: #8B8B84; font-size: 13px; margin-bottom: 28px; font-family: Helvetica, Arial, sans-serif; }
  table { width: 100%; border-collapse: collapse; font-family: Helvetica, Arial, sans-serif; font-size: 13px; }
  th { text-align: left; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #8B8B84; border-bottom: 2px solid #252522; padding: 8px 6px; }
  td { border-bottom: 1px solid #E5E2DA; padding: 9px 6px; vertical-align: top; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .muted { color: #8B8B84; font-size: 11px; }
  .ok { color: #4E785A; font-weight: 700; }
  .bad { color: #B6574A; font-weight: 700; }
  .totals { margin-top: 22px; font-family: Helvetica, Arial, sans-serif; font-size: 13px; }
  .totals div { display: flex; justify-content: space-between; border-top: 1px solid #E5E2DA; padding: 8px 0; }
  .notes { margin-top: 24px; padding: 14px; background: #F3F1EA; font-size: 13px; font-family: Helvetica, Arial, sans-serif; }
  .foot { margin-top: 34px; color: #8B8B84; font-size: 11px; font-family: Helvetica, Arial, sans-serif; }
</style>
</head>
<body>
  <div class="eyebrow">AromaForm / Lab Sheet</div>
  <h1>${escapeHtml(sheet.title)} <span class="muted">${escapeHtml(sheet.version)}</span></h1>
  <div class="meta">Recorded ${sheet.date.slice(0, 10)} · Target strength ${sheet.targetConcentration}% fragrance oil · Weights at 0.001 g · Costs in IDR</div>
  <table>
    <thead><tr><th>Material</th><th>Note</th><th class="num">Weight (g)</th><th class="num">Drops</th><th class="num">% conc.</th><th class="num">% finished</th><th class="num">IFRA max</th><th>IFRA</th><th class="num">Cost</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div><span>Total concentrate</span><strong>${sheet.totalGrams.toFixed(3)} g</strong></div>
    <div><span>HPP (raw material cost)</span><strong>${formatIDR(sheet.totalCost)}</strong></div>
    <div><span>Note balance</span><strong>Top ${sheet.balance.Top.toFixed(0)}% · Heart ${sheet.balance.Heart.toFixed(0)}% · Base ${sheet.balance.Base.toFixed(0)}%</strong></div>
  </div>
  ${sheet.notes ? `<div class="notes"><strong>Lab notes</strong><br/>${escapeHtml(sheet.notes)}</div>` : ""}
  <div class="foot">Composed with AromaForm · IFRA status is evaluated against recorded material limits at the target finished-product strength. Drops use each material's recorded gram-per-drop factor.</div>
</body>
</html>`;
}

const fileSlug = (title: string) => title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "formula";

export async function exportLabSheetCsv(sheet: LabSheet): Promise<void> {
  const csv = labSheetToCsv(sheet);
  const filename = `${fileSlug(sheet.title)}-lab-sheet.csv`;
  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ message: csv, title: filename });
}

export async function exportLabSheetPdf(sheet: LabSheet): Promise<void> {
  const html = labSheetToHtml(sheet);
  if (Platform.OS === "web") {
    const printWindow = window.open("", "_blank");
    if (!printWindow) throw new Error("Allow pop-ups to print the lab sheet.");
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: `${sheet.title} lab sheet` });
}
