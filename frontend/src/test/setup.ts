import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom não implementa IntersectionObserver — usado pelo Framer Motion
// (whileInView, em SectionCard e CohortHeatmap-like reveals).
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly scrollMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
  takeRecords = () => [];
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
