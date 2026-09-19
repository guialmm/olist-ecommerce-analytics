import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const { mockApi } = vi.hoisted(() => ({
  mockApi: { me: vi.fn() },
}));

vi.mock("./lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./lib/api")>();
  return { ...actual, api: mockApi };
});

// Dashboard faz um monte de outras chamadas de API assim que autenticado —
// não é o que este arquivo testa, então troca por um dublê simples.
vi.mock("./Dashboard", () => ({
  default: ({ onLogout }: { onLogout: () => void }) => (
    <div>
      <p>Dashboard carregado</p>
      <button onClick={onLogout}>Sair</button>
    </div>
  ),
}));

describe("App (auth gate)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the login page when there is no stored token", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("entre para ver o dashboard")).toBeInTheDocument());
    expect(mockApi.me).not.toHaveBeenCalled();
  });

  it("goes straight to the dashboard when a valid token is already stored", async () => {
    localStorage.setItem("olist_analytics_token", "a-valid-token");
    mockApi.me.mockResolvedValueOnce({ username: "demo" });

    render(<App />);

    await waitFor(() => expect(screen.getByText("Dashboard carregado")).toBeInTheDocument());
  });

  it("falls back to the login page when the stored token is rejected by the API", async () => {
    localStorage.setItem("olist_analytics_token", "an-expired-token");
    mockApi.me.mockRejectedValueOnce(new Error("401"));

    render(<App />);

    await waitFor(() => expect(screen.getByText("entre para ver o dashboard")).toBeInTheDocument());
    expect(localStorage.getItem("olist_analytics_token")).toBeNull();
  });

  it("clears the token and returns to the login page on logout", async () => {
    localStorage.setItem("olist_analytics_token", "a-valid-token");
    mockApi.me.mockResolvedValueOnce({ username: "demo" });

    render(<App />);
    await waitFor(() => expect(screen.getByText("Dashboard carregado")).toBeInTheDocument());

    screen.getByText("Sair").click();

    await waitFor(() => expect(screen.getByText("entre para ver o dashboard")).toBeInTheDocument());
    expect(localStorage.getItem("olist_analytics_token")).toBeNull();
  });
});
