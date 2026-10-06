/**
 * Mu'een (معين الداعية) — AI-drafted, source-cited answers for scholars.
 *
 * Every paragraph of a draft carries the sources (dalil) it rests on. The
 * scholar reviews and edits the text, then sends it as a `mueen` message
 * whose `content` is a JSON MueenAnswerPayload (same pattern as call logs).
 */

/**
 * Source type (Figma "Spec · Source cards"); each has its pill colour and
 * letter: ق Quran · د hadith · ت tafsir · ع aqeedah · م da'wah topic · ش book.
 */
export type MueenSourceKind = "quran" | "hadith" | "tafsir" | "aqeedah" | "dawah" | "book" | "other";

/** Hadith grading, shown as plain text on the source card. */
export type MueenGrade = "sahih" | "hasan" | "daif";

export interface MueenSource {
  id: string;
  kind: MueenSourceKind;
  /**
   * Where it comes from. Quran: the surah ("سورة مريم"); others: the source
   * ("الدرر السنية · الموسوعة الحديثية", "المكتبة الشاملة").
   */
  collection: string;
  /** Short locator for the pill, e.g. "مريم 30". */
  reference?: string;
  /** Verbatim ayah / hadith text, or the title for a book / topic. */
  quote?: string;
  /**
   * Hadith/Quran/tafsir/aqeedah: the reference chain line ("رواه البخاري · …",
   * "سورة مريم · الآية 30 · نص القرآن: مجمع الملك فهد"). Book/topic: a short description.
   */
  attribution?: string;
  grade?: MueenGrade | null;
  url?: string;
}

export interface MueenParagraph {
  id: string;
  text: string;
  sources: MueenSource[];
}

/** What the draft was built from: the whole conversation or picked messages. */
export type MueenScope =
  | { kind: "all" }
  | { kind: "selected"; messageIds: string[] };

export interface MueenDraft {
  id: string;
  questionId: string;
  scope: MueenScope;
  /** "no_sources": not enough approved references — never an unsourced draft. */
  status: "ok" | "no_sources";
  paragraphs: MueenParagraph[];
  /** Text messages the model read (the "· 3 رسائل نصية" hint). */
  textMessageCount: number;
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

/** Why a draft could not be generated (screen 13 shows the offline case). */
export class MueenDraftError extends Error {
  constructor(public readonly kind: "offline" | "failed", message?: string) {
    super(message ?? kind);
    this.name = "MueenDraftError";
  }
}

/**
 * The contract the RAG backend will implement. The UI only talks to this
 * interface, so swapping the mock for the real endpoint touches api/index.ts.
 * Throw MueenDraftError for failures; return status "no_sources" when the
 * approved references don't support an answer.
 */
export interface MueenService {
  generateDraft(request: MueenDraftRequest): Promise<MueenDraft>;
}
