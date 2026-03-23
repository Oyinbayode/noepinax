import type { WebSocket } from "ws";
import type Database from "better-sqlite3";
import { createQueries } from "../db/queries.js";

export class EventBroadcaster {
  private clients: Set<WebSocket> = new Set();
  private lastLogId = 0;
  private lastChatId = 0;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;

    const logRow = db.prepare("SELECT MAX(id) as maxId FROM cycle_logs").get() as { maxId: number | null };
    this.lastLogId = logRow?.maxId ?? 0;

    const chatRow = db.prepare("SELECT MAX(id) as maxId FROM chat_messages").get() as { maxId: number | null };
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

    const getRecentChat = this.db.prepare("SELECT * FROM chat_messages WHERE id > ? ORDER BY id ASC");

    this.pollInterval = setInterval(() => {
      if (this.clients.size === 0) return;

      const newLogs = q.getRecentLogs.all(this.lastLogId) as any[];
      for (const log of newLogs) {
        this.lastLogId = log.id;
        const event = {
          event: `cycle:${log.phase}`,
          data: {
            agent_id: log.agent_id,
            cycle_id: log.cycle_id,
            phase: log.phase,
            ...JSON.parse(log.log_data),
          },
          timestamp: log.timestamp,
        };
        this.broadcast(JSON.stringify(event));
      }

      const newChats = getRecentChat.all(this.lastChatId) as any[];
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
