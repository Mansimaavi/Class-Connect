import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import api, { getErrorMessage, getFieldErrors, onSessionExpired, tokenStore } from "./api";

const response = (config, status, data) => {
  if (status >= 400) {
    const error = new Error(`Request failed with status ${status}`);
    error.config = config;
    error.response = { status, data, config, headers: {} };
    return Promise.reject(error);
  }
  return Promise.resolve({ status, data, config, headers: {}, statusText: "OK" });
};

describe("api client", () => {
  let refreshSpy;

  beforeEach(() => {
    tokenStore.set("expired-token");
    // Pretend the server accepts only "fresh-token".
    api.defaults.adapter = (config) =>
      config.headers.Authorization === "Bearer fresh-token"
        ? response(config, 200, { ok: true, url: config.url })
        : response(config, 401, { code: "TOKEN_EXPIRED", message: "Your session has expired" });
    refreshSpy = vi.spyOn(axios, "post").mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { data: { accessToken: "fresh-token", user: { _id: "1" } } };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    tokenStore.set(null);
  });

  it("attaches the access token to requests", async () => {
    tokenStore.set("fresh-token");
    const { data } = await api.get("/classrooms");
    expect(data.ok).toBe(true);
  });

  it("refreshes an expired token once and replays every waiting request", async () => {
    const results = await Promise.all([api.get("/a"), api.get("/b"), api.get("/c")]);

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(results.map((r) => r.data.url)).toEqual(["/a", "/b", "/c"]);
    expect(tokenStore.get()).toBe("fresh-token");
  });

  it("ends the session when the refresh fails", async () => {
    refreshSpy.mockRejectedValueOnce(Object.assign(new Error("401"), { response: { data: { code: "INVALID_REFRESH_TOKEN" } } }));
    const handler = vi.fn();
    onSessionExpired(handler);

    await expect(api.get("/classrooms")).rejects.toBeTruthy();
    expect(handler).toHaveBeenCalledWith("INVALID_REFRESH_TOKEN");
    expect(tokenStore.get()).toBeNull();
  });
});

describe("error helpers", () => {
  const apiError = (data) => ({ response: { data } });

  it("prefers the first validation message", () => {
    const error = apiError({
      code: "VALIDATION_ERROR",
      message: "Some fields are invalid",
      details: [{ field: "title", message: "Title is required" }],
    });
    expect(getErrorMessage(error)).toBe("Title is required");
    expect(getFieldErrors(error)).toEqual({ title: "Title is required" });
  });

  it("explains network failures", () => {
    expect(getErrorMessage({ request: {} })).toMatch(/reach the server/);
  });

  it("falls back to the server message or a default", () => {
    expect(getErrorMessage(apiError({ message: "Classroom not found" }))).toBe("Classroom not found");
    expect(getErrorMessage({}, "Nope")).toBe("Nope");
  });
});
