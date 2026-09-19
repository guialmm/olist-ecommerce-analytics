import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearToken, getToken, login } from "./auth";

describe("token storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when nothing is stored", () => {
    expect(getToken()).toBeNull();
  });

  it("clearToken removes a stored token", () => {
    localStorage.setItem("olist_analytics_token", "some-token");
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe("login", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("stores and returns the token on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: "tok-123" }) }),
    );
    const token = await login("demo", "olist2018");
    expect(token).toBe("tok-123");
    expect(getToken()).toBe("tok-123");
  });

  it("throws with the backend's detail message and stores nothing on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ detail: "Usuário ou senha inválidos." }),
      }),
    );
    await expect(login("demo", "wrong")).rejects.toThrow("Usuário ou senha inválidos.");
    expect(getToken()).toBeNull();
  });

  it("throws a network-failure message when fetch itself rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(login("demo", "olist2018")).rejects.toThrow(/Não foi possível conectar/);
  });
});
