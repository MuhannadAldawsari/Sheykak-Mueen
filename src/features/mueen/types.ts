/**
 * Mu'een (معين الداعية) — AI-drafted, source-cited answers for scholars.
 *
 * Every paragraph of a draft carries the sources (dalil) it rests on. The
 * scholar reviews and edits the text, then sends it as a `mueen` message
 * whose `content` is a JSON MueenAnswerPayload (same pattern as call logs).
 */

/** Chip badge per source family: ق Quran, د Dorar (hadith), ش Shamela (books). */
export type MueenSourceKind = "quran" | "dorar" | "shamela" | "other";

/** Hadith grading shown as a pill on the source card. */
export type MueenGrade = "sahih" | "hasan" | "daif";

export interface MueenSource {
  id: string;
  kind: MueenSourceKind;
  /** Source name, e.g. "القرآن" / "الدرر السنية · الموسوعة الحديثية". */
  collection: string;
  /** Short locator for the chip, e.g. "آل عمران 59". */
  reference?: string;
  /** Quoted text (ayah / hadith) or the book title for a book source. */
  quote?: string;
  /** Narration / location line, e.g. "رواه البخاري · كتاب أحاديث الأنبياء". */
  attribution?: string;
  grade?: MueenGrade | null;
  url?: string;
  /** Approved translation of the quote, for askers who don't read Arabic. */
  translation?: string;
}

export interface MueenParagraph {
  id: string;
  text: string;
  sources: MueenSource[];
}

/**
 * How the draft came out. "unverified": it failed the automatic checks (shown, flagged);
 * "abstain" / "refer": no draft — nothing in the approved sources, or out of scope.
 */
export type MueenDraftStatus = "ok" | "unverified" | "abstain" | "refer";

/** Sensitivity level: A settled · B explanation · C disputed · D a personal case. */
export type MueenLevel = "A" | "B" | "C" | "D";

/** What the draft was built from: the whole conversation or picked messages. */
export type MueenScope =
  | { kind: "all" }
  | { kind: "selected"; messageIds: string[] };

export interface MueenDraft {
  id: string;
  questionId: string;
  scope: MueenScope;
  paragraphs: MueenParagraph[];
  /** Text messages the model read (the "· 3 رسائل نصية" hint). */
  textMessageCount: number;
  /** Set by the live service (absent in the mock). */
  status?: MueenDraftStatus;
  level?: MueenLevel;
  /** Arabic note for the scholar: approach, warnings, or why there is no draft. */
  notice?: string;
  /** Claims the automatic checks asked the scholar to review. */
  reviewPoints?: string[];
}

/** Stored in `messages.content` for `message_type = "mueen"`. */
export interface MueenAnswerPayload {
  v: 1;
  draftId: string;
  paragraphs: MueenParagraph[];
}

/** One message handed to the model (text only — voice/images unsupported). */
export interface MueenInputMessage {
  id: string;
  text: string;
  fromAsker: boolean;
}

export interface MueenDraftRequest {
  questionId: string;
  question: { title: string; description: string | null } | null;
  messages: MueenInputMessage[];
  scope: MueenScope;
}

/**
 * The contract the RAG backend will implement. The UI only talks to this
 * interface, so swapping the mock for the real endpoint touches api/index.ts.
 */
export interface MueenService {
  generateDraft(request: MueenDraftRequest): Promise<MueenDraft>;
}
