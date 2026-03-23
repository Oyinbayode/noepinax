"use client";

import type { WSMessage } from "@/lib/ws";
import clsx from "clsx";

const PHASE_LABELS: Record<string, { color: string; label: string }> = {
  "cycle:observe": { color: "text-ink-2", label: "observe" },
  "cycle:reason": { color: "text-glow/70", label: "reason" },
  "cycle:create": { color: "text-glow/70", label: "create" },
  "cycle:mint": { color: "text-glow", label: "mint" },
  "cycle:settle": { color: "text-glow", label: "settle" },
  "cycle:watch": { color: "text-ink-2", label: "watch" },
  "cycle:evaluate": { color: "text-ink-2", label: "evaluate" },
  "cycle:bid": { color: "text-glow", label: "bid" },
  "chat:message": { color: "text-ink-2", label: "chat" },
  "agent:error": { color: "text-coral", label: "error" },
};

export function EventFeed({ messages }: { messages: WSMessage[] }) {
  if (messages.length === 0) {
    return (
      <div className="bg-surface border border-[rgba(139,148,158,0.06)] rounded-[10px] h-[180px] flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 rounded-full bg-glow-dim flex items-center justify-center mx-auto mb-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#39ff85" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
            <path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
            <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
            <path d="M7.76 16.24a6 6 0 0 1 0-8.49" />
          </svg>
        </div>
        <p className="text-[13px] text-ink-3">Listening for agent activity...</p>
        <p className="text-[11px] text-ink-4 mt-1">Events will appear here as agents cycle</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-[rgba(139,148,158,0.06)] rounded-[10px] overflow-hidden h-[180px]">
      <div className="h-full overflow-y-auto">
        {messages.map((msg, i) => {
          const phase = PHASE_LABELS[msg.event];
          return (
            <div
              key={`${msg.timestamp}-${i}`}
              className="px-4 py-2.5 border-b border-[rgba(139,148,158,0.04)] last:border-0 hover:bg-[rgba(139,148,158,0.03)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-ink-4 w-[60px] shrink-0">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <span className={clsx(
                  "font-mono text-[10px] w-[56px] text-center px-1.5 py-0.5 rounded",
                  phase?.color || "text-ink-2",
                  phase?.label === "mint" || phase?.label === "settle" || phase?.label === "bid"
                    ? "bg-glow-dim"
                    : phase?.label === "error"
                      ? "bg-coral-dim"
                      : "bg-[rgba(139,148,158,0.04)]"
                )}>
                  {phase?.label || msg.event}
                </span>
                {typeof msg.data?.agent_id === "string" && (
                  <span className="text-[12px] text-ink-2 capitalize">{msg.data.agent_id}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
