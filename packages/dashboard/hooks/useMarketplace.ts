"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface MarketplaceListing {
  id: number;
  listing_id: number;
  token_id: number;
  seller: string;
  seller_address: string;
  price: string;
  status: string;
  buyer: string | null;
  title: string;
  image_url: string;
  decision: { mood: string; palette_warmth: number; complexity: number } | null;
  created_at: string;
}

export function useMarketplaceListings(page = 1, limit = 12) {
  return useQuery({
    queryKey: ["marketplace", page, limit],
    queryFn: () => apiFetch<{ listings: MarketplaceListing[]; total: number; pages: number }>(
      `/api/marketplace?page=${page}&limit=${limit}`
    ),
    refetchInterval: 10000,
  });
}

export function useSoldListings(page = 1, limit = 10) {
  return useQuery({
    queryKey: ["marketplace-sold", page, limit],
    queryFn: () => apiFetch<{ listings: MarketplaceListing[]; total: number; pages: number }>(
      `/api/marketplace/sold?page=${page}&limit=${limit}`
    ),
    refetchInterval: 30000,
  });
}
