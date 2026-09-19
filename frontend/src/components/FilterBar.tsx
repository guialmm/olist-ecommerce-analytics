import { motion } from "framer-motion";
import type { FilterOptions } from "../lib/api";
import { humanize } from "../lib/format";

interface Props {
  options: FilterOptions;
  selectedStates: string[];
  selectedCategories: string[];
  onToggleState: (state: string) => void;
  onToggleCategory: (category: string) => void;
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      className={`shrink-0 rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors ${
        active
          ? "border-accent/40 bg-accent-soft text-white"
          : "border-border text-text-muted hover:border-border-strong hover:text-text-dim"
      }`}
    >
      {label}
    </motion.button>
  );
}

function FilterRow({
  label,
  count,
  total,
  children,
}: {
  label: string;
  count: number;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wide text-text-muted">
          {label}
        </span>
        <span className="font-mono text-[10px] text-text-muted">
          {count === 0 ? `todos (${total})` : `${count}/${total}`}
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">{children}</div>
    </div>
  );
}

export function FilterBar({
  options,
  selectedStates,
  selectedCategories,
  onToggleState,
  onToggleCategory,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="card-surface flex flex-col gap-3 px-5 py-4"
    >
      <FilterRow label="Estado" count={selectedStates.length} total={options.states.length}>
        {options.states.map((s) => (
          <Chip
            key={s}
            label={s}
            active={selectedStates.includes(s)}
            onClick={() => onToggleState(s)}
          />
        ))}
      </FilterRow>
      <FilterRow
        label="Categoria"
        count={selectedCategories.length}
        total={options.categories.length}
      >
        {options.categories.map((c) => (
          <Chip
            key={c}
            label={humanize(c)}
            active={selectedCategories.includes(c)}
            onClick={() => onToggleCategory(c)}
          />
        ))}
      </FilterRow>
    </motion.div>
  );
}
