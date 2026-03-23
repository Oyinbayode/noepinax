import { Router } from "express";
import type Database from "better-sqlite3";

export function budgetRouter(db: Database.Database): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    const gasByAgent = db.prepare(`
      SELECT agent_id, SUM(CAST(gas_used AS REAL)) as total_gas, COUNT(*) as tx_count
      FROM transactions GROUP BY agent_id
    `).all();

    res.json({ gasByAgent });
  });

  return router;
}
