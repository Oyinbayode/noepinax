import { Router } from "express";
import type { Client } from "@libsql/client";
import { query } from "../db/queries.js";

export function chatRouter(db: Client): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const messages = (await query(db, "SELECT * FROM chat_messages ORDER BY id DESC LIMIT ?").all(limit)).reverse();
    res.json({ messages });
  });

  return router;
}
