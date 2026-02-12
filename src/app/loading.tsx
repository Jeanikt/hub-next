export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
      <div className="hub-loading-spinner" aria-hidden />
      <p className="text-sm font-bold uppercase tracking-widest text-[var(--hub-text-muted)]">
        Carregando
      </p>
      <div className="w-48 h-1 bg-[var(--hub-border)] rounded-full overflow-hidden">
        <div
          className="h-full w-1/3 rounded-full hub-scan-line"
          style={{ background: "var(--hub-accent)" }}
        />
      </div>
    </div>
  );
}
