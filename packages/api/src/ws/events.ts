import type { WebSocket } from "ws";
import type { Client } from "@libsql/client";
import { createQueries, query } from "../db/queries.js";

export class EventBroadcaster {
  private clients: Set<WebSocket> = new Set();
  private lastLogId = 0;
  private lastChatId = 0;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private db: Client;

  constructor(db: Client) {
    this.db = db;
  }

  async init(): Promise<void> {
    const logRow = await query(this.db, "SELECT MAX(id) as maxId FROM cycle_logs").get();
    this.lastLogId = logRow?.maxId ?? 0;

    const chatRow = await query(this.db, "SELECT MAX(id) as maxId FROM chat_messages").get();
    this.lastChatId = chatRow?.maxId ?? 0;
  }

  addClient(ws: WebSocket): void {
    this.clients.add(ws);
    ws.on("close", () => this.clients.delete(ws));

    if (!this.pollInterval) {
      this.startPolling();
    }
  }

  private startPolling(): void {
    const q = createQueries(this.db);
    const recentChat = query(this.db, "SELECT * FROM chat_messages WHERE id > ? ORDER BY id ASC");

    this.pollInterval = setInterval(async () => {
      if (this.clients.size === 0) return;

      try {
        const newLogs = await q.getRecentLogs.all(this.lastLogId) as any[];
        for (const log of newLogs) {
          this.lastLogId = log.id;
          const event = {
            event: `cycle:${log.phase}`,
            data: {
              agent_id: log.agent_id,
              cycle_id: log.cycle_id,
              phase: log.phase,
              ...JSON.parse(log.log_data as string),
            },
            timestamp: log.timestamp,
          };
          this.broadcast(JSON.stringify(event));
        }

        const newChats = await recentChat.all(this.lastChatId) as any[];
        for (const chat of newChats) {
          this.lastChatId = chat.id;
          this.broadcast(JSON.stringify({
            event: "chat:message",
            data: {
              id: chat.id,
              agent_name: chat.agent_name,
              agent_role: chat.agent_role,
              message: chat.message,
              context: chat.context ? JSON.parse(chat.context) : null,
            },
            timestamp: chat.timestamp,
          }));
        }
      } catch (err) {
        console.error("[ws] poll error:", err);
      }
    }, 2000);
  }

  private broadcast(message: string): void {
    for (const client of this.clients) {
      if (client.readyState === 1) {
        client.send(message);
      }
    }
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}
