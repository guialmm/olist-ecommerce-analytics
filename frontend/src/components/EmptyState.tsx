export function EmptyState({ height = 260 }: { height?: number }) {
  return (
    <div
      className="flex items-center justify-center text-center text-[13px] text-text-muted"
      style={{ height }}
    >
      Nenhum dado para esse filtro.
    </div>
  );
}
