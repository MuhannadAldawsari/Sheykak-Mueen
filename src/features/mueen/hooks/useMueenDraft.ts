/**
 * Fetches (and caches per question + scope) the Mu'een draft. The draft is
 * generated once per scope and kept for the session — regenerate() asks the
 * service for a fresh one. Local paragraph edits live in useMueen, not here.
 */
import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { STALE_TIME } from "@/lib/query-config";
import { mueenService } from "../api";
import { numberCitations } from "../citations";
import {
  MueenDraftError,
  type MueenDraftRequest,
  type MueenInputMessage,
  type MueenScope,
} from "../types";

export function scopeKey(scope: MueenScope): string {
  return scope.kind === "all" ? "all" : [...scope.messageIds].sort().join(",");
}

export function useMueenDraft({
  questionId,
  question,
  messages,
  scope,
  enabled,
}: {
  questionId: string | null | undefined;
  question: MueenDraftRequest["question"];
  messages: MueenInputMessage[];
  scope: MueenScope;
  enabled: boolean;
}) {
  const key = useMemo(() => qk.mueen.draft(questionId, scopeKey(scope)), [questionId, scope]);
  const hasInput = messages.some((m) => m.fromAsker) || !!question?.title;

  const query = useQuery({
    queryKey: key,
    // Inline markers become card numbers once, here: edits and the sent answer keep them.
    queryFn: async () => {
      const draft = await mueenService.generateDraft({ questionId: questionId!, question, messages, scope });
      return { ...draft, paragraphs: draft.paragraphs.map(numberCitations) };
    },
    enabled: enabled && !!questionId && hasInput,
    // A draft is a one-off generation, not server state: never refetch it
    // behind the scholar's back while they are editing.
    staleTime: STALE_TIME.mueenDraft,
    gcTime: 30 * 60_000,
    // Offline won't fix itself in a second, and a timed-out draft already took
    // minutes; the sheet offers a retry instead.
    retry: (count, error) =>
      count < 1 &&
      !(error instanceof MueenDraftError && (error.kind === "offline" || error.message === "timeout")),
  });

  const { refetch } = query;
  const regenerate = useCallback(() => {
    void refetch();
  }, [refetch]);

  const error = query.error;
  const isError = query.isError && !query.isFetching;
  return {
    draft: query.data ?? null,
    /** Fetching with nothing to show yet (first generation). */
    isLoading: query.isFetching && !query.data,
    /** Fetching a replacement for a draft already on screen (screen 14). */
    isRegenerating: query.isFetching && !!query.data,
    isError,
    errorKind: isError
      ? error instanceof MueenDraftError
        ? error.kind
        : "failed"
      : null,
    hasInput,
    regenerate,
  };
}
