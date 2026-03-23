import { Router } from "express";
import type Database from "better-sqlite3";
import { createQueries } from "../db/queries.js";

export function agentsRouter(db: Database.Database): Router {
  const router = Router();
  const q = createQueries(db);

  router.get("/", (_req, res) => {
    const agents = q.getAllAgents.all();
    res.json(agents);
  });

  router.get("/:id", (req, res) => {
    const agent = q.getAgent.get(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json(agent);
  });

  return router;
}
