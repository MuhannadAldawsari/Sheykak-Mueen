import { numberCitations, sourceNumbers } from "../citations";
import type { MueenParagraph, MueenSource } from "../types";

const quran: MueenSource = { id: "q", kind: "quran", collection: "سورة النساء", reference: "النساء 43", quote: "يا أيها الذين آمنوا" };
const hadith: MueenSource = { id: "h", kind: "hadith", collection: "موسوعة الأحاديث", quote: "لا تقبل صلاة بغير طهور" };
const salah: MueenSource = { id: "d1", kind: "other", collection: "Jamhara dictionary", quote: "الصلاة" };
const wudu: MueenSource = { id: "d2", kind: "other", collection: "Jamhara dictionary", quote: "الوضوء" };

const para = (text: string, sources: MueenSource[]): MueenParagraph => ({ id: "p1", text, sources });

describe("numberCitations", () => {
  it("numbers markers in order of appearance and keeps Quran references", () => {
    const p = numberCitations(
      para(
        "الصلاة (الصلاة) عبادة عظيمة، لا تقبل بغير وضوء (الوضوء)، كما جاء في (حديث). وتوضّح الآية (النساء: 43) الأحكام.",
        [quran, hadith, salah, wudu],
      ),
    );
    expect(p.text).toBe(
      "الصلاة (1) عبادة عظيمة، لا تقبل بغير وضوء (2)، كما جاء في (3). وتوضّح الآية (النساء: 43) الأحكام.",
    );
    // Sheet order = first citation; the Quran card sits where its reference appears.
    expect(p.sources.map((s) => s.id)).toEqual(["d1", "d2", "h", "q"]);
    expect(sourceNumbers(p.sources)).toEqual([1, 2, 3, null]);
  });

  it("gives a source cited twice the same number", () => {
    const p = numberCitations(para("الصلاة (الصلاة) ثم الصلاة (الصلاة)", [salah]));
    expect(p.text).toBe("الصلاة (1) ثم الصلاة (1)");
  });

  it("sends a second generic marker to the next source of that kind", () => {
    const other: MueenSource = { ...hadith, id: "h2", quote: "إنما الأعمال بالنيات" };
    const p = numberCitations(para("أولاً (حديث) وثانياً (حديث)", [hadith, other]));
    expect(p.text).toBe("أولاً (1) وثانياً (2)");
  });

  it("leaves unmatched parentheses and uncited sources alone, uncited last", () => {
    const p = numberCitations(para("وقت الفجر (قبل الشروق) والوضوء (الوضوء)", [salah, wudu]));
    expect(p.text).toBe("وقت الفجر (قبل الشروق) والوضوء (1)");
    expect(p.sources.map((s) => s.id)).toEqual(["d2", "d1"]);
  });

  it("returns the paragraph unchanged when nothing is cited", () => {
    const p = para("نص بلا إشارات", [salah]);
    expect(numberCitations(p)).toBe(p);
  });
});
