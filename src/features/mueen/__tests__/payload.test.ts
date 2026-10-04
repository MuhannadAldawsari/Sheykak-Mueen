import {
  countDistinctSources,
  decodeMueenAnswer,
  encodeMueenAnswer,
  mueenPlainText,
  mueenPreviewText,
} from "../payload";
import type { MueenParagraph } from "../types";

const quran = { id: "q1", kind: "quran" as const, collection: "القرآن", reference: "مريم 30" };
const hadith = {
  id: "d1",
  kind: "dorar" as const,
  collection: "الدرر السنية · الموسوعة الحديثية",
  quote: "«...»",
  grade: "sahih" as const,
};

const paragraphs: MueenParagraph[] = [
  { id: "p1", text: "  الفقرة الأولى  ", sources: [quran] },
  { id: "p2", text: "الفقرة الثانية", sources: [hadith, quran] },
  { id: "p3", text: "   ", sources: [] },
];

describe("mueen payload", () => {
  it("round-trips paragraphs and sources, trimming text and dropping empty paragraphs", () => {
    const decoded = decodeMueenAnswer(encodeMueenAnswer("draft-1", paragraphs));
    expect(decoded?.draftId).toBe("draft-1");
    expect(decoded?.paragraphs.map((p) => p.text)).toEqual(["الفقرة الأولى", "الفقرة الثانية"]);
    expect(decoded?.paragraphs[1].sources[0]).toMatchObject({ kind: "dorar", grade: "sahih" });
  });

  it("rejects plain text, wrong versions and empty answers", () => {
    expect(decodeMueenAnswer("مرحبا")).toBeNull();
    expect(decodeMueenAnswer(JSON.stringify({ v: 2, paragraphs: [{ text: "x" }] }))).toBeNull();
    expect(decodeMueenAnswer(JSON.stringify({ v: 1, paragraphs: [] }))).toBeNull();
    expect(decodeMueenAnswer(null)).toBeNull();
  });

  it("sanitizes unknown source kinds and grades", () => {
    const raw = JSON.stringify({
      v: 1,
      draftId: "d",
      paragraphs: [{ text: "x", sources: [{ collection: "c", kind: "tafsir", grade: "strong" }, { nope: 1 }] }],
    });
    const decoded = decodeMueenAnswer(raw);
    expect(decoded?.paragraphs[0].sources).toHaveLength(1);
    expect(decoded?.paragraphs[0].sources[0]).toMatchObject({ kind: "other", grade: null });
  });

  it("counts a source cited by two paragraphs once", () => {
    expect(countDistinctSources(paragraphs)).toBe(2);
  });

  it("previews the first paragraph and copies all paragraphs as plain text", () => {
    const content = encodeMueenAnswer("d", paragraphs);
    expect(mueenPreviewText(content)).toBe("الفقرة الأولى");
    expect(mueenPreviewText("نص عادي")).toBeNull();
    expect(mueenPlainText(content)).toBe("الفقرة الأولى\n\nالفقرة الثانية");
  });
});
