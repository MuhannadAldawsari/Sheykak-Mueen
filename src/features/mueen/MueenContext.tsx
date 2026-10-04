/**
 * Screen-level Mu'een state shared with list rows without threading props
 * through the chat's memoized renderItem: selection mode (screen 03) and the
 * paragraph whose citations sheet is open (screen 07, highlighted in place).
 */
import { createContext, useContext } from "react";
import type { MueenParagraph } from "./types";

/** Pseudo message id for the pinned question card in selection mode. */
export const QUESTION_ITEM_ID = "__question__";

export interface ActiveCitation {
  /** Message id of the answer bubble, or "draft" inside the draft sheet. */
  ownerId: string;
  paragraph: MueenParagraph;
}

export interface MueenContextValue {
  /** Scholar, active question chat: drafting UI (chip, captions, menu). */
  draftingEnabled: boolean;
  selecting: boolean;
  selectedIds: ReadonlySet<string>;
  toggleSelected: (id: string) => void;
  activeCitation: ActiveCitation | null;
  openCitations: (ownerId: string, paragraph: MueenParagraph) => void;
}

const noop = () => {};

export const MueenContext = createContext<MueenContextValue>({
  draftingEnabled: false,
  selecting: false,
  selectedIds: new Set(),
  toggleSelected: noop,
  activeCitation: null,
  openCitations: noop,
});

export const MueenProvider = MueenContext.Provider;

export const useMueenContext = () => useContext(MueenContext);
