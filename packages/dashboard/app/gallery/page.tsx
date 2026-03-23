"use client";

import { useState } from "react";
import { useArtworks } from "@/hooks/useArtworks";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

function toGatewayUrl(url: string): string {
  if (url.startsWith("ipfs://")) return url.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
  return url;
}

export default function Gallery() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useArtworks(page, 20);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gallery"
        subtitle={`${data?.total ?? 0} works by Noepinax`}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-surface rounded-[10px] animate-pulse border border-[rgba(139,148,158,0.06)]" />
          ))}
        </div>
      ) : data?.artworks.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-elevated flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-3">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
          <p className="text-ink-3 text-[14px]">The artist has not created any works yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data?.artworks.map((artwork: any) => (
            <Link key={artwork.id} href={`/gallery/${artwork.id}`} className="group">
              <div className="bg-surface border border-[rgba(139,148,158,0.06)] rounded-[10px] overflow-hidden transition-all duration-200 hover:border-[rgba(139,148,158,0.12)] hover:translate-y-[-2px]">
                <div className="aspect-square bg-raised relative overflow-hidden">
                  {artwork.image_url ? (
                    <img
                      src={toGatewayUrl(artwork.image_url)}
                      alt={artwork.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-3 font-mono text-[11px]">
                      {artwork.ipfs_uri?.slice(0, 20)}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-display text-[14px] font-semibold text-ink truncate">{artwork.title}</h3>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="font-mono text-[10px] text-ink-3">#{artwork.token_id}</span>
                    {artwork.owner ? (
                      <span className="text-[10px] text-steel capitalize px-1.5 py-0.5 bg-steel-dim rounded-md">{artwork.owner}</span>
                    ) : artwork.decision?.mood ? (
                      <span className="text-[10px] text-ink-2 capitalize px-1.5 py-0.5 bg-elevated rounded-md">{artwork.decision.mood}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
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
