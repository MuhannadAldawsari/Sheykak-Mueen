/**
 * The live Mu'een service. Calls the `mueen-draft` Supabase Edge Function with the
 * scholar's session; the function holds the Mu'een API key (never shipped in the app),
 * checks the caller is an active scholar assigned to the question, and forwards the
 * request to the Mu'een API, which answers in this module's MueenDraft shape
 * (status "ok" | "no_sources"). A draft takes ~30-60 s.
 */
import { isOnline } from "@/lib/network";
import { supabase } from "@/lib/supabase";
import { MueenDraftError, type MueenDraft, type MueenService } from "../types";

// Above the API's own limit (~140 s in the function); Supabase stops functions at 150 s.
const TIMEOUT_MS = 155_000;

/** HTTP status of a FunctionsHttpError (its `context` is the Response). */
const statusOf = (error: unknown) => (error as { context?: { status?: number } } | null)?.context?.status;

const invokeDraft = (request: Parameters<MueenService["generateDraft"]>[0]) =>
  supabase.functions.invoke<MueenDraft>("mueen-draft", { body: request });

function isDraft(data: unknown): data is MueenDraft {
  const d = data as MueenDraft | null;
  return !!d && Array.isArray(d.paragraphs) && (d.status === "ok" || d.status === "no_sources");
}

export const liveMueenService: MueenService = {
  async generateDraft(request) {
    if (!(await isOnline())) throw new MueenDraftError("offline");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new MueenDraftError("failed", "timeout")), TIMEOUT_MS);
    });
    try {
      let { data, error } = await Promise.race([invokeDraft(request), timeout]);
      if (statusOf(error) === 401) {
        // An access token that expired while the app sat idle: refresh once, then retry.
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError) ({ data, error } = await Promise.race([invokeDraft(request), timeout]));
      }
      if (error) {
        // A connection lost mid-request reads as offline; anything else (401/403/5xx) as failed.
        throw new MueenDraftError((await isOnline()) ? "failed" : "offline", error.message);
      }
      if (!isDraft(data)) throw new MueenDraftError("failed", "malformed draft");
      return data;
    } finally {
      clearTimeout(timer);
    }
  },
};
