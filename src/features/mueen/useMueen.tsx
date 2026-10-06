/**
 * Mu'een orchestration for the chat screen (Figma v2). Owns selection mode,
 * the draft sheet (edits, quote, new-message banner, regenerate), the
 * citations sheet and the send flow, and hands the screen ready slots
 * (header / footer / chip / overlays) plus the long-press action, so the chat
 * screen only wires a few lines.
 *
 * Drafting UI is scholar-only in an active question chat; the citations
 * sheet works for everyone (the asker taps sources in the answer bubble).
 * State that depends on another value is derived, never synced in effects.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { PILL_TOAST_OFFSET } from "@/components/PillToast";
import { useTheme } from "@/hooks/use-theme";
import { useT } from "@/i18n/useT";
import { qk } from "@/lib/query-keys";
import type { MessageWithSender } from "@/shared/types/questions";
import type { LocalMessage } from "@/features/chat/types";
import type { MessageAction } from "@/features/chat/components/MessageActionsOverlay";
import { MueenCitationsSheet } from "./components/MueenCitationsSheet";
import { MueenDraftChip } from "./components/MueenDraftChip";
import { MueenDraftSheet } from "./components/MueenDraftSheet";
import { MueenIcon } from "./components/MueenIcon";
import { isAskerText } from "./components/MueenRow";
import {
  MueenSelectionFooter,
  MueenSelectionHeader,
  type SelectionPartner,
} from "./components/MueenSelectionBars";
import { scopeKey, useMueenDraft } from "./hooks/useMueenDraft";
import { useSendMueenAnswer } from "./hooks/useSendMueenAnswer";
import { type ActiveCitation, type MueenContextValue } from "./MueenContext";
import {
  applyEdits,
  barState,
  buildInputMessages,
  hasRealEdits,
  latestAskerText,
  needsAnswer as computeNeedsAnswer,
  pickQuote,
} from "./state";
import type { MueenParagraph, MueenScope } from "./types";

const ALL: MueenScope = { kind: "all" };
/** Wait for the sheet's close animation before moving focus to the composer. */
const SHEET_CLOSE_MS = 260;

