"use client";

import { useState } from "react";
import { useMarketplaceListings, useSoldListings, type MarketplaceListing } from "@/hooks/useMarketplace";
import { useWallet } from "@/lib/wallet";
import { PageHeader } from "@/components/PageHeader";
import clsx from "clsx";

const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || "0xC41f4742d7F8A336C58273446095ee61973c1889";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function toGatewayUrl(url: string): string {
  if (url?.startsWith("ipfs://")) return url.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
  return url;
}

export default function Marketplace() {
  const [page, setPage] = useState(1);
  const [soldPage, setSoldPage] = useState(1);
  const { data, isLoading, refetch } = useMarketplaceListings(page);
  const { data: soldData } = useSoldListings(soldPage);
  const { address, connecting, connect, disconnect, buyNFT } = useWallet();
  const [buyingId, setBuyingId] = useState<number | null>(null);

  const handleBuy = async (listing: MarketplaceListing) => {
    if (!address) { connect(); return; }

    setBuyingId(listing.listing_id);
    try {
      const txHash = await buyNFT(MARKETPLACE_ADDRESS, listing.listing_id, listing.price);
      if (txHash) {
        await fetch(`${API_BASE}/internal/sale`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listing_id: listing.listing_id,
            buyer: address.slice(0, 8),
            buyer_address: address,
            tx_hash: txHash,
          }),
        });
        refetch();
      }
    } catch (err: any) {
      if (err.code !== "ACTION_REJECTED") {
        alert(err.message?.slice(0, 100) || "Transaction failed");
      }
    } finally {
      setBuyingId(null);
    }
  };

  const listings = data?.listings ?? [];
  const soldListings = soldData?.listings ?? [];
  const totalVolume = soldListings.reduce((s, item: any) => s + parseFloat(item.price || "0"), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market"
        subtitle="Secondary sales from the collector network"
        actions={
          address ? (
            <button
              onClick={disconnect}
              className="flex items-center gap-2.5 bg-surface border border-[rgba(139,148,158,0.06)] rounded-lg px-3.5 py-2 hover:border-emphasis transition-colors group"
            >
              <span className="w-[6px] h-[6px] rounded-full bg-glow animate-breathe" />
              <span className="font-mono text-[12px] text-ink-2 group-hover:text-ink transition-colors">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            </button>
          ) : (
            <button
              onClick={connect}
              disabled={connecting}
              className="bg-glow text-canvas text-[13px] font-semibold px-4 py-2 rounded-lg hover:brightness-110 active:brightness-95 transition-all disabled:opacity-50"
            >
              {connecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )
        }
      />

      {/* Stats strip */}
      <div className="flex items-center gap-6 py-3 border-y border-[rgba(139,148,158,0.06)]">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[18px] text-glow font-bold">{listings.length}</span>
          <span className="text-[11px] text-ink-3">listed</span>
        </div>
        <div className="w-px h-4 bg-[rgba(139,148,158,0.08)]" />
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[18px] text-ink font-bold">{soldListings.length}</span>
          <span className="text-[11px] text-ink-3">sold</span>
        </div>
        {totalVolume > 0 && (
          <>
            <div className="w-px h-4 bg-[rgba(139,148,158,0.08)]" />
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-[18px] text-ink font-bold">{totalVolume.toFixed(4)}</span>
              <span className="text-[11px] text-ink-3">ETH volume</span>
            </div>
          </>
        )}
      </div>

      {/* Listings grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-lg animate-pulse border border-[rgba(139,148,158,0.06)] aspect-[3/4]" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-elevated flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-3">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
            </svg>
          </div>
          <p className="text-ink-3 text-[13px]">No listings yet.</p>
          <p className="text-ink-4 text-[12px] mt-1">Collectors will list art after winning auctions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {listings.map((listing) => (
            <div
              key={listing.listing_id}
              className="bg-surface border border-[rgba(139,148,158,0.06)] rounded-lg overflow-hidden hover:border-emphasis transition-all duration-200 group flex flex-col"
            >
              <div className="aspect-[4/3] bg-raised relative overflow-hidden">
                {listing.image_url ? (
                  <img
                    src={toGatewayUrl(listing.image_url)}
                    alt={listing.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-4 font-mono text-[10px]">
                    #{listing.token_id}
                  </div>
                )}
              </div>

              <div className="p-3 flex flex-col flex-1">
                <h3 className="font-display text-[13px] font-semibold text-ink truncate leading-tight">
                  {listing.title || `Token #${listing.token_id}`}
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] text-ink-4">by</span>
                  <span className="text-[10px] text-steel font-medium capitalize">{listing.seller}</span>
                </div>

                <div className="flex items-end justify-between mt-auto pt-3">
                  <div>
                    <div className="font-mono text-[16px] text-glow font-bold leading-none tracking-tight">
                      {parseFloat(listing.price).toFixed(4)}
                    </div>
                    <span className="text-[10px] text-ink-4 font-mono">ETH</span>
                  </div>
                  <button
                    onClick={() => handleBuy(listing)}
                    disabled={buyingId === listing.listing_id}
                    className={clsx(
                      "px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all",
                      buyingId === listing.listing_id
                        ? "bg-elevated text-ink-3 cursor-wait"
                        : address
                          ? "bg-glow text-canvas hover:brightness-110 active:brightness-95"
                          : "bg-glow-dim text-glow border border-[rgba(57,255,133,0.15)] hover:border-[rgba(57,255,133,0.3)] hover:bg-[rgba(57,255,133,0.12)]"
                    )}
                  >
                    {buyingId === listing.listing_id ? "..." : "Buy"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.pages > 1 && (
        <Pagination page={page} pages={data.pages} onPageChange={setPage} />
      )}

      {/* Recently sold */}
      {soldListings.length > 0 && (
        <section className="pt-2">
          <p className="text-[11px] text-ink-3 uppercase tracking-widest font-medium mb-3">Recently Sold</p>
          <div className="bg-surface border border-[rgba(139,148,158,0.06)] rounded-lg overflow-hidden">
            {soldListings.map((item: any, i: number) => (
              <div
                key={item.listing_id}
                className={clsx(
                  "px-4 py-3 flex items-center justify-between hover:bg-[rgba(139,148,158,0.03)] transition-colors",
                  i < soldListings.length - 1 && "border-b border-[rgba(139,148,158,0.04)]"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.image_url ? (
                    <img src={toGatewayUrl(item.image_url)} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-raised shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span className="text-[13px] text-ink font-medium truncate block">{item.title || `#${item.token_id}`}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-steel capitalize">{item.seller}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-4">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                      <span className="text-[10px] text-ink-2 font-mono">{item.buyer_address?.slice(0, 6)}...{item.buyer_address?.slice(-4)}</span>
                    </div>
                  </div>
                </div>
                <span className="font-mono text-[13px] text-glow font-medium shrink-0 ml-4">
                  {parseFloat(item.price).toFixed(4)} ETH
                </span>
              </div>
            ))}
          </div>
          {soldData && soldData.pages > 1 && (
            <Pagination page={soldPage} pages={soldData.pages} onPageChange={setSoldPage} />
          )}
        </section>
      )}
    </div>
  );
}

function Pagination({ page, pages, onPageChange }: { page: number; pages: number; onPageChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-3 pt-3">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="text-[12px] text-ink-2 hover:text-ink disabled:text-ink-4 disabled:cursor-not-allowed px-2.5 py-1 rounded-md hover:bg-[rgba(139,148,158,0.06)] active:bg-[rgba(139,148,158,0.1)] transition-colors"
      >
        Prev
      </button>
      <span className="font-mono text-[10px] text-ink-3">{page} / {pages}</span>
      <button
        onClick={() => onPageChange(Math.min(pages, page + 1))}
        disabled={page === pages}
        className="text-[12px] text-ink-2 hover:text-ink disabled:text-ink-4 disabled:cursor-not-allowed px-2.5 py-1 rounded-md hover:bg-[rgba(139,148,158,0.06)] active:bg-[rgba(139,148,158,0.1)] transition-colors"
      >
        Next
      </button>
    </div>
  );
}
