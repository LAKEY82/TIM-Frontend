import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, getErrorMessage, setAuthFailureHandler, tokenStore, unwrapEnvelope } from "@/lib/api";
import { mockApi } from "@/test/utils";

describe("api client", () => {
  beforeEach(() => {
    tokenStore.clear();
    setAuthFailureHandler(null);
  });

  it("uses NEXT_PUBLIC_API_URL, sends credentials and the in-memory bearer token", async () => {
    const { fetchMock } = mockApi({ "GET /api/projects": () => ({ body: { data: [{ id: "p1" }], meta: { total: 1 } } }) });
    tokenStore.set("abc");
    const data = await api.get("/api/projects", { params: { status: "ACTIVE", page: 2, search: "" } });

    expect(data).toEqual([{ id: "p1" }]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("http://api.test/api/projects?status=ACTIVE&page=2");
    expect(init?.credentials).toBe("include");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer abc");
  });

  it("refreshes once on 401 and replays the request", async () => {
    let first = true;
    const { calls } = mockApi({
      "GET /api/tasks": () => {
        if (first) {
          first = false;
          return { status: 401, body: { message: "expired" } };
        }
        return { body: { data: { ok: true } } };
      },
      "POST /api/auth/refresh": () => ({ body: { data: { accessToken: "new-token" } } }),
    });

    await expect(api.get("/api/tasks")).resolves.toEqual({ ok: true });
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(["GET /api/tasks", "POST /api/auth/refresh", "GET /api/tasks"]);
    expect(calls[2]!.headers.get("Authorization")).toBe("Bearer new-token");
  });

  it("calls the auth-failure handler when refresh fails", async () => {
    const onFailure = vi.fn();
    setAuthFailureHandler(onFailure);
    mockApi({
      "GET /api/tasks": () => ({ status: 401, body: { message: "expired" } }),
      "POST /api/auth/refresh": () => ({ status: 401, body: {} }),
    });

    const error = await api.get("/api/tasks").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect(onFailure).toHaveBeenCalledTimes(1);
  });

  it("maps 422 validation errors to field errors", async () => {
    mockApi({
      "POST /api/tasks": () => ({
        status: 422,
        body: { message: "Validation failed", errors: [{ path: ["title"], message: "Title is taken" }, { field: "dueDate", message: "Invalid" }] },
      }),
    });
    const error = (await api.post("/api/tasks", {}).catch((e: unknown) => e)) as ApiError;
    expect(error.isValidation).toBe(true);
    expect(error.fieldErrors).toEqual({ title: "Title is taken", dueDate: "Invalid" });
  });

  it("produces friendly messages for 403, 404, 429 and 500", async () => {
    mockApi({
      "GET /api/a": () => ({ status: 403, body: {} }),
      "GET /api/b": () => ({ status: 429, body: {}, headers: { "Retry-After": "12" } }),
      "GET /api/c": () => ({ status: 500, body: {} }),
    });
    const forbidden = await api.get("/api/a").catch((e: unknown) => e);
    const limited = (await api.get("/api/b").catch((e: unknown) => e)) as ApiError;
    const server = await api.get("/api/c").catch((e: unknown) => e);
    expect(getErrorMessage(forbidden)).toMatch(/permission/i);
    expect(limited.retryAfterSeconds).toBe(12);
    expect(getErrorMessage(limited)).toMatch(/12s/);
    expect(getErrorMessage(server)).toMatch(/server/i);
  });

  it("unwraps envelopes but leaves plain payloads alone", () => {
    expect(unwrapEnvelope({ success: true, data: [1], meta: { page: 1 } })).toEqual({ data: [1], meta: { page: 1 } });
    expect(unwrapEnvelope({ data: 1, name: "x" })).toEqual({ data: { data: 1, name: "x" }, meta: null });
    expect(unwrapEnvelope([1, 2])).toEqual({ data: [1, 2], meta: null });
  });
});
