import { Router } from "express";
import type Database from "better-sqlite3";

export function chatRouter(db: Database.Database): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const messages = db
      .prepare("SELECT * FROM chat_messages ORDER BY id DESC LIMIT ?")
      .all(limit)
      .reverse();
    res.json({ messages });
  });

  return router;
}
