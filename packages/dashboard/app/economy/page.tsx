"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import clsx from "clsx";
import { AgentIcon } from "@/components/AgentIcon";
import { PageHeader } from "@/components/PageHeader";

export default function Economy() {
  const { data } = useQuery({
    queryKey: ["economy"],
    queryFn: () => apiFetch<{ priceTrends: any[]; collectorStats: any[]; earningsByDay: any[] }>("/api/economy"),
  });

  const { data: budgetData } = useQuery({
    queryKey: ["budget"],
    queryFn: () => apiFetch<{ gasByAgent: any[] }>("/api/budget"),
  });

  const settled = data?.priceTrends?.filter((t: any) => t.status === "settled" && t.final_price) ?? [];
  const totalRevenue = settled.reduce((sum: number, t: any) => sum + parseFloat(t.final_price || "0"), 0);

  const stats = [
    { label: "Revenue", value: `${totalRevenue.toFixed(4)} ETH`, color: "text-glow" },
    { label: "Minted", value: data?.priceTrends?.length ?? 0, color: "text-glow" },
    { label: "Settled", value: settled.length, color: "text-glow" },
    { label: "Collectors", value: data?.collectorStats?.length ?? 0, color: "text-glow" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Economy"
        subtitle="Art market dynamics"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, color }) => (
          <div key={label} className="bg-surface border border-[rgba(139,148,158,0.06)] rounded-[10px] p-5 hover:border-[rgba(139,148,158,0.12)] transition-all duration-200">
            <div className="text-[11px] text-ink-3 uppercase tracking-wider mb-3 font-medium">{label}</div>
            <div className={clsx("font-display text-[26px] font-bold tracking-tight", color)}>{value}</div>
          </div>
        ))}
      </div>

      <section>
        <SectionLabel>Collector Activity</SectionLabel>
        <div className="bg-surface border border-[rgba(139,148,158,0.06)] rounded-[10px] overflow-hidden">
          {!data?.collectorStats?.length ? (
            <div className="p-12 text-center text-ink-3 text-[14px]">No bids yet</div>
          ) : (
            <div className="divide-y divide-[rgba(139,148,158,0.04)]">
              {data.collectorStats.map((stat: any) => (
                <div key={stat.collector_name} className="px-5 py-4 flex items-center justify-between hover:bg-[rgba(139,148,158,0.03)] transition-colors">
                  <div className="flex items-center gap-3">
                    <AgentIcon name={stat.collector_name} size={32} />
                    <span className="text-[14px] text-ink capitalize font-medium">{stat.collector_name}</span>
                  </div>
                  <div className="flex items-center gap-8">
                    <span className="font-mono text-[13px] text-ink-2">{stat.bid_count} <span className="text-ink-3 text-[11px]">bids</span></span>
                    <span className="font-mono text-[13px] text-glow w-28 text-right font-medium">{parseFloat(stat.total_spent || 0).toFixed(4)} <span className="text-ink-3 text-[11px]">ETH</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {data?.earningsByDay && data.earningsByDay.length > 0 && (
        <section>
          <SectionLabel>Earnings</SectionLabel>
          <div className="bg-surface border border-[rgba(139,148,158,0.06)] rounded-[10px] p-5">
            <div className="flex items-end gap-2 h-[140px]">
              {(() => {
                const maxRevenue = Math.max(...data.earningsByDay.map((d: any) => d.revenue));
                return data.earningsByDay.map((day: any, i: number) => {
                  const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group" title={`${day.day}: ${day.revenue.toFixed(4)} ETH (${day.sales} sales)`}>
                      <span className="font-mono text-[10px] text-glow opacity-0 group-hover:opacity-100 transition-opacity">
                        {day.revenue.toFixed(4)}
                      </span>
                      <div className="w-full flex justify-center">
                        <div
                          className="w-8 max-w-full bg-glow rounded-t transition-all duration-300"
                          style={{ height: `${Math.max(height, 4)}%`, opacity: 0.3 + (height / 100) * 0.7 }}
                        />
                      </div>
                      <span className="font-mono text-[9px] text-ink-3">{day.day.slice(5)}</span>
                    </div>
                  );
                });
              })()}
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[rgba(139,148,158,0.06)]">
              <span className="text-[12px] text-ink-3">
                {data.earningsByDay.reduce((s: number, d: any) => s + d.sales, 0)} total sales
              </span>
              <span className="font-mono text-[14px] text-glow font-medium">
                {data.earningsByDay.reduce((s: number, d: any) => s + d.revenue, 0).toFixed(4)} ETH earned
              </span>
            </div>
          </div>
        </section>
      )}

      {data?.priceTrends && data.priceTrends.length > 0 && (
        <PriceTimeline entries={data.priceTrends} />
      )}
    </div>
  );
}

const TIMELINE_PER_PAGE = 8;

function PriceTimeline({ entries }: { entries: any[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(entries.length / TIMELINE_PER_PAGE);
  const paged = entries.slice((page - 1) * TIMELINE_PER_PAGE, page * TIMELINE_PER_PAGE);

  return (
    <section>
      <SectionLabel>Price Timeline</SectionLabel>
      <div className="bg-surface border border-[rgba(139,148,158,0.06)] rounded-[10px] overflow-hidden">
        <div className="divide-y divide-[rgba(139,148,158,0.04)]">
          {paged.map((entry: any, i: number) => (
            <div key={i} className="px-4 md:px-5 py-3 md:py-4 flex items-center justify-between hover:bg-[rgba(139,148,158,0.03)] transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className={clsx("w-2 h-2 rounded-full shrink-0", entry.status === "settled" ? "bg-glow" : "bg-ink-3")} />
                <div className="min-w-0">
                  <span className="text-[13px] md:text-[14px] text-ink font-medium truncate block">{entry.title}</span>
                  <span className="text-[11px] text-ink-3">{new Date(entry.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 md:gap-6 shrink-0 ml-3">
                <span className="font-mono text-[11px] md:text-[12px] text-ink-3 hidden md:inline">reserve {entry.reserve_price || "---"}</span>
                {entry.status === "settled" ? (
                  <span className="font-mono text-[11px] md:text-[12px] text-glow font-medium">sold {entry.final_price || "---"}</span>
                ) : entry.current_bid ? (
                  <span className="font-mono text-[11px] md:text-[12px] text-glow font-medium">bid {entry.current_bid}</span>
                ) : (
                  <span className="font-mono text-[11px] md:text-[12px] text-ink-3">no bids</span>
                )}
              </div>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 py-3 border-t border-[rgba(139,148,158,0.06)]">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-[12px] text-ink-2 hover:text-ink disabled:text-ink-4 disabled:cursor-not-allowed px-2.5 py-1 rounded-md hover:bg-[rgba(139,148,158,0.06)] transition-colors"
            >
              Prev
            </button>
            <span className="font-mono text-[10px] text-ink-3">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-[12px] text-ink-2 hover:text-ink disabled:text-ink-4 disabled:cursor-not-allowed px-2.5 py-1 rounded-md hover:bg-[rgba(139,148,158,0.06)] transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-ink-3 uppercase tracking-widest font-medium mb-4">{children}</p>
  );
}
