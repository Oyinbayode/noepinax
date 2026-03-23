import { Router } from "express";
import type Database from "better-sqlite3";
import { createQueries } from "../db/queries.js";

export function economyRouter(db: Database.Database): Router {
  const router = Router();
  const q = createQueries(db);

  router.get("/", (_req, res) => {
    const priceTrends = q.getPriceTrends.all();
    const collectorStats = q.getCollectorStats.all();
    const earningsByDay = q.getEarningsByDay.all();

    res.json({ priceTrends, collectorStats, earningsByDay });
  });

  return router;
}
