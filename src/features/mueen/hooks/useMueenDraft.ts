/**
 * Fetches (and caches per question + scope) the Mu'een draft. The draft is
 * generated once per scope and kept for the session — regenerate() asks the
 * service for a fresh one. Local paragraph edits live in the sheet, not here.
 */
import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { STALE_TIME } from "@/lib/query-config";
import { mueenService } from "../api";
import type { MueenDraftRequest, MueenInputMessage, MueenScope } from "../types";

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
    queryFn: () =>
      mueenService.generateDraft({ questionId: questionId!, question, messages, scope }),
    enabled: enabled && !!questionId && hasInput,
    // A draft is a one-off generation, not server state: never refetch it
    // behind the scholar's back while they are editing.
    staleTime: STALE_TIME.mueenDraft,
    gcTime: 30 * 60_000,
    retry: 1,
  });

  const { refetch } = query;
  const regenerate = useCallback(() => {
    void refetch();
  }, [refetch]);

  return {
    draft: query.data ?? null,
    isLoading: query.isFetching,
    isError: query.isError && !query.isFetching,
    hasInput,
    regenerate,
  };
}