export function useMueen({
  questionId,
  draftingEnabled,
  question,
  messages,
  partner,
  userId,
  currentUserName,
  avatarUrl,
  updateMessagesCache,
  closeActions,
  focusComposer,
}: {
  questionId: string | null;
  draftingEnabled: boolean;
  question: { title: string; description: string | null } | null | undefined;
  /** Newest first, as rendered by the inverted chat list. */
  messages: LocalMessage[];
  /** The asker, for the selection header and the quote's name. */
  partner: SelectionPartner;
  userId: string | undefined;
  currentUserName: string;
  avatarUrl: string | null;
  updateMessagesCache: (updater: (prev: LocalMessage[]) => LocalMessage[]) => void;
  closeActions: () => void;
  focusComposer: () => void;
}) {
  const c = useTheme();
  const { t } = useT("mueen");
  const queryClient = useQueryClient();

  const [selectingRaw, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [sheetOpenRaw, setSheetOpen] = useState(false);
  const [scope, setScope] = useState<MueenScope>(ALL);
  const [activeCitation, setActiveCitation] = useState<ActiveCitation | null>(null);
  /** The scholar's edits, keyed to the draft they were made on. */
  const [edits, setEdits] = useState<{ draftId: string; map: Record<string, string> } | null>(null);
  /** Scope (key) whose quote the scholar removed with ✕. */
  const [quoteRemovedFor, setQuoteRemovedFor] = useState<string | null>(null);
  /** Dismissed while the asker's latest message was this one → minimized bar. */
  const [dismissedAt, setDismissedAt] = useState<string | null | undefined>(undefined);
  /** Asker's latest message when the sheet opened / the draft was refreshed. */
  const [bannerBaseline, setBannerBaseline] = useState<string | null | undefined>(undefined);
  const [bannerHiddenFor, setBannerHiddenFor] = useState<string | null>(null);

  // Leaving drafting (chat closed / transferred) drops any Mu'een mode.
  const selecting = draftingEnabled && selectingRaw;
  const sheetOpen = draftingEnabled && sheetOpenRaw;

  const inputMessages = useMemo(() => buildInputMessages(messages, question), [messages, question]);
  const needsAnswer = useMemo(() => computeNeedsAnswer(messages, !!question?.title), [messages, question]);
  const latestAskerId = latestAskerText(messages)?.id ?? null;

  const barVisible = draftingEnabled && !selecting && needsAnswer;
  const allDraft = useMueenDraft({
    questionId,
    question: question ?? null,
    messages: inputMessages,
    scope: ALL,
    // Drafts on request only: opening the sheet starts it, never entering the chat.
    // A draft still running when the sheet closes finishes and stays cached.
    enabled: draftingEnabled && sheetOpen && scope.kind === "all",
  });
  const scopedDraft = useMueenDraft({
    questionId,
    question: question ?? null,
    messages: inputMessages,
    scope,
    enabled: draftingEnabled && sheetOpen && scope.kind === "selected",
  });
  const sheetDraft = scope.kind === "all" ? allDraft : scopedDraft;
  const draft = sheetDraft.draft;

  const editMap = useMemo(
    () => (draft && edits?.draftId === draft.id ? edits.map : {}),
    [draft, edits],
  );
  const paragraphs = useMemo(() => (draft ? applyEdits(draft.paragraphs, editMap) : null), [draft, editMap]);
  const hasEdits = !!draft && hasRealEdits(draft.paragraphs, editMap);

  const quoteMessage =
    scope.kind === "selected" && quoteRemovedFor !== scopeKey(scope)
      ? pickQuote(messages, scope.messageIds)
      : null;

  const { send, sending } = useSendMueenAnswer({
    questionId,
    userId,
    currentUserName,
    avatarUrl,
    updateMessagesCache,
  });

  const startSelection = useCallback((preselect: string[]) => {
    setSheetOpen(false);
    setSelectedIds(new Set(preselect));
    setSelecting(true);
  }, []);
  const cancelSelection = useCallback(() => {
    setSelecting(false);
    setSelectedIds(new Set());
  }, []);
  const openSheet = useCallback(
    (next: MueenScope) => {
      setScope(next);
      setSelecting(false);
      setSheetOpen(true);
      setBannerBaseline(latestAskerId);
    },
    [latestAskerId],
  );

  // Android back leaves selection mode instead of the chat.
  useEffect(() => {
    if (!selecting) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      cancelSelection();
      return true;
    });
    return () => sub.remove();
  }, [selecting, cancelSelection]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openCitations = useCallback((ownerId: string, paragraph: MueenParagraph) => {
    setActiveCitation({ ownerId, paragraph });
  }, []);

  const regenerate = useCallback(() => {
    setBannerBaseline(latestAskerId);
    sheetDraft.regenerate();
  }, [latestAskerId, sheetDraft]);

  /** "تحديث المسودة": redraft including the asker's new message. */
  const updateForNewMessage = useCallback(() => {
    setBannerBaseline(latestAskerId);
    if (scope.kind === "selected" && latestAskerId && !scope.messageIds.includes(latestAskerId)) {
      setScope({ kind: "selected", messageIds: [...scope.messageIds, latestAskerId] });
      return;
    }
    sheetDraft.regenerate();
  }, [latestAskerId, scope, sheetDraft]);

  // Drafts are dropped once the sheet has finished closing after a send —
  // clearing them mid-animation would flash a skeleton and re-draft for nothing.
  const sentRef = useRef(false);
  const handleSend = useCallback(async () => {
    if (!draft || !paragraphs) return false;
    const done = await send(draft.id, paragraphs, quoteMessage);
    if (done) sentRef.current = true;
    return done;
  }, [draft, paragraphs, quoteMessage, send]);

  const handleSheetClosed = useCallback(() => {
    setSheetOpen(false);
    if (sentRef.current) {
      sentRef.current = false;
      queryClient.removeQueries({ queryKey: qk.mueen.draftAll(questionId) });
      setScope(ALL);
      setEdits(null);
      setQuoteRemovedFor(null);
      setDismissedAt(undefined);
      return;
    }
    // Dismissed: keep the draft and its edits; the bar shrinks to an icon (19).
    setDismissedAt(latestAskerId);
    if (hasEdits) {
      Toast.show({
        type: "check",
        text1: t("toast.editsSaved"),
        position: "bottom",
        bottomOffset: PILL_TOAST_OFFSET,
      });
    }
  }, [queryClient, questionId, latestAskerId, hasEdits, t]);

  const menuActionFor = useCallback(
    (message: MessageWithSender | null): MessageAction | null => {
      if (!draftingEnabled || !message || !isAskerText(message)) return null;
      return {
        key: "mueen",
        label: t("menu.replyWithMueen"),
        icon: "create-outline",
        iconNode: <MueenIcon size={19} color={c.mueen} />,
        tone: "mueen",
        onPress: () => {
          closeActions();
          startSelection([message.id]);
        },
      };
    },
    [draftingEnabled, t, c.mueen, closeActions, startSelection],
  );

  const context = useMemo<MueenContextValue>(
    () => ({ draftingEnabled, selecting, selectedIds, toggleSelected, activeCitation, openCitations }),
    [draftingEnabled, selecting, selectedIds, toggleSelected, activeCitation, openCitations],
  );

  const state = barState({
    minimized: dismissedAt !== undefined && dismissedAt === latestAskerId,
    loading: allDraft.isLoading || allDraft.isRegenerating,
    error: allDraft.isError,
    noSources: allDraft.draft?.status === "no_sources",
    hasDraft: !!allDraft.draft,
  });
  const showNewMessage =
    sheetOpen &&
    bannerBaseline !== undefined &&
    latestAskerId !== bannerBaseline &&
    bannerHiddenFor !== latestAskerId;

  return {
    context,
    selecting,
    menuActionFor,
    header: selecting ? <MueenSelectionHeader partner={partner} onCancel={cancelSelection} /> : null,
    footer: selecting ? (
      <MueenSelectionFooter
        count={selectedIds.size}
        onDraftSelected={() => openSheet({ kind: "selected", messageIds: [...selectedIds] })}
        onDraftAll={() => openSheet(ALL)}
      />
    ) : null,
    chip:
      barVisible && allDraft.hasInput ? (
        <MueenDraftChip
          state={state}
          onPress={() => {
            if (state === "error") allDraft.regenerate();
            // The minimized bar reopens the dismissed draft, edits and all.
            openSheet(state === "minimized" ? scope : ALL);
          }}
        />
      ) : null,
    overlays: (
      <>
        {draftingEnabled ? (
          <MueenDraftSheet
            visible={sheetOpen}
            onClose={handleSheetClosed}
            scope={scope}
            draft={draft}
            paragraphs={paragraphs}
            onChangeParagraph={(id, text) => {
              if (!draft) return;
              setEdits((prev) => ({
                draftId: draft.id,
                map: { ...(prev?.draftId === draft.id ? prev.map : {}), [id]: text },
              }));
            }}
            hasEdits={hasEdits}
            loading={sheetDraft.isLoading}
            regenerating={sheetDraft.isRegenerating}
            errorKind={sheetDraft.errorKind}
            empty={!sheetDraft.hasInput}
            onRegenerate={regenerate}
            onPickMessages={() => startSelection(scope.kind === "selected" ? scope.messageIds : [])}
            quote={
              quoteMessage
                ? {
                    name: partner.name || quoteMessage.sender_name,
                    preview: quoteMessage.content,
                  }
                : null
            }
            onRemoveQuote={() => setQuoteRemovedFor(scopeKey(scope))}
            showNewMessage={showNewMessage}
            onUpdateForNewMessage={updateForNewMessage}
            onHideNewMessage={() => setBannerHiddenFor(latestAskerId)}
            onSend={handleSend}
            sending={sending}
            onWriteMyself={() => setTimeout(focusComposer, SHEET_CLOSE_MS)}
          />
        ) : null}
        <MueenCitationsSheet
          paragraph={activeCitation?.paragraph ?? null}
          onClose={() => setActiveCitation(null)}
        />
      </>
    ),
  };
}
