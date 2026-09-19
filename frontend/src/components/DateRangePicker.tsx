import { motion } from "framer-motion";
import { subMonths } from "../lib/format";

interface Props {
  minDate: string;
  maxDate: string;
  startDate: string | null;
  endDate: string | null;
  onChange: (start: string | null, end: string | null) => void;
}

function PresetButton({
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
      className={`rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors ${
        active
          ? "border-accent/40 bg-accent-soft text-white"
          : "border-border text-text-muted hover:border-border-strong hover:text-text-dim"
      }`}
    >
      {label}
    </motion.button>
  );
}

export function DateRangePicker({ minDate, maxDate, startDate, endDate, onChange }: Props) {
  const isAllTime = !startDate && !endDate;
  const last3 = subMonths(maxDate, 3);
  const last6 = subMonths(maxDate, 6);
  const is3Months = startDate === last3 && endDate === maxDate;
  const is6Months = startDate === last6 && endDate === maxDate;

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wide text-text-muted">
          Período
        </span>
        <span className="font-mono text-[10px] text-text-muted">
          {isAllTime ? "todo o período" : `${startDate ?? minDate} → ${endDate ?? maxDate}`}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PresetButton label="Todo período" active={isAllTime} onClick={() => onChange(null, null)} />
        <PresetButton
          label="Últimos 6 meses"
          active={is6Months}
          onClick={() => onChange(last6, maxDate)}
        />
        <PresetButton
          label="Últimos 3 meses"
          active={is3Months}
          onClick={() => onChange(last3, maxDate)}
        />
        <div className="mx-1 h-4 w-px bg-border" />
        <input
          type="date"
          value={startDate ?? minDate}
          min={minDate}
          max={endDate ?? maxDate}
          onChange={(e) => onChange(e.target.value, endDate)}
          className="rounded-lg border border-border bg-transparent px-2 py-1 text-[12px] text-text-dim [color-scheme:dark]"
        />
        <span className="text-text-muted">→</span>
        <input
          type="date"
          value={endDate ?? maxDate}
          min={startDate ?? minDate}
          max={maxDate}
          onChange={(e) => onChange(startDate, e.target.value)}
          className="rounded-lg border border-border bg-transparent px-2 py-1 text-[12px] text-text-dim [color-scheme:dark]"
        />
      </div>
    </div>
  );
}
