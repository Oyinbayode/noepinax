import { Router } from "express";
import type { Client } from "@libsql/client";
import { createQueries } from "../db/queries.js";

export function agentsRouter(db: Client): Router {
  const router = Router();
  const q = createQueries(db);

  router.get("/", async (_req, res) => {
    const agents = await q.getAllAgents.all();
    res.json(agents);
  });

  router.get("/:id", async (req, res) => {
    const agent = await q.getAgent.get(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json(agent);
  });

  return router;
}
