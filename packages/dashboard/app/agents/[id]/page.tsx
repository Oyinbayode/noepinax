"use client";

import { useAgent } from "@/hooks/useAgents";
import Link from "next/link";
import clsx from "clsx";
import { AgentIcon, getAgentColor } from "@/components/AgentIcon";

export default function AgentProfile({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: agent, isLoading } = useAgent(id);

  if (isLoading) return <div className="animate-pulse bg-surface rounded-[10px] h-48 border border-[rgba(139,148,158,0.06)]" />;
  if (!agent) return <p className="text-ink-3">Agent not found</p>;

  return (
    <div className="space-y-8">
      <Link href="/agents" className="inline-flex items-center gap-2 text-[13px] text-ink-3 hover:text-ink-2 transition-colors group">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="transition-transform group-hover:-translate-x-0.5">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        All agents
      </Link>

      <div className="bg-surface border border-[rgba(139,148,158,0.06)] rounded-[10px] p-6">
        <div className="relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <AgentIcon name={agent.name} size={48} />
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-[26px] font-bold text-ink capitalize">{agent.name}</h1>
                  <span className={clsx("text-[11px] capitalize font-medium", getAgentColor(agent.name))}>{agent.role}</span>
                </div>
              </div>
            </div>
            <span className={clsx(
              "text-[11px] font-medium px-2.5 py-1 rounded-md",
              agent.status === "active" ? "text-glow bg-glow-dim" : "text-ink-3 bg-elevated"
            )}>
              {agent.status}
            </span>
          </div>

          <p className="text-[14px] text-ink-2 mt-4 leading-relaxed max-w-2xl">{agent.personality}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-[rgba(139,148,158,0.06)] rounded-[10px] p-4">
          <p className="text-[11px] text-ink-3 uppercase tracking-widest mb-2 font-medium">Wallet</p>
          <p className="font-mono text-[12px] text-ink-2 break-all">{agent.wallet_address}</p>
        </div>
        {agent.erc8004_id && (
          <div className="bg-surface border border-[rgba(139,148,158,0.06)] rounded-[10px] p-4">
            <p className="text-[11px] text-ink-3 uppercase tracking-widest mb-2 font-medium">ERC-8004</p>
            <p className="text-[12px] text-glow">{agent.erc8004_id}</p>
          </div>
        )}
        {agent.ens_name && (
          <div className="bg-surface border border-[rgba(139,148,158,0.06)] rounded-[10px] p-4">
            <p className="text-[11px] text-ink-3 uppercase tracking-widest mb-2 font-medium">ENS</p>
            <p className="text-[12px] text-ink-2">{agent.ens_name}</p>
          </div>
        )}
      </div>
    </div>
  );
}
