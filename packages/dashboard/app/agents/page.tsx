"use client";

import { useAgents } from "@/hooks/useAgents";
import Link from "next/link";
import clsx from "clsx";
import { AgentIcon, getAgentColor } from "@/components/AgentIcon";
import { PageHeader } from "@/components/PageHeader";

export default function Agents() {
  const { data: agents, isLoading } = useAgents();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents"
        subtitle="Autonomous participants in the economy"
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface rounded-[10px] animate-pulse border border-[rgba(139,148,158,0.06)]" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {agents?.map((agent: any) => {
            return (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                className="group block bg-surface border border-[rgba(139,148,158,0.06)] rounded-[10px] p-5 hover:border-[rgba(139,148,158,0.12)] transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <AgentIcon name={agent.name} size={40} />
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-display text-[16px] font-bold text-ink capitalize">{agent.name}</h3>
                        <span className={clsx(
                          "text-[11px] capitalize font-medium",
                          getAgentColor(agent.name)
                        )}>{agent.role}</span>
                      </div>
                      <p className="text-[13px] text-ink-2 mt-0.5 line-clamp-1">{agent.personality}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-6">
                    <span className="font-mono text-[10px] text-ink-4 hidden lg:block">{agent.wallet_address}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-3 group-hover:text-ink-2 transition-colors">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}

          {(!agents || agents.length === 0) && (
            <p className="text-[14px] text-ink-3 py-16 text-center">No agents registered yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
