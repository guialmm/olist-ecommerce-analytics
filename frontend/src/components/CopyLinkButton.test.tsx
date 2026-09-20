import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopyLinkButton } from "./CopyLinkButton";

describe("CopyLinkButton", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    writeText.mockClear();
  });

  it("copies the current page URL to the clipboard when clicked", async () => {
    render(<CopyLinkButton />);
    await userEvent.click(screen.getByText("copiar link"));
    expect(writeText).toHaveBeenCalledWith(window.location.href);
  });

  it("shows a confirmation after copying, then reverts", async () => {
    render(<CopyLinkButton />);
    await userEvent.click(screen.getByText("copiar link"));
    await waitFor(() => expect(screen.getByText("link copiado")).toBeInTheDocument());
  });
});
