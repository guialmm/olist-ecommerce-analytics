import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls onSuccess and stores the token after a successful login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: "a-fresh-token", token_type: "bearer" }),
      }),
    );
    const onSuccess = vi.fn();

    render(<LoginPage onSuccess={onSuccess} />);
    await userEvent.type(screen.getByLabelText("Senha"), "olist2018");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem("olist_analytics_token")).toBe("a-fresh-token");
  });

  it("shows the backend's error message and does not call onSuccess on wrong credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: "Usuário ou senha inválidos." }),
      }),
    );
    const onSuccess = vi.fn();

    render(<LoginPage onSuccess={onSuccess} />);
    await userEvent.type(screen.getByLabelText("Senha"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(screen.getByText("Usuário ou senha inválidos.")).toBeInTheDocument());
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
