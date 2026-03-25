import { Router } from "express";
import type { Client } from "@libsql/client";
import { createQueries } from "../db/queries.js";

export function logsRouter(db: Client): Router {
  const router = Router();
  const q = createQueries(db);

  router.get("/", async (req, res) => {
    const agent = (req.query.agent as string) || "all";
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const logs = await q.getLogs.all({ agent_id: agent, limit, offset });
    const { count } = await q.getLogCount.get({ agent_id: agent });

    res.json({
      logs: (logs as any[]).map((row) => ({
        ...row,
        log_data: JSON.parse(row.log_data as string),
      })),
      total: count,
      page,
      pages: Math.ceil(count / limit),
    });
  });

  return router;
}
