/**
 * Mu'een orchestration for the chat screen. Owns selection mode, the draft
 * sheet, the citations sheet and the send flow, and hands the screen ready
 * slots (header / footer / chip / overlays) plus the long-press action, so
 * the chat screen only wires a few lines.
 *
 * Drafting UI is scholar-only in an active question chat; the citations
 * sheet works for everyone (the asker taps sources in the answer bubble).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
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
import { isMueenSelectable } from "./components/MueenRow";
import { MueenSelectionFooter, MueenSelectionHeader } from "./components/MueenSelectionBars";
import { useMueenDraft } from "./hooks/useMueenDraft";
import { useSendMueenAnswer } from "./hooks/useSendMueenAnswer";
import { QUESTION_ITEM_ID, type ActiveCitation, type MueenContextValue } from "./MueenContext";
import { countDistinctSources } from "./payload";
import type { MueenInputMessage, MueenParagraph, MueenScope } from "./types";

const ALL: MueenScope = { kind: "all" };

export function useMueen({
  questionId,
  draftingEnabled,
  question,
  messages,
  userId,
  currentUserName,
  avatarUrl,
  updateMessagesCache,
  closeActions,
}: {
  questionId: string | null;
  draftingEnabled: boolean;
  question: { title: string; description: string | null } | null | undefined;
  /** Newest first, as rendered by the inverted chat list. */
  messages: LocalMessage[];
  userId: string | undefined;
  currentUserName: string;
  avatarUrl: string | null;
  updateMessagesCache: (updater: (prev: LocalMessage[]) => LocalMessage[]) => void;
  closeActions: () => void;
}) {
  const c = useTheme();
  const { t } = useT("mueen");
  const queryClient = useQueryClient();

  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scope, setScope] = useState<MueenScope>(ALL);
  const [activeCitation, setActiveCitation] = useState<ActiveCitation | null>(null);

  // Model input: the question + text messages, oldest first.
  const inputMessages = useMemo<MueenInputMessage[]>(() => {
    const list: MueenInputMessage[] = [];
    if (question?.title) {
      const text = [question.title, question.description].filter(Boolean).join("\n");
      list.push({ id: QUESTION_ITEM_ID, text, fromAsker: true });
    }
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.message_type !== "text" || m.is_deleted || m.sender_type === "system") continue;
      list.push({ id: m.id, text: m.content, fromAsker: m.sender_type === "user" });
    }
    return list;
  }, [messages, question?.title, question?.description]);

  // The chip hides once a Mu'een answer is newer than the asker's last text,
  // and comes back when the asker writes again. Derived, so it survives relaunch.
  const needsAnswer = useMemo(() => {
    const lastAsk = messages.find((m) => m.sender_type === "user" && m.message_type === "text" && !m.is_deleted);
    const lastAnswer = messages.find((m) => m.message_type === "mueen" && !m.is_deleted);
    if (!lastAsk) return !!question?.title && !lastAnswer;
    // Parse: optimistic ("…Z") and server ("…+00:00") timestamps differ in format.
    return !lastAnswer || Date.parse(lastAnswer.created_at) < Date.parse(lastAsk.created_at);
  }, [messages, question?.title]);

  const chipVisible = draftingEnabled && !selecting && needsAnswer;
  const allDraft = useMueenDraft({
    questionId,
    question: question ?? null,
    messages: inputMessages,
    scope: ALL,
    enabled: draftingEnabled && (chipVisible || (sheetOpen && scope.kind === "all")),
  });
  const scopedDraft = useMueenDraft({
    questionId,
    question: question ?? null,
    messages: inputMessages,
    scope,
    enabled: draftingEnabled && sheetOpen && scope.kind === "selected",
  });
  const sheetDraft = scope.kind === "all" ? allDraft : scopedDraft;

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
  const openSheet = useCallback((next: MueenScope) => {
    setScope(next);
    setSelecting(false);
    setSheetOpen(true);
  }, []);

  // Android back leaves selection mode instead of the chat.
  useEffect(() => {
    if (!selecting) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      cancelSelection();
      return true;
    });
    return () => sub.remove();
  }, [selecting, cancelSelection]);

  // Leaving drafting (chat closed / transferred) drops any Mu'een mode.
  useEffect(() => {
    if (draftingEnabled) return;
    setSelecting(false);
    setSheetOpen(false);
  }, [draftingEnabled]);

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

  // Drafts are dropped once the sheet has finished closing after a send —
  // clearing them mid-animation would flash a skeleton and re-draft for nothing.
  const sentRef = useRef(false);
  const handleSend = useCallback(
    async (draftId: string, paragraphs: MueenParagraph[]) => {
      const done = await send(draftId, paragraphs);
      if (done) sentRef.current = true;
      return done;
    },
    [send],
  );
  const handleSheetClosed = useCallback(() => {
    setSheetOpen(false);
    if (!sentRef.current) return;
    sentRef.current = false;
    queryClient.removeQueries({ queryKey: qk.mueen.draftAll(questionId) });
    setScope(ALL);
  }, [queryClient, questionId]);

  const menuActionFor = useCallback(
    (message: MessageWithSender | null): MessageAction | null => {
      if (!draftingEnabled || !message || !isMueenSelectable(message)) return null;
      return {
        key: "mueen",
        label: t("menu.replyWithMueen"),
        icon: "book-outline",
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

  const selectedCount = selectedIds.size;
  const chipSources = allDraft.draft ? countDistinctSources(allDraft.draft.paragraphs) : 0;

  return {
    context,
    selecting,
    menuActionFor,
    header: selecting ? <MueenSelectionHeader count={selectedCount} onCancel={cancelSelection} /> : null,
    footer: selecting ? (
      <MueenSelectionFooter
        count={selectedCount}
        onDraftSelected={() => openSheet({ kind: "selected", messageIds: [...selectedIds] })}
        onDraftAll={() => openSheet(ALL)}
      />
    ) : null,
    chip: chipVisible && allDraft.hasInput ? (
      <MueenDraftChip
        loading={allDraft.isLoading}
        error={allDraft.isError}
        sourceCount={chipSources}
        onPress={() => {
          if (allDraft.isError) allDraft.regenerate();
          openSheet(ALL);
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
            draft={sheetDraft.draft}
            loading={sheetDraft.isLoading}
            error={sheetDraft.isError}
            empty={!sheetDraft.hasInput}
            onRegenerate={sheetDraft.regenerate}
            onPickMessages={() => startSelection(scope.kind === "selected" ? scope.messageIds : [])}
            onSend={handleSend}
            sending={sending}
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
