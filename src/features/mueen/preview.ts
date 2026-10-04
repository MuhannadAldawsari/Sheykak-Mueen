/**
 * Inbox / reply preview for a `mueen` message: its first paragraph, never the
 * raw JSON. Runs outside React (API layer), so it reads i18n directly with an
 * Arabic fallback for the pre-init window (same pattern as formatCallLogPreview).
 */
import { i18n } from "@/i18n";
import { mueenPreviewText } from "./payload";

export function formatMueenAnswerPreview(content: string | null | undefined): string {
  const first = mueenPreviewText(content);
  if (first) return first;
  if (!i18n.isInitialized) return "📖 جواب موثّق بالمراجع";
  return i18n.t("preview.answer", { ns: "mueen", defaultValue: "📖 جواب موثّق بالمراجع" }) as string;
}
