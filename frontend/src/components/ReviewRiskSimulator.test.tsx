import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ReviewRiskModel } from "../lib/api";
import { ReviewRiskSimulator } from "./ReviewRiskSimulator";

const model: ReviewRiskModel = {
  metrics: {
    accuracy: 0.8915,
    roc_auc: 0.7043,
    base_rate: 0.1273,
    n_train: 100,
    n_test: 20,
    confusion_matrix: { true_negative: 15, false_positive: 1, false_negative: 3, true_positive: 1 },
  },
  curve: Array.from({ length: 21 }, (_, delivery_days) => ({
    delivery_days,
    on_time_risk: 0.06 + delivery_days * 0.005,
    late_risk: 0.25 + delivery_days * 0.01,
  })),
  trained_at: "2026-01-01T00:00:00Z",
};

describe("ReviewRiskSimulator", () => {
  it("shows the on-time risk at the chosen slider position", () => {
    render(<ReviewRiskSimulator data={model} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "10" } });
    expect(screen.getByText("11.0%")).toBeInTheDocument();
  });

  it("switches to the late-delivery risk when the toggle changes", async () => {
    render(<ReviewRiskSimulator data={model} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "10" } });
    await userEvent.click(screen.getByText("Atrasado"));
    expect(screen.getByText("35.0%")).toBeInTheDocument();
  });

  it("updates the risk when the slider moves", () => {
    render(<ReviewRiskSimulator data={model} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "20" } });
    expect(screen.getByText("16.0%")).toBeInTheDocument();
  });

  it("shows the model metrics in the caption", () => {
    render(<ReviewRiskSimulator data={model} />);
    expect(screen.getByText(/89\.1%/)).toBeInTheDocument();
    expect(screen.getByText(/0\.70/)).toBeInTheDocument();
  });
});
