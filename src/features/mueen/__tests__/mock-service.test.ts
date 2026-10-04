import { mockMueenService } from "../api/mock-service";
import { countDistinctSources } from "../payload";
import type { MueenDraftRequest } from "../types";

const messages = [
  { id: "m1", text: "شكرًا لك. وسؤال آخر: هل يؤمن المسلمون أن عيسى صُلب؟", fromAsker: true },
  { id: "m2", text: "وهل تحترمون أمّه مريم؟", fromAsker: true },
  { id: "m3", text: "حيّاك الله", fromAsker: false },
];

const request = (scope: MueenDraftRequest["scope"]): MueenDraftRequest => ({
  questionId: "q1",
  question: { title: "ما نظرة الإسلام إلى عيسى عليه السلام؟", description: null },
  messages,
  scope,
});

async function generate(scope: MueenDraftRequest["scope"]) {
  const pending = mockMueenService.generateDraft(request(scope));
  jest.runAllTimers();
  return pending;
}

describe("mock Mu'een service", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("drafts the whole conversation with a source behind every paragraph", async () => {
    const draft = await generate({ kind: "all" });
    expect(draft.paragraphs).toHaveLength(5);
    expect(draft.paragraphs.every((p) => p.sources.length > 0)).toBe(true);
    expect(countDistinctSources(draft.paragraphs)).toBe(6);
    expect(draft.textMessageCount).toBe(2);
  });

  it("keeps only the paragraphs relevant to the selected messages", async () => {
    const draft = await generate({ kind: "selected", messageIds: ["m1", "m2"] });
    expect(draft.paragraphs.map((p) => p.id)).toEqual(["p4", "p5"]);
    expect(countDistinctSources(draft.paragraphs)).toBe(2);
    expect(draft.textMessageCount).toBe(2);
  });

  it("returns a fresh draft id on every generation", async () => {
    const a = await generate({ kind: "all" });
    const b = await generate({ kind: "all" });
    expect(a.id).not.toBe(b.id);
  });
});
