/**
 * Stand-in for the Mu'een RAG backend while the model is being trained.
 * Returns the Figma sample answer after a short "thinking" delay. For a
 * selected-messages draft it keeps only the paragraphs whose topic appears
 * in the picked messages, so the scoped flow (screen 05) behaves sensibly.
 */
import sample from "./mock-draft.json";
import type {
  MueenDraft,
  MueenDraftRequest,
  MueenParagraph,
  MueenService,
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

const PARAGRAPHS = sample.paragraphs as MueenParagraph[];

let draftSeq = 0;

function pickParagraphs(request: MueenDraftRequest): MueenParagraph[] {
  if (request.scope.kind === "all") return PARAGRAPHS;
  const picked = new Set(request.scope.messageIds);
  const text = request.messages
    .filter((m) => picked.has(m.id))
    .map((m) => m.text)
    .join(" ");
  const relevant = PARAGRAPHS.filter((p) => TOPICS[p.id]?.test(text));
  const chosen = relevant.length > 0 ? relevant : PARAGRAPHS.slice(0, 2);
  return chosen.map((p, i) =>
    i === 0 && p.id !== "p1" ? { ...p, text: sample.selectedIntro + p.text } : p,
  );
}

export const mockMueenService: MueenService = {
  async generateDraft(request) {
    await new Promise((resolve) => setTimeout(resolve, THINKING_MS));
    const draft: MueenDraft = {
      id: `mock-draft-${Date.now()}-${++draftSeq}`,
      questionId: request.questionId,
      scope: request.scope,
      paragraphs: pickParagraphs(request).map((p) => ({ ...p, sources: [...p.sources] })),
      textMessageCount:
        request.scope.kind === "selected"
          ? request.scope.messageIds.length
          : request.messages.filter((m) => m.fromAsker).length,
    };
    return draft;
  },
};
