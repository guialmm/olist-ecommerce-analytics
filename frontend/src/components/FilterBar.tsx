import { motion } from "framer-motion";
import type { FilterOptions } from "../lib/api";
import { humanize } from "../lib/format";
import { SearchableMultiSelect } from "./SearchableMultiSelect";

interface Props {
  options: FilterOptions;
  selectedStates: string[];
  selectedCategories: string[];
  onToggleState: (state: string) => void;
  onToggleCategory: (category: string) => void;
  onClearStates: () => void;
  onClearCategories: () => void;
}

export function FilterBar({
  options,
  selectedStates,
  selectedCategories,
  onToggleState,
  onToggleCategory,
  onClearStates,
  onClearCategories,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="card-surface flex flex-wrap items-center gap-3 px-5 py-4"
    >
      <SearchableMultiSelect
        label="Estado"
        options={options.states}
        selected={selectedStates}
        onToggle={onToggleState}
        onClear={onClearStates}
      />
      <SearchableMultiSelect
        label="Categoria"
        options={options.categories}
        selected={selectedCategories}
        onToggle={onToggleCategory}
        onClear={onClearCategories}
        formatOption={humanize}
      />
    </motion.div>
  );
}
