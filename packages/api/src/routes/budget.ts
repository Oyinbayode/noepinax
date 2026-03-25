import { Router } from "express";
import type { Client } from "@libsql/client";
import { query } from "../db/queries.js";

export function budgetRouter(db: Client): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    const gasByAgent = await query(db, `
      SELECT agent_id, SUM(CAST(gas_used AS REAL)) as total_gas, COUNT(*) as tx_count
      FROM transactions GROUP BY agent_id
    `).all();

    res.json({ gasByAgent });
  });

  return router;
}
