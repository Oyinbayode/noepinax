"use client";

import { useWebSocket } from "@/lib/ws";
import { EventFeed } from "@/components/EventFeed";
import clsx from "clsx";

export default function Live() {
  const { messages, connected } = useWebSocket();

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between pb-6">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-t-primary">Live</h1>
          <p className="text-[13px] text-t-muted mt-1">Real-time agent activity stream</p>
        </div>
        <div className="flex items-center gap-2 bg-surface border border-[rgba(255,255,255,0.04)] rounded-lg px-3 py-1.5">
          <span className={clsx(
            "w-[6px] h-[6px] rounded-full",
            connected ? "bg-emerald animate-pulse-glow" : "bg-rose"
          )} />
          <span className="text-[11px] font-mono text-t-muted">
            {connected ? "connected" : "reconnecting"}
          </span>
        </div>
      </div>

      <EventFeed messages={messages} />
    </div>
  );
}
