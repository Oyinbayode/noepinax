"use client";

import { useEffect, useState } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws";

export interface WSMessage {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// Module-level singleton. Previously every component that called
// useWebSocket() opened its own connection with its own state, so the Sidebar
// and the page disagreed about "connected" and the indicator flickered as
// each socket reconnected on a different schedule. One shared socket → one
// truth, broadcast via subscribers.

type Subscriber = (state: { messages: WSMessage[]; connected: boolean }) => void;

let ws: WebSocket | null = null;
let messages: WSMessage[] = [];
let connected = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
const subscribers = new Set<Subscriber>();

function emit() {
  const snapshot = { messages, connected };
  for (const fn of subscribers) fn(snapshot);
}

function clearTimers() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
}

function connect() {
  if (typeof window === "undefined") return;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  const socket = new WebSocket(WS_URL);
  ws = socket;

  socket.onopen = () => {
    connected = true;
    emit();
    // Cloud Run's frontend reaps idle connections after ~60s of silence. A
    // 25s ping keeps the socket alive between agent events.
    pingTimer = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        try { socket.send("ping"); } catch {}
      }
    }, 25000);
  };

  socket.onclose = () => {
    connected = false;
    emit();
    clearTimers();
    reconnectTimer = setTimeout(connect, 3000);
  };

  socket.onerror = () => {
    // onclose will fire next; nothing to do here.
  };

  socket.onmessage = (e) => {
    if (e.data === "pong") return;
    try {
      const msg: WSMessage = JSON.parse(e.data);
      messages = [msg, ...messages].slice(0, 100);
      emit();
    } catch {}
  };
}

function ensureConnected() {
  if (!ws && !reconnectTimer) connect();
}

export function useWebSocket() {
  const [state, setState] = useState({ messages, connected });

  useEffect(() => {
    subscribers.add(setState);
    ensureConnected();
    // Snapshot may have changed between render and effect — sync once.
    setState({ messages, connected });
    return () => {
      subscribers.delete(setState);
      // Don't tear down the socket on unmount: other components may still be
      // subscribed, and even if they aren't, the next mount will want it
      // immediately. The socket lives for the page's lifetime.
    };
  }, []);

  return state;
}
