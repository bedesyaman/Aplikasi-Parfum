// Local draft caching for the formula builder.
// Drafts persist on-device via the shared storage util (AsyncStorage / IndexedDB on web)
// so an unsaved formula survives app restarts and offline periods. The server stays the
// source of truth; a draft is restored only when it is newer than the synced formula.

import { FormulaItem } from "@/src/api";
import { storage } from "@/src/utils/storage";

export type FormulaDraft = {
  title: string;
  version: string;
  targetConcentration: number;
  items: FormulaItem[];
  notes: string;
  savedAt: string;
};

export type FormulaDraftInput = Omit<FormulaDraft, "savedAt">;

const keyFor = (formulaId: string) => `aromaform_draft_${formulaId}`;

export async function loadDraft(formulaId: string): Promise<FormulaDraft | null> {
  const raw = await storage.getItem(keyFor(formulaId), "");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FormulaDraft;
  } catch {
    return null;
  }
}

export function saveDraft(formulaId: string, draft: FormulaDraftInput): void {
  void storage.setItem(
    keyFor(formulaId),
    JSON.stringify({ ...draft, savedAt: new Date().toISOString() } satisfies FormulaDraft),
  );
}

export function clearDraft(formulaId: string): void {
  void storage.removeItem(keyFor(formulaId));
}
