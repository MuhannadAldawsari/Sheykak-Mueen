import {
  applyEdits,
  barState,
  buildInputMessages,
  hasRealEdits,
  latestAskerText,
  needsAnswer,
  pickQuote,
} from "../state";
import { QUESTION_ITEM_ID } from "../MueenContext";
import type { MessageWithSender } from "@/shared/types/questions";
import type { MueenParagraph } from "../types";

let n = 0;
const at = (s: number) => new Date(Date.UTC(2026, 9, 5, 12, 0, s)).toISOString();
function msg(overrides: Partial<MessageWithSender>): MessageWithSender {
  n += 1;
  return {
    id: `m${n}`,
    question_id: "q",
    sender_id: "u",
    sender_type: "user",
    sender_name: "Daniel",
    content: `text ${n}`,
    message_type: "text",
    created_at: at(n),
    is_read: false,
    is_deleted: false,
    deleted_for: [],
    is_edited: false,
    ...overrides,
  } as MessageWithSender;
}

describe("buildInputMessages", () => {
  it("puts the question first and the texts oldest first, skipping media and system rows", () => {
    const older = msg({ content: "first" });
    const voice = msg({ message_type: "audio" });
    const scholar = msg({ sender_type: "scholar", content: "hello" });
    const system = msg({ sender_type: "system" });
    const newest = msg({ content: "second" });
    const input = buildInputMessages([newest, system, scholar, voice, older], {
      title: "Q",
      description: "D",
    });
    expect(input.map((m) => m.id)).toEqual([QUESTION_ITEM_ID, older.id, scholar.id, newest.id]);
    expect(input[0].text).toBe("Q\nD");
    expect(input.find((m) => m.id === scholar.id)?.fromAsker).toBe(false);
  });
});

describe("needsAnswer", () => {
  it("is true until a Mu'een answer is newer than the asker's last text", () => {
    const ask = msg({});
    expect(needsAnswer([ask], true)).toBe(true);
    const answer = msg({ sender_type: "scholar", message_type: "mueen" });
    expect(needsAnswer([answer, ask], true)).toBe(false);
    const followUp = msg({});
    expect(needsAnswer([followUp, answer, ask], true)).toBe(true);
  });

  it("falls back to the question when the asker hasn't written yet", () => {
    expect(needsAnswer([], true)).toBe(true);
    expect(needsAnswer([], false)).toBe(false);
  });
});

describe("pickQuote / latestAskerText", () => {
  it("quotes the newest selected asker text, never a scholar message", () => {
    const a = msg({});
    const s = msg({ sender_type: "scholar" });
    const b = msg({});
    const list = [b, s, a]; // newest first
    expect(pickQuote(list, [a.id, s.id, b.id])?.id).toBe(b.id);
    expect(pickQuote(list, [s.id])).toBeNull();
    expect(latestAskerText(list)?.id).toBe(b.id);
  });
});

describe("edits", () => {
  const paragraphs: MueenParagraph[] = [
    { id: "p1", text: "one", sources: [] },
    { id: "p2", text: "two", sources: [] },
  ];
  it("applies edits by paragraph id and detects real changes", () => {
    expect(applyEdits(paragraphs, { p2: "TWO" }).map((p) => p.text)).toEqual(["one", "TWO"]);
    expect(hasRealEdits(paragraphs, { p2: "TWO" })).toBe(true);
    expect(hasRealEdits(paragraphs, { p2: "two" })).toBe(false);
    expect(hasRealEdits(paragraphs, {})).toBe(false);
  });
});

describe("barState", () => {
  const base = { minimized: false, loading: false, error: false, noSources: false, hasDraft: true };
  it("follows Spec · Draft bar states", () => {
    expect(barState(base)).toBe("ready");
    expect(barState({ ...base, loading: true })).toBe("loading");
    // Drafts start on tap: before that the bar invites, it doesn't spin.
    expect(barState({ ...base, hasDraft: false })).toBe("ready");
    expect(barState({ ...base, error: true })).toBe("error");
    expect(barState({ ...base, noSources: true })).toBe("noSources");
    expect(barState({ ...base, minimized: true, error: true })).toBe("minimized");
  });
});
