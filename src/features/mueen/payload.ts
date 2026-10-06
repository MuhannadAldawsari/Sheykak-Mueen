/**
 * Encode / decode the JSON a `mueen` message stores in `messages.content`.
 * Decoding is defensive: a malformed row degrades to plain text instead of
 * crashing the bubble or leaking JSON into previews.
 */
import type {
  MueenAnswerPayload,
  MueenParagraph,
  MueenSource,
  MueenSourceKind,
} from "./types";

const KINDS: readonly MueenSourceKind[] = ["quran", "hadith", "tafsir", "aqeedah", "dawah", "book", "other"];

/** v1 answers named sources by site; they still decode into v2 kinds. */
const LEGACY_KINDS: Record<string, MueenSourceKind> = { dorar: "hadith", shamela: "book" };

function toKind(raw: unknown): MueenSourceKind {
  if (typeof raw !== "string") return "other";
  if ((KINDS as readonly string[]).includes(raw)) return raw as MueenSourceKind;
  return LEGACY_KINDS[raw] ?? "other";
}

export function encodeMueenAnswer(draftId: string, paragraphs: MueenParagraph[]): string {
  const payload: MueenAnswerPayload = {
    v: 1,
    draftId,
    paragraphs: paragraphs
      .map((p) => ({ ...p, text: p.text.trim() }))
      .filter((p) => p.text.length > 0),
  };
  return JSON.stringify(payload);
}

function toSource(raw: any, index: number): MueenSource | null {
  if (!raw || typeof raw.collection !== "string") return null;
  return {
    id: typeof raw.id === "string" ? raw.id : `s${index}`,
    kind: toKind(raw.kind),
    collection: raw.collection,
    reference: typeof raw.reference === "string" ? raw.reference : undefined,
    quote: typeof raw.quote === "string" ? raw.quote : undefined,
    attribution: typeof raw.attribution === "string" ? raw.attribution : undefined,
    grade: raw.grade === "sahih" || raw.grade === "hasan" || raw.grade === "daif" ? raw.grade : null,
    url: typeof raw.url === "string" ? raw.url : undefined,
  };
}

export function decodeMueenAnswer(content: string | null | undefined): MueenAnswerPayload | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.paragraphs)) return null;
    const paragraphs: MueenParagraph[] = parsed.paragraphs
      .filter((p: any) => p && typeof p.text === "string" && p.text.trim())
      .map((p: any, i: number) => ({
        id: typeof p.id === "string" ? p.id : `p${i}`,
        text: p.text,
        sources: Array.isArray(p.sources)
          ? p.sources.map(toSource).filter((s: MueenSource | null): s is MueenSource => s !== null)
          : [],
      }));
    if (paragraphs.length === 0) return null;
    return { v: 1, draftId: String(parsed.draftId ?? ""), paragraphs };
  } catch {
    return null;
  }
}

/** Distinct sources across all paragraphs (the "N مراجع" count). */
export function countDistinctSources(paragraphs: MueenParagraph[]): number {
  const keys = new Set<string>();
  for (const p of paragraphs) {
    for (const s of p.sources) keys.add(`${s.kind}|${s.collection}|${s.reference ?? s.quote ?? s.id}`);
  }
  return keys.size;
}

/** First paragraph, for inbox previews and reply quotes. Cheap on plain text. */
export function mueenPreviewText(content: string | null | undefined): string | null {
  if (!content || content.charAt(0) !== "{") return null;
  return decodeMueenAnswer(content)?.paragraphs[0]?.text.trim() ?? null;
}

/** Whole answer as plain paragraphs (Copy action). */
export function mueenPlainText(content: string | null | undefined): string | null {
  const payload = decodeMueenAnswer(content);
  return payload ? payload.paragraphs.map((p) => p.text.trim()).join("\n\n") : null;
}
