/**
 * Pure rules behind useMueen: what the model reads, whether the asker is
 * still waiting for an answer, which message a selected-messages draft
 * quotes, how the scholar's edits apply, and which state the bar shows.
 * Kept out of the hook so they are testable and render-pure.
 */
import type { MessageWithSender } from "@/shared/types/questions";
import { QUESTION_ITEM_ID } from "./MueenContext";
import type { MueenInputMessage, MueenParagraph } from "./types";

type Question = { title: string; description: string | null } | null | undefined;

/** The question + every text message, oldest first (the list is newest first). */
export function buildInputMessages(messages: MessageWithSender[], question: Question): MueenInputMessage[] {
  const list: MueenInputMessage[] = [];
  if (question?.title) {
    const text = [question.title, question.description].filter(Boolean).join("\n");
    list.push({ id: QUESTION_ITEM_ID, text, fromAsker: true });
  }
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.message_type !== "text" || m.is_deleted || m.sender_type === "system") continue;
    list.push({ id: m.id, text: m.content, fromAsker: m.sender_type === "user" });
  }
  return list;
}

const isAskerText = (m: MessageWithSender) =>
  m.sender_type === "user" && m.message_type === "text" && !m.is_deleted;

/** Newest text message from the asker (the list is newest first). */
export function latestAskerText(messages: MessageWithSender[]): MessageWithSender | null {
  return messages.find(isAskerText) ?? null;
}

/**
 * True until a Mu'een answer is newer than the asker's last text; a new
 * question from the asker brings the bar back. Timestamps are parsed because
 * optimistic ("…Z") and server ("…+00:00") formats differ.
 */
export function needsAnswer(messages: MessageWithSender[], hasQuestion: boolean): boolean {
  const lastAsk = latestAskerText(messages);
  const lastAnswer = messages.find((m) => m.message_type === "mueen" && !m.is_deleted);
  if (!lastAsk) return hasQuestion && !lastAnswer;
  return !lastAnswer || Date.parse(lastAnswer.created_at) < Date.parse(lastAsk.created_at);
}

/** Spec · Quote: one message only — the newest selected message from the asker. */
export function pickQuote(messages: MessageWithSender[], selectedIds: readonly string[]): MessageWithSender | null {
  const picked = new Set(selectedIds);
  return messages.find((m) => picked.has(m.id) && isAskerText(m)) ?? null;
}

/** The draft's paragraphs with the scholar's edits (by paragraph id) applied. */
export function applyEdits(paragraphs: MueenParagraph[], edits: Record<string, string>): MueenParagraph[] {
  return paragraphs.map((p) => (p.id in edits ? { ...p, text: edits[p.id] } : p));
}

/** Did any edit actually change a paragraph? */
export function hasRealEdits(paragraphs: MueenParagraph[], edits: Record<string, string>): boolean {
  return paragraphs.some((p) => p.id in edits && edits[p.id] !== p.text);
}

export type BarState = "loading" | "ready" | "error" | "noSources" | "minimized";

/** Spec · Draft bar states (+ minimized after the sheet was dismissed). Nothing
 *  is drafted until the scholar taps the bar, so "no draft yet" reads as ready. */
export function barState(input: {
  minimized: boolean;
  loading: boolean;
  error: boolean;
  noSources: boolean;
  hasDraft: boolean;
}): BarState {
  if (input.minimized) return "minimized";
  if (input.error) return "error";
  if (input.loading) return "loading";
  return input.hasDraft && input.noSources ? "noSources" : "ready";
}
