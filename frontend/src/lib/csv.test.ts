import { describe, expect, it, vi } from "vitest";
import { downloadCsv, toCsv } from "./csv";

describe("toCsv", () => {
  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });

  it("prefixes a BOM and uses semicolons (pt-BR Excel convention)", () => {
    const csv = toCsv([{ state: "SP", revenue: 100 }]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("state;revenue");
    expect(csv).toContain("SP;100");
  });

  it("uses the keys of the first row as headers, in order", () => {
    const csv = toCsv([{ b: 1, a: 2 }]);
    expect(csv.split("\r\n")[0]).toBe("﻿b;a");
  });

  it("quotes and escapes fields containing the delimiter, quotes, or newlines", () => {
    const csv = toCsv([{ label: 'has "quotes"; and a\nnewline' }]);
    const dataLine = csv.split("\r\n")[1];
    expect(dataLine).toBe('"has ""quotes""; and a\nnewline"');
  });

  it("renders null/undefined as an empty cell", () => {
    const csv = toCsv([{ a: null, b: undefined, c: 0 }]);
    expect(csv.split("\r\n")[1]).toBe(";;0");
  });

  it("produces one line per row", () => {
    const csv = toCsv([{ x: 1 }, { x: 2 }, { x: 3 }]);
    expect(csv.split("\r\n")).toHaveLength(4); // header + 3 rows
  });
});

describe("downloadCsv", () => {
  it("creates an object URL, clicks a download link, then revokes the URL", () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadCsv([{ a: 1 }], "meu-arquivo");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("appends .csv to the filename when missing", () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });

    let capturedDownload = "";
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        capturedDownload = this.download;
      });

    downloadCsv([{ a: 1 }], "sem-extensao");
    expect(capturedDownload).toBe("sem-extensao.csv");

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
