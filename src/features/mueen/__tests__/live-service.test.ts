import { liveMueenService } from "../api/live-service";
import { MueenDraftError, type MueenDraft, type MueenDraftRequest } from "../types";
import { isOnline } from "@/lib/network";

const mockInvoke = jest.fn();
const mockRefresh = jest.fn(async () => ({ error: null }));
jest.mock("@/lib/supabase", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    auth: { refreshSession: () => mockRefresh() },
  },
}));
jest.mock("@/lib/network", () => ({ isOnline: jest.fn(async () => true) }));

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
  status: "ok",
  paragraphs: [{ id: "p1", text: "نص", sources: [] }],
  textMessageCount: 1,
};

async function errorKind(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (err) {
    return err instanceof MueenDraftError ? err.kind : "other";
  }
  return "resolved";
}

describe("live Mu'een service", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockRefresh.mockClear();
    jest.mocked(isOnline).mockResolvedValue(true);
  });

  it("calls the mueen-draft function with the request and returns the draft", async () => {
    mockInvoke.mockResolvedValue({ data: draft, error: null });
    await expect(liveMueenService.generateDraft(request)).resolves.toEqual(draft);
    expect(mockInvoke).toHaveBeenCalledWith("mueen-draft", { body: request });
  });

  it("passes a no_sources answer through", async () => {
    const none = { ...draft, status: "no_sources" as const, paragraphs: [] };
    mockInvoke.mockResolvedValue({ data: none, error: null });
    await expect(liveMueenService.generateDraft(request)).resolves.toEqual(none);
  });

  it("fails as offline without calling the function when there is no connection", async () => {
    jest.mocked(isOnline).mockResolvedValue(false);
    expect(await errorKind(liveMueenService.generateDraft(request))).toBe("offline");
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("reports a server error as failed", async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error("Edge Function returned a non-2xx status code") });
    expect(await errorKind(liveMueenService.generateDraft(request))).toBe("failed");
  });

  it("reports a connection lost during the request as offline", async () => {
    jest.mocked(isOnline).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    mockInvoke.mockResolvedValue({ data: null, error: new Error("Failed to send a request") });
    expect(await errorKind(liveMueenService.generateDraft(request))).toBe("offline");
  });

  it("refreshes an expired session once and retries on 401", async () => {
    const unauthorized = Object.assign(new Error("non-2xx"), { context: { status: 401 } });
    mockInvoke.mockResolvedValueOnce({ data: null, error: unauthorized }).mockResolvedValueOnce({ data: draft, error: null });
    await expect(liveMueenService.generateDraft(request)).resolves.toEqual(draft);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });

  it("does not retry other server errors", async () => {
    const forbidden = Object.assign(new Error("non-2xx"), { context: { status: 403 } });
    mockInvoke.mockResolvedValue({ data: null, error: forbidden });
    expect(await errorKind(liveMueenService.generateDraft(request))).toBe("failed");
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it("rejects a malformed answer", async () => {
    mockInvoke.mockResolvedValue({ data: { id: "x" }, error: null });
    expect(await errorKind(liveMueenService.generateDraft(request))).toBe("failed");
  });
});
