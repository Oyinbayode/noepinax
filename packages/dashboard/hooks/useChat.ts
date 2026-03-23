"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useWebSocket } from "@/lib/ws";

export interface ChatMessage {
  id: number;
  agent_name: string;
  agent_role: string;
  message: string;
  context: Record<string, unknown> | null;
  timestamp: string;
}

export function useChat(limit = 100) {
  const { data, isLoading } = useQuery({
    queryKey: ["chat", limit],
    queryFn: () => apiFetch<{ messages: ChatMessage[] }>(`/api/chat?limit=${limit}`),
  });

  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const { messages: wsMessages } = useWebSocket();
  const lastProcessedRef = useRef(0);

  const processWsMessages = useCallback(() => {
    const chatEvents = wsMessages.filter(
      (m) => m.event === "chat:message" && (m.data.id as number) > lastProcessedRef.current
    );
    if (chatEvents.length === 0) return;

    const newMessages = chatEvents.map((e) => ({
      id: e.data.id as number,
      agent_name: e.data.agent_name as string,
      agent_role: e.data.agent_role as string,
      message: e.data.message as string,
      context: e.data.context as Record<string, unknown> | null,
      timestamp: e.timestamp,
    }));

    const maxId = Math.max(...newMessages.map((m) => m.id));
    lastProcessedRef.current = maxId;
    setLiveMessages((prev) => [...prev, ...newMessages]);
  }, [wsMessages]);

  useEffect(() => {
    processWsMessages();
  }, [processWsMessages]);

  const allMessages = [...(data?.messages ?? []), ...liveMessages];
  const seen = new Set<number>();
  const deduplicated = allMessages.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  return { messages: deduplicated, isLoading };
}
