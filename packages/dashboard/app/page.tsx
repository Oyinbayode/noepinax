"use client";

import { useAgents } from "@/hooks/useAgents";
import { useArtworks } from "@/hooks/useArtworks";
import { useWebSocket } from "@/lib/ws";
import { AgentCard } from "@/components/AgentCard";
import { AgentIcon } from "@/components/AgentIcon";
import { EventFeed } from "@/components/EventFeed";
import { PageHeader } from "@/components/PageHeader";
import clsx from "clsx";

export default function Observatory() {
  const { data: agents } = useAgents();
  const { data: artworksData } = useArtworks(1, 5);
  const { messages, connected } = useWebSocket();

  const artist = agents?.find((a: any) => a.role === "artist");
  const collectors = agents?.filter((a: any) => a.role === "collector") ?? [];

  const stats = [
    { label: "Artworks", value: artworksData?.total ?? 0 },
    { label: "Agents", value: agents?.length ?? 0 },
    { label: "Collectors", value: collectors.length },
  ];

  const statusBadge = (
    <div className="flex items-center gap-2 bg-surface border border-[rgba(139,148,158,0.06)] rounded-lg px-3 py-1.5">
      <span className={clsx(
        "w-[6px] h-[6px] rounded-full",
        connected ? "bg-glow animate-breathe" : "bg-ink-3"
      )} />
      <span className="text-[12px] font-mono text-ink-3">
        {connected ? "live" : "offline"}
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Observatory"
        subtitle="Autonomous art economy, observed in real time"
        actions={statusBadge}
      />

      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-surface border border-[rgba(139,148,158,0.06)] rounded-[10px] p-4 hover:border-[rgba(139,148,158,0.12)] transition-all duration-200">
            <div className="text-[11px] text-ink-3 uppercase tracking-wider font-medium mb-2">{label}</div>
            <div className="font-display text-[24px] md:text-[34px] font-bold tracking-tight leading-none text-glow">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-3 items-start">
        {artist && (
          <section>
            <SectionLabel>The Artist</SectionLabel>
            <div className="bg-surface border border-[rgba(139,148,158,0.06)] rounded-[10px] p-5 relative overflow-hidden h-[180px]">
              <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-glow-dim to-transparent rounded-bl-full opacity-60" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <AgentIcon name="noepinax" size={36} />
                  <div>
                    <h2 className="font-display text-[20px] font-bold text-ink">Noepinax</h2>
                    <span className="text-[11px] text-glow font-medium">autonomous creator</span>
                  </div>
                </div>
                <p className="text-[13px] text-ink-2 mt-2 leading-relaxed">
                  {artist.personality || "An autonomous artist who absorbs blockchain state and expresses it as generative visual art."}
                </p>
                <p className="font-mono text-[10px] text-ink-4 mt-3 group cursor-default" title={artist.wallet_address}>
                  {artist.wallet_address?.slice(0, 6)}...{artist.wallet_address?.slice(-4)}
                </p>
              </div>
            </div>
          </section>
        )}

        <section>
          <SectionLabel>Activity</SectionLabel>
          <EventFeed messages={messages} />
        </section>
      </div>

      <section>
        <SectionLabel>Collectors</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {collectors.map((agent: any) => (
            <AgentCard
              key={agent.id}
              name={agent.name}
              role={agent.role}
              personality={agent.personality}
              status={agent.status}
              walletAddress={agent.wallet_address}
            />
          ))}
          {collectors.length === 0 && (
            <p className="col-span-full text-[14px] text-ink-3 py-10 text-center">
              No collector agents registered yet
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-ink-3 uppercase tracking-widest font-medium mb-3">{children}</p>
  );
}
