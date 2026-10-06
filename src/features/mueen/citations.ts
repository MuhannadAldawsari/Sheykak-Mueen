/**
 * Inline citation markers. The Mu'een API writes a source's term or kind in
 * parentheses after the sentence it backs — «الصلاة (الصلاة)», «(حديث)» — which
 * reads as a duplicate. numberCitations turns each marker into the number of
 * its source card, «الصلاة (1)», and orders the paragraph's sources by where
 * they are first cited, so the sheet lists them first to last. Quran markers
 * such as «(النساء: 43)» are kept as written and Quran cards are not numbered.
 * Parentheses that match no source are left alone.
 */
import type { MueenParagraph, MueenSource, MueenSourceKind } from "./types";

const MARKER = /\(([^()]{1,80})\)/g;

/** Generic kind words the API uses as markers. */
const KIND_WORDS: Record<string, MueenSourceKind> = {
  حديث: "hadith",
  الحديث: "hadith",
  "حديث شريف": "hadith",
  تفسير: "tafsir",
  التفسير: "tafsir",
  عقيدة: "aqeedah",
  كتاب: "book",
};

/** Comparable form: no diacritics, no "سورة", no punctuation between words. */
function norm(text: string): string {
  return text
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/^سورة\s+/, "")
    .replace(/[:،,.\-·]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const isQuran = (s: MueenSource) => s.kind === "quran";

function matchesSource(marker: string, s: MueenSource): boolean {
  if (isQuran(s)) return !!s.reference && norm(s.reference) === marker;
  return [s.quote, s.reference, s.collection].some((v) => !!v && norm(v) === marker);
}

export function numberCitations(paragraph: MueenParagraph): MueenParagraph {
  const { sources, text } = paragraph;
  if (sources.length === 0) return paragraph;

  // One pass over the markers: which source each one cites, in text order.
  const cited: number[] = [];
  const hits: { start: number; end: number; index: number }[] = [];
  for (const m of text.matchAll(MARKER)) {
    const marker = norm(m[1]);
    let index = sources.findIndex((s) => matchesSource(marker, s));
    if (index === -1 && KIND_WORDS[marker]) {
      const kind = KIND_WORDS[marker];
      // "(حديث)" twice cites the next hadith source, not the same one again.
      index = sources.findIndex((s, i) => s.kind === kind && !cited.includes(i));
      if (index === -1) index = sources.findIndex((s) => s.kind === kind);
    }
    if (index === -1) continue;
    if (!cited.includes(index)) cited.push(index);
    hits.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, index });
  }
  if (cited.length === 0) return paragraph;

  // Sources in order of first citation; uncited ones keep the API's order at the end.
  const order = [...cited, ...sources.map((_, i) => i).filter((i) => !cited.includes(i))];
  const numberOf = new Map<number, number>();
  let n = 0;
  for (const i of order) if (!isQuran(sources[i])) numberOf.set(i, ++n);

  let out = "";
  let last = 0;
  for (const hit of hits) {
    const num = numberOf.get(hit.index);
    if (num === undefined) continue; // Quran: keep the reference as written
    out += `${text.slice(last, hit.start)}(${num})`;
    last = hit.end;
  }
  out += text.slice(last);

  return { ...paragraph, text: out, sources: order.map((i) => sources[i]) };
}

/** Card numbers for a paragraph's sources (null for Quran), matching numberCitations. */
export function sourceNumbers(sources: MueenSource[]): (number | null)[] {
  let n = 0;
  return sources.map((s) => (isQuran(s) ? null : ++n));
}
