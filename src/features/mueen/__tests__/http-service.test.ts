import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { MueenDraftError, httpMueenService } from "../api/http-service";
import type { MueenDraft, MueenDraftRequest } from "../types";

const invoke = jest.fn();
jest.mock("@/lib/supabase", () => ({ supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } } }));

const request: MueenDraftRequest = {
  questionId: "q1",
  question: { title: "سؤال", description: null },
  messages: [{ id: "m1", text: "نص", fromAsker: true }],
  scope: { kind: "all" },
};

const draft: MueenDraft = {
  id: "mueen_1",
  questionId: "q1",
  scope: { kind: "all" },
  paragraphs: [{ id: "p1", text: "نص", sources: [] }],
  textMessageCount: 1,
  status: "ok",
};

function httpError(status: number) {
  return new FunctionsHttpError(new Response("{}", { status }));
}

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (err) {
    return err instanceof MueenDraftError ? err.code : "other";
  }
  return "resolved";
}

describe("live Mu'een service", () => {
  beforeEach(() => invoke.mockReset());

  it("calls the mueen-draft function with the request and returns the draft", async () => {
    invoke.mockResolvedValue({ data: draft, error: null });
    await expect(httpMueenService.generateDraft(request)).resolves.toEqual(draft);
    expect(invoke).toHaveBeenCalledWith("mueen-draft", { body: request });
  });

  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [422, "no_input"],
    [504, "timeout"],
    [502, "unavailable"],
  ])("maps HTTP %i to %s", async (status, code) => {
    invoke.mockResolvedValue({ data: null, error: httpError(status) });
    expect(await codeOf(httpMueenService.generateDraft(request))).toBe(code);
  });

  it("reports a dropped connection as a network error (the only one the hook retries)", async () => {
    invoke.mockResolvedValue({ data: null, error: new FunctionsFetchError(new Error("offline")) });
    expect(await codeOf(httpMueenService.generateDraft(request))).toBe("network");
  });

  it("rejects a malformed answer", async () => {
    invoke.mockResolvedValue({ data: { id: "x" }, error: null });
    expect(await codeOf(httpMueenService.generateDraft(request))).toBe("unavailable");
  });
});
