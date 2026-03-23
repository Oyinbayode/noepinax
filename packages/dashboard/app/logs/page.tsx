"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import clsx from "clsx";

const AGENTS = ["all", "noepinax", "temperance", "fervor", "dusk", "contrarian", "echo"];

const PHASE_COLORS: Record<string, string> = {
  observe: "text-ink-2",
  reason: "text-amber",
  create: "text-amber",
  mint: "text-glow",
  bid: "text-coral",
  settle: "text-glow",
  error: "text-coral",
};

export default function Logs() {
  const [agent, setAgent] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["logs", agent, page],
    queryFn: () => apiFetch<{ logs: any[]; total: number; pages: number }>(`/api/logs?agent=${agent}&page=${page}&limit=30`),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between pb-4">
        <div>
          <h1 className="font-display text-[32px] font-bold tracking-tight text-ink">Logs</h1>
          <p className="text-[14px] text-ink-3 mt-1">{data?.total ?? 0} cycle entries</p>
        </div>
        <div className="flex items-center gap-1 bg-surface border border-[rgba(139,148,158,0.06)] rounded-lg p-1">
          {AGENTS.map((a) => (
            <button
              key={a}
              onClick={() => { setAgent(a); setPage(1); }}
              className={clsx(
                "px-2.5 py-1 text-[11px] rounded-md capitalize transition-all duration-150 font-medium",
                a === agent
                  ? "bg-[rgba(139,148,158,0.1)] text-ink"
                  : "text-ink-3 hover:text-ink-2"
              )}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-[rgba(139,148,158,0.06)] rounded-[10px] overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-ink-3 text-[14px]">Loading</div>
        ) : data?.logs.length === 0 ? (
          <div className="p-12 text-center text-ink-3 text-[14px]">No logs yet</div>
        ) : (
          <div className="divide-y divide-[rgba(139,148,158,0.04)]">
            {data?.logs.map((log: any) => (
              <details key={log.id} className="group">
                <summary className="px-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-[rgba(139,148,158,0.03)] transition-colors list-none">
                  <span className="font-mono text-[11px] text-ink-3 w-[130px] shrink-0">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  <span className={clsx("font-mono text-[11px] w-[56px] text-center", PHASE_COLORS[log.phase] || "text-ink-2")}>
                    {log.phase}
                  </span>
                  <span className="text-[13px] text-ink-2 capitalize">{log.agent_id}</span>
                  <span className="font-mono text-[10px] text-ink-4 ml-auto">{log.log_data?.cycle_id?.slice(0, 8)}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-3 group-open:rotate-90 transition-transform">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </summary>
                <div className="px-5 pb-4 border-t border-[rgba(139,148,158,0.04)]">
                  <pre className="font-mono text-[11px] text-ink-2 mt-3 overflow-x-auto whitespace-pre-wrap leading-relaxed bg-canvas rounded-lg p-4">
                    {JSON.stringify(log.log_data, null, 2)}
                  </pre>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-[13px] text-ink-2 hover:text-ink disabled:text-ink-4 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg hover:bg-[rgba(139,148,158,0.06)] transition-colors"
          >
            Previous
          </button>
          <span className="font-mono text-[11px] text-ink-3">{page} / {data.pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
            className="text-[13px] text-ink-2 hover:text-ink disabled:text-ink-4 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg hover:bg-[rgba(139,148,158,0.06)] transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
