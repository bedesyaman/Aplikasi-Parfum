// Shared display formatting: milligram-precision weights, drops conversion, and
// Indonesian Rupiah (IDR) costs. Single source of truth for every screen/table/export.

// Weights are displayed at 0.001 g (1 mg) precision everywhere.
export function formatGrams(value: number): string {
  return value.toFixed(3);
}

// IDR uses "." as the thousands separator and "," for decimals: Rp 150.000,00.
export function formatIDR(value: number): string {
  const [intPart, decPart] = (Math.round(value * 100) / 100).toFixed(2).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp ${grouped},${decPart}`;
}

// Standard drop factor (1 drop = 0.05 g / 50 mg). Each material can override it
// via its dropWeightGrams field.
export const DEFAULT_DROP_WEIGHT_GRAMS = 0.05;

// Drops -> grams, rounded to milligram precision.
export function dropsToGrams(drops: number, dropWeightGrams: number): number {
  return Math.round(drops * dropWeightGrams * 1000) / 1000;
}

// Grams -> drops (tenths of a drop for readability).
export function gramsToDrops(grams: number, dropWeightGrams: number): number {
  if (dropWeightGrams <= 0) return 0;
  return Math.round((grams / dropWeightGrams) * 10) / 10;
}
