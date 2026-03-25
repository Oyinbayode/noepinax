import { Router } from "express";
import type { Client } from "@libsql/client";
import { createQueries } from "../db/queries.js";

export function economyRouter(db: Client): Router {
  const router = Router();
  const q = createQueries(db);

  router.get("/", async (_req, res) => {
    const priceTrends = await q.getPriceTrends.all();
    const collectorStats = await q.getCollectorStats.all();
    const earningsByDay = await q.getEarningsByDay.all();

    res.json({ priceTrends, collectorStats, earningsByDay });
  });

  return router;
}
