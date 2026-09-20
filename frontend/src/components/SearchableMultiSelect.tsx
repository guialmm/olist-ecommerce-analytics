import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  formatOption?: (value: string) => string;
}

export function SearchableMultiSelect({
  label,
  options,
  selected,
  onToggle,
  onClear,
  formatOption = (v) => v,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    searchRef.current?.focus();
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => formatOption(o).toLowerCase().includes(q));
  }, [options, query, formatOption]);

  const summary = selected.length === 0 ? `todos (${options.length})` : `${selected.length}/${options.length}`;

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition active:scale-[0.97] ${
          selected.length > 0
            ? "border-accent/40 bg-accent-soft text-white"
            : "border-border text-text-dim hover:border-border-strong"
        }`}
      >
        <span>{label}</span>
        <span className="font-mono text-[11px] text-text-muted">{summary}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={`text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M1 3L5 7L9 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="card absolute left-0 top-[calc(100%+6px)] z-50 w-64 overflow-hidden p-2 shadow-tinted"
          >
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Buscar ${label.toLowerCase()}…`}
              className="mb-2 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent/50"
            />
            <div className="max-h-56 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="px-2 py-3 text-center text-[12px] text-text-muted">Nada encontrado.</p>
              )}
              {filtered.map((option) => {
                const checked = selected.includes(option);
                return (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-text-dim hover:bg-surface-hover"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(option)}
                      className="accent-accent"
                    />
                    {formatOption(option)}
                  </label>
                );
              })}
            </div>
            {selected.length > 0 && (
              <button
                onClick={onClear}
                className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-[12px] text-text-muted transition hover:text-text-dim active:scale-[0.98]"
              >
                Limpar seleção ({selected.length})
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
