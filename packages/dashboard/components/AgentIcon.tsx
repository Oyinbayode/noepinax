import clsx from "clsx";

interface AgentIconProps {
  name: string;
  size?: number;
  className?: string;
}

const AGENT_COLORS: Record<string, { bg: string; stroke: string }> = {
  noepinax: { bg: "bg-amber-dim", stroke: "#ffb224" },
  temperance: { bg: "bg-steel-dim", stroke: "#5a8a9a" },
  fervor: { bg: "bg-coral-dim", stroke: "#ff6b6b" },
  dusk: { bg: "bg-[rgba(139,148,158,0.08)]", stroke: "#8b949e" },
  contrarian: { bg: "bg-glow-dim", stroke: "#39ff85" },
  echo: { bg: "bg-[rgba(139,148,158,0.08)]", stroke: "#8b949e" },
};

export function AgentIcon({ name, size = 36, className }: AgentIconProps) {
  const colors = AGENT_COLORS[name.toLowerCase()] ?? { bg: "bg-elevated", stroke: "#525a64" };
  const s = size * 0.5;

  return (
    <div className={clsx("rounded-lg flex items-center justify-center shrink-0", colors.bg, className)} style={{ width: size, height: size }}>
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={colors.stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {getAgentPath(name.toLowerCase())}
      </svg>
    </div>
  );
}

function getAgentPath(name: string) {
  switch (name) {
    case "noepinax":
      // brush/pen - the artist
      return <><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></>;
    case "temperance":
      // balance scale - calm, measured
      return <><path d="M12 3v18" /><path d="M5 8l7-5 7 5" /><path d="M3 13a2 2 0 004 0l-2-5-2 5z" /><path d="M17 13a2 2 0 004 0l-2-5-2 5z" /></>;
    case "fervor":
      // flame - passionate
      return <><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></>;
    case "dusk":
      // moon - nocturnal, selective
      return <><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></>;
    case "contrarian":
      // crosshair/target - bargain hunter
      return <><circle cx="12" cy="12" r="10" /><path d="M22 12h-4" /><path d="M6 12H2" /><path d="M12 6V2" /><path d="M12 22v-4" /></>;
    case "echo":
      // wave/signal - tracks patterns
      return <><path d="M2 12h2" /><path d="M6 8v8" /><path d="M10 4v16" /><path d="M14 6v12" /><path d="M18 9v6" /><path d="M22 12h-2" /></>;
    default:
      return <circle cx="12" cy="12" r="8" />;
  }
}

export function getAgentColor(name: string): string {
  const colors: Record<string, string> = {
    noepinax: "text-amber",
    temperance: "text-steel",
    fervor: "text-coral",
    dusk: "text-ink-2",
    contrarian: "text-glow",
    echo: "text-ink-2",
  };
  return colors[name.toLowerCase()] ?? "text-ink-3";
}
