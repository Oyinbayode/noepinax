import clsx from "clsx";
import { AgentIcon, getAgentColor } from "./AgentIcon";

interface AgentCardProps {
  name: string;
  role: string;
  personality?: string;
  status: string;
  walletAddress: string;
}

export function AgentCard({ name, personality, status, walletAddress }: AgentCardProps) {
  return (
    <div className="group bg-surface border border-[rgba(139,148,158,0.06)] rounded-[10px] p-4 hover:border-[rgba(139,148,158,0.12)] transition-all duration-200">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <AgentIcon name={name} size={32} />
          <h3 className={clsx("font-display text-[15px] font-bold capitalize leading-tight", getAgentColor(name))}>{name}</h3>
        </div>
        {status === "active" && (
          <span className="w-[5px] h-[5px] rounded-full bg-glow animate-breathe" />
        )}
      </div>

      <p className="text-[12px] text-ink-2 leading-relaxed line-clamp-2">{personality}</p>

      <div className="mt-3 pt-2.5 border-t border-[rgba(139,148,158,0.06)]">
        <span className="font-mono text-[10px] text-ink-4 block opacity-0 group-hover:opacity-100 transition-opacity">
          {walletAddress}
        </span>
        <span className="font-mono text-[10px] text-ink-4 block group-hover:hidden">
          {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </span>
      </div>
    </div>
  );
}
