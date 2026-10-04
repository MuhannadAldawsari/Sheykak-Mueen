/**
 * Sends a reviewed Mu'een draft as one `mueen` message (paragraphs + their
 * sources as JSON). Optimistic like a text send, but online-only: a cited
 * answer is sent deliberately after review, so it is never silently queued.
 * A failed send stays in the thread as a failed bubble; the chat's existing
 * retry path (useRetrySend) resends it with the same type and content.
 */
import { useCallback, useState } from "react";
import Toast from "react-native-toast-message";
import { haptics } from "@/lib/haptics";
import { supabase } from "@/lib/supabase";
import { isOnline } from "@/lib/network";
import { patchCachedMessage, replaceCachedMessage, upsertCachedMessage } from "@/lib/sqlite";
import { sendMessage } from "@/shared/api/questions";
import type { Message } from "@/shared/types/questions";
import type { LocalMessage } from "@/features/chat/types";
import { useT } from "@/i18n/useT";
import { encodeMueenAnswer } from "../payload";
import type { MueenParagraph } from "../types";

export function useSendMueenAnswer({
  questionId,
  userId,
  currentUserName,
  avatarUrl,
  updateMessagesCache,
}: {
  questionId: string | null;
  userId: string | undefined;
  currentUserName: string;
  avatarUrl: string | null;
  updateMessagesCache: (updater: (prev: LocalMessage[]) => LocalMessage[]) => void;
}) {
  const { t } = useT("mueen");
  const [sending, setSending] = useState(false);

  const send = useCallback(
    async (draftId: string, paragraphs: MueenParagraph[]): Promise<boolean> => {
      if (!questionId || !userId) return false;
      if (!(await isOnline())) {
        Toast.show({ type: "error", text1: t("sheet.offline") });
        return false;
      }
      const content = encodeMueenAnswer(draftId, paragraphs);
      const tempId = `local-mueen-${Date.now()}`;
      const optimistic: LocalMessage = {
        id: tempId,
        question_id: questionId,
        client_message_id: tempId,
        sender_id: userId,
        sender_type: "scholar",
        sender_name: currentUserName,
        sender_avatar_url: avatarUrl,
        content,
        message_type: "mueen",
        created_at: new Date().toISOString(),
        is_read: false,
        is_deleted: false,
        deleted_for: [],
        is_edited: false,
        sync_state: "pending",
        upload_state: "done",
        pending: true,
      };

      setSending(true);
      haptics.tap();
      updateMessagesCache((list) => [optimistic, ...list]);
      void upsertCachedMessage(userId, optimistic);

      const result = await sendMessage(supabase, questionId, content, "scholar", "mueen");
      setSending(false);

      if (result.success && result.message) {
        const resolved: LocalMessage = {
          ...(result.message as Message),
          client_message_id: tempId,
          sender_name: currentUserName,
          sender_avatar_url: avatarUrl,
          is_read: false,
          is_deleted: false,
          deleted_for: [],
          is_edited: false,
          sync_state: "synced",
          upload_state: "done",
          pending: false,
          failed: false,
        };
        updateMessagesCache((list) => list.map((m) => (m.id === tempId ? resolved : m)));
        void replaceCachedMessage(userId, tempId, resolved);
        haptics.success();
        return true;
      }

      const lastError = typeof result.message === "string" ? result.message : "mueen_send_failed";
      updateMessagesCache((list) =>
        list.map((m) =>
          m.id === tempId
            ? { ...m, pending: false, failed: true, sync_state: "failed", last_error: lastError }
            : m,
        ),
      );
      void patchCachedMessage(userId, tempId, { sync_state: "failed", last_error: lastError });
      haptics.error();
      Toast.show({ type: "error", text1: t("sheet.sendFailed") });
      // The failed bubble is in the thread with a retry affordance, so the
      // sheet can still close: the answer is not lost.
      return true;
    },
    [questionId, userId, currentUserName, avatarUrl, updateMessagesCache, t],
  );

  return { send, sending };
}
