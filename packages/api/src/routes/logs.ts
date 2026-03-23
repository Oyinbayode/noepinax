import { Router } from "express";
import type Database from "better-sqlite3";
import { createQueries } from "../db/queries.js";

export function logsRouter(db: Database.Database): Router {
  const router = Router();
  const q = createQueries(db);

  router.get("/", (req, res) => {
    const agent = (req.query.agent as string) || "all";
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const logs = q.getLogs.all({ agent_id: agent, limit, offset });
    const { count } = q.getLogCount.get({ agent_id: agent }) as { count: number };

    res.json({
      logs: (logs as any[]).map((row) => ({
        ...row,
        log_data: JSON.parse(row.log_data),
      })),
      total: count,
      page,
      pages: Math.ceil(count / limit),
    });
  });

  return router;
}
