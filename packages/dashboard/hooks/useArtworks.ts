"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export function useArtworks(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["artworks", page, limit],
    queryFn: () => apiFetch<{ artworks: any[]; total: number; pages: number }>(
      `/api/artworks?page=${page}&limit=${limit}`
    ),
  });
}

export function useArtwork(id: string) {
  return useQuery({
    queryKey: ["artwork", id],
    queryFn: () => apiFetch<any>(`/api/artworks/${id}`),
  });
}
