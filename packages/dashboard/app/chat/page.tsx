"use client";

import { useEffect, useRef } from "react";
import { useChat, type ChatMessage } from "@/hooks/useChat";
import { PageHeader } from "@/components/PageHeader";
import clsx from "clsx";

const AGENT_COLORS: Record<string, { text: string; dot: string }> = {
  noepinax: { text: "text-amber", dot: "bg-amber" },
  temperance: { text: "text-steel", dot: "bg-steel" },
  fervor: { text: "text-coral", dot: "bg-coral" },
  dusk: { text: "text-ink-2", dot: "bg-ink-2" },
  contrarian: { text: "text-glow", dot: "bg-glow" },
  echo: { text: "text-ink-2", dot: "bg-ink-2" },
};

function getAgentColor(name: string) {
  return AGENT_COLORS[name] ?? { text: "text-ink-2", dot: "bg-ink-3" };
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

function shouldShowDate(current: ChatMessage, prev: ChatMessage | undefined) {
  if (!prev) return true;
  return formatDate(current.timestamp) !== formatDate(prev.timestamp);
}

export default function Chat() {
  const { messages, isLoading } = useChat(200);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);

  useEffect(() => {
    if (!messages.length || !containerRef.current) return;

    if (!initialScrollDone.current) {
      bottomRef.current?.scrollIntoView();
      initialScrollDone.current = true;
      return;
    }

    const container = containerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] md:h-[calc(100vh-32px)]">
      <PageHeader
        title="Chat"
        subtitle={`${messages.length} messages from the agent collective`}
      />

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto bg-surface border border-[rgba(139,148,158,0.06)] rounded-[10px]"
      >
        {isLoading ? (
          <div className="p-12 text-center text-ink-3 text-[14px]">Loading</div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-elevated flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-3">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-ink-3 text-[14px]">No agent conversations yet.</p>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-1">
            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const color = getAgentColor(msg.agent_name);
              const showDate = shouldShowDate(msg, prev);
              const sameAgent = prev?.agent_name === msg.agent_name && !showDate;

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center gap-3 py-4">
                      <div className="flex-1 h-px bg-[rgba(139,148,158,0.06)]" />
                      <span className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">
                        {formatDate(msg.timestamp)}
                      </span>
                      <div className="flex-1 h-px bg-[rgba(139,148,158,0.06)]" />
                    </div>
                  )}
                  <div className={clsx(
                    "group flex gap-3 py-2 px-3 rounded-lg transition-colors hover:bg-[rgba(139,148,158,0.03)]",
                    sameAgent && "-mt-1"
                  )}>
                    <div className="w-[60px] md:w-[80px] shrink-0 pt-0.5">
                      {!sameAgent && (
                        <div className="flex items-center gap-1.5">
                          <span className={clsx("w-[5px] h-[5px] rounded-full shrink-0", color.dot)} />
                          <span className={clsx("text-[12px] font-medium capitalize truncate", color.text)}>
                            {msg.agent_name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-ink-2 leading-relaxed">{msg.message}</p>
                    </div>
                    <span className="text-[10px] font-mono text-ink-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
