import clsx from "clsx";

const VARIANTS: Record<string, { text: string; bg: string }> = {
  active: { text: "text-glow", bg: "bg-glow-dim" },
  settled: { text: "text-steel", bg: "bg-steel-dim" },
  expired: { text: "text-ink-3", bg: "bg-[rgba(255,255,255,0.05)]" },
  cancelled: { text: "text-coral", bg: "bg-coral-dim" },
  idle: { text: "text-ink-3", bg: "bg-[rgba(255,255,255,0.05)]" },
};

export function StatusBadge({ status }: { status: string }) {
  const v = VARIANTS[status] || VARIANTS.idle;
  return (
    <span className={clsx("text-[11px] font-mono px-2.5 py-1 rounded-md", v.text, v.bg)}>
      {status}
    </span>
  );
}
