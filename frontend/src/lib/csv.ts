/**
 * Ponto-e-vírgula como separador (não vírgula): é o padrão que o Excel em
 * pt-BR espera, já que a vírgula é o separador decimal nesse locale.
 */
const DELIMITER = ";";

function escapeCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (s.includes(DELIMITER) || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv<T extends object>(rows: T[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]) as (keyof T)[];
  const lines = [
    headers.join(DELIMITER),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(DELIMITER)),
  ];
  // BOM no início — sem isso o Excel abre acentos (ção, ã, é...) corrompidos.
  return "﻿" + lines.join("\r\n");
}

export function downloadCsv<T extends object>(rows: T[], filename: string): void {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
