"use client";

import { useArtwork } from "@/hooks/useArtworks";
import Link from "next/link";
import clsx from "clsx";

function toGatewayUrl(url: string): string {
  if (url.startsWith("ipfs://")) return url.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
  return url;
}

export default function ArtworkDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: artwork, isLoading } = useArtwork(id);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-[960px]">
        <div className="h-5 w-28 bg-surface rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 md:gap-6">
          <div className="aspect-square bg-surface rounded-lg animate-pulse max-w-[240px]" />
          <div className="space-y-3">
            <div className="h-7 w-48 bg-surface rounded animate-pulse" />
            <div className="h-4 w-24 bg-surface rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!artwork) return <p className="text-ink-3">Artwork not found</p>;

  const decision = artwork.decision;
  const createdAt = artwork.created_at
    ? new Date(artwork.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
    : null;
  const bidCount = artwork.bids?.length ?? 0;
  const highestBid = bidCount > 0
    ? Math.max(...artwork.bids.map((b: any) => parseFloat(b.amount))).toFixed(4)
    : null;

  return (
    <div className="max-w-[960px] space-y-6">
      <Link href="/gallery" className="inline-flex items-center gap-2 text-[13px] text-ink-3 hover:text-ink transition-colors group">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="transition-transform group-hover:-translate-x-1">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to gallery
      </Link>

      {/* Hero: image left, identity right */}
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 md:gap-6 items-start">
        <div className="bg-surface border border-[rgba(139,148,158,0.06)] rounded-lg overflow-hidden max-w-[240px]">
          <div className="aspect-square bg-raised">
            {artwork.image_url ? (
              <img
                src={toGatewayUrl(artwork.image_url)}
                alt={artwork.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-ink-3 font-mono text-[11px]">
                {artwork.ipfs_uri}
              </div>
            )}
          </div>
        </div>

        <div className="py-1">
          <h1 className="font-display text-[28px] font-bold tracking-tight text-ink leading-none">
            {artwork.title}
          </h1>
          <p className="font-mono text-[11px] text-ink-4 mt-2">Art #{artwork.token_id}</p>

          {artwork.owner ? (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-[12px] text-ink-3">Owned by</span>
              <span className="text-[13px] text-steel font-medium capitalize">{artwork.owner}</span>
            </div>
          ) : (
            <div className="mt-4">
              <span className="text-[11px] text-amber px-2 py-0.5 bg-amber-dim rounded-md font-medium">On auction</span>
            </div>
          )}

          {/* Inline stats row */}
          <div className="flex flex-wrap items-center gap-4 md:gap-6 mt-4 md:mt-6 pt-4 border-t border-[rgba(139,148,158,0.06)]">
            <div>
              <span className="font-mono text-[22px] text-glow font-bold leading-none">{bidCount}</span>
              <span className="text-[11px] text-ink-3 ml-1.5">{bidCount === 1 ? "bid" : "bids"}</span>
            </div>
            {decision && (
              <div>
                <span className="font-mono text-[22px] text-coral font-bold leading-none">{decision.reserve_price}</span>
                <span className="text-[11px] text-ink-3 ml-1.5">ETH floor</span>
              </div>
            )}
            {highestBid && (
              <div>
                <span className="font-mono text-[22px] text-ink font-bold leading-none">{highestBid}</span>
                <span className="text-[11px] text-ink-3 ml-1.5">ETH top bid</span>
              </div>
            )}
            {createdAt && (
              <div className="ml-auto">
                <span className="text-[12px] text-ink-3">{createdAt}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail panels */}
      <div className={clsx(
        "grid gap-4",
        bidCount > 0 ? "grid-cols-1 lg:grid-cols-[1fr_1fr]" : "grid-cols-1 max-w-[560px]"
      )}>
        {decision && (
          <div className="bg-surface border border-[rgba(139,148,158,0.06)] rounded-lg p-5">
            <p className="text-[11px] text-ink-3 uppercase tracking-widest mb-4 font-medium">Creative Parameters</p>
            <div className="space-y-4">
              <Param label="Warmth" value={decision.palette_warmth} color="bg-coral" />
              <Param label="Complexity" value={decision.complexity} color="bg-amber" />
              <Param label="Density" value={decision.density} color="bg-steel" />
              <div className="flex justify-between items-center pt-1">
                <span className="text-[13px] text-ink-2">Mood</span>
                <span className="text-[12px] text-ink capitalize px-2 py-0.5 bg-elevated rounded-md">{decision.mood}</span>
              </div>
            </div>
            {decision.reasoning && (
              <p className="text-[13px] text-ink-2 mt-4 leading-relaxed border-t border-[rgba(139,148,158,0.06)] pt-4 italic opacity-80">
                &ldquo;{decision.reasoning}&rdquo;
              </p>
            )}
          </div>
        )}

        {bidCount > 0 && (
          <div className="bg-surface border border-[rgba(139,148,158,0.06)] rounded-lg p-5">
            <p className="text-[11px] text-ink-3 uppercase tracking-widest mb-4 font-medium">Bid History</p>
            <div className="space-y-0">
              {artwork.bids.map((bid: any, i: number) => (
                <div
                  key={bid.id}
                  className={clsx(
                    "flex items-center justify-between py-2.5",
                    i < artwork.bids.length - 1 && "border-b border-[rgba(139,148,158,0.04)]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      "w-[5px] h-[5px] rounded-full",
                      i === 0 ? "bg-glow" : "bg-ink-4"
                    )} />
                    <span className="text-[13px] text-ink capitalize font-medium">{bid.collector_name}</span>
                  </div>
                  <span className={clsx(
                    "font-mono text-[13px] font-medium",
                    i === 0 ? "text-coral" : "text-ink-2"
                  )}>
                    {bid.amount} ETH
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Param({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] text-ink-2">{label}</span>
        <span className="font-mono text-[11px] text-ink-3">{value.toFixed(2)}</span>
      </div>
      <div className="h-[3px] bg-elevated rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${value * 100}%`, opacity: 0.4 + value * 0.6 }}
        />
      </div>
    </div>
  );
}
