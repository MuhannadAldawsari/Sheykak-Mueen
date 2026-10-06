import { mockMueenService } from "../api/mock-service";
import { countDistinctSources } from "../payload";
import { MueenDraftError, type MueenDraftRequest } from "../types";
import { isOnline } from "@/lib/network";

jest.mock("@/lib/network", () => ({ isOnline: jest.fn(async () => true) }));

const messages = [
  { id: "m1", text: "شكرًا لك. وسؤال آخر: هل يؤمن المسلمون أن عيسى صُلب؟", fromAsker: true },
  { id: "m2", text: "وهل تحترمون أمّه مريم؟", fromAsker: true },
  { id: "m3", text: "حيّاك الله", fromAsker: false },
  { id: "m4", text: "هذه رسالة اختبار", fromAsker: true },
];

const request = (scope: MueenDraftRequest["scope"]): MueenDraftRequest => ({
  questionId: "q1",
  question: { title: "ما نظرة الإسلام إلى عيسى عليه السلام؟", description: null },
  messages,
  scope,
});

async function generate(scope: MueenDraftRequest["scope"]) {
  const pending = mockMueenService.generateDraft(request(scope));
  await jest.runAllTimersAsync();
  return pending;
}

describe("mock Mu'een service", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("drafts the whole conversation with a source behind every paragraph", async () => {
    const draft = await generate({ kind: "all" });
    expect(draft.status).toBe("ok");
    expect(draft.paragraphs).toHaveLength(5);
    expect(draft.paragraphs.every((p) => p.sources.length > 0)).toBe(true);
    expect(countDistinctSources(draft.paragraphs)).toBe(6);
    expect(draft.textMessageCount).toBe(3);
  });

  it("uses the v2 source kinds", async () => {
    const draft = await generate({ kind: "all" });
    const kinds = new Set(draft.paragraphs.flatMap((p) => p.sources.map((s) => s.kind)));
    expect([...kinds].sort()).toEqual(["book", "hadith", "quran"]);
  });

  it("keeps only the paragraphs relevant to the selected messages", async () => {
    const draft = await generate({ kind: "selected", messageIds: ["m1", "m2"] });
    expect(draft.paragraphs.map((p) => p.id)).toEqual(["p4", "p5"]);
    expect(countDistinctSources(draft.paragraphs)).toBe(2);
    expect(draft.textMessageCount).toBe(2);
  });

  it("answers no_sources instead of an unsourced draft", async () => {
    expect((await generate({ kind: "selected", messageIds: ["m3"] })).status).toBe("no_sources");
    const trigger = await generate({ kind: "selected", messageIds: ["m1", "m4"] });
    expect(trigger.status).toBe("no_sources");
    expect(trigger.paragraphs).toEqual([]);
  });

  it("fails with an offline error when there is no connection", async () => {
    (isOnline as jest.Mock).mockResolvedValueOnce(false);
    await expect(mockMueenService.generateDraft(request({ kind: "all" }))).rejects.toEqual(
      new MueenDraftError("offline"),
    );
  });

  it("returns a fresh draft id on every generation", async () => {
    const a = await generate({ kind: "all" });
    const b = await generate({ kind: "all" });
    expect(a.id).not.toBe(b.id);
  });
});
