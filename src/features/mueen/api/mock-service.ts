/**
 * Stand-in for the Mu'een RAG backend while the model is being trained.
 * Returns the Figma sample answer after a short "thinking" delay. For a
 * selected-messages draft it keeps only the paragraphs whose topic appears
 * in the picked messages; when none does (or a picked message contains
 * «اختبار» / "test", to demo screen 18) it answers "no_sources". Offline,
 * it fails like the real endpoint would (screen 13).
 */
import { isOnline } from "@/lib/network";
import sample from "./mock-draft.json";
import {
  MueenDraftError,
  type MueenDraft,
  type MueenDraftRequest,
  type MueenParagraph,
  type MueenService,
} from "../types";

const THINKING_MS = 1400;

/** Paragraph id → words that make it relevant to a picked message. */
const TOPICS: Record<string, RegExp> = {
  p1: /نظرة|مكانة|من هو|view of|who is/i,
  p2: /إله|اله|ابن الله|god|son of/i,
  p3: /محمد|الأنبياء|prophet/i,
  p4: /صلب|صُلب|الصلب|crucif/i,
  p5: /مريم|أمه|أمّه|mary|mother/i,
};

/** Demo trigger for the "not enough approved sources" state. */
const NO_SOURCES_TRIGGER = /اختبار|\btest\b/i;

const PARAGRAPHS = sample.paragraphs as MueenParagraph[];

let draftSeq = 0;

function pickParagraphs(request: MueenDraftRequest): MueenParagraph[] {
  if (request.scope.kind === "all") return PARAGRAPHS;
  const picked = new Set(request.scope.messageIds);
  const text = request.messages
    .filter((m) => picked.has(m.id))
    .map((m) => m.text)
    .join(" ");
  if (NO_SOURCES_TRIGGER.test(text)) return [];
  const relevant = PARAGRAPHS.filter((p) => TOPICS[p.id]?.test(text));
  return relevant.map((p, i) =>
    i === 0 && p.id !== "p1" ? { ...p, text: sample.selectedIntro + p.text } : p,
  );
}

export const mockMueenService: MueenService = {
  async generateDraft(request) {
    if (!(await isOnline())) throw new MueenDraftError("offline");
    await new Promise((resolve) => setTimeout(resolve, THINKING_MS));
    const paragraphs = pickParagraphs(request).map((p) => ({ ...p, sources: [...p.sources] }));
    const draft: MueenDraft = {
      id: `mock-draft-${Date.now()}-${++draftSeq}`,
      questionId: request.questionId,
      scope: request.scope,
      status: paragraphs.length > 0 ? "ok" : "no_sources",
      paragraphs,
      textMessageCount:
        request.scope.kind === "selected"
          ? request.scope.messageIds.length
          : request.messages.filter((m) => m.fromAsker).length,
    };
    return draft;
  },
};
