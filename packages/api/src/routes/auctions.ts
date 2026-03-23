import { Router } from "express";
import type Database from "better-sqlite3";
import { createQueries } from "../db/queries.js";

export function auctionsRouter(db: Database.Database): Router {
  const router = Router();
  const q = createQueries(db);

  router.get("/", (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const auctions = q.getAuctions.all(limit, offset);
    res.json({ auctions });
  });

  router.get("/active", (_req, res) => {
    const auctions = q.getActiveAuctions.all();
    res.json(auctions);
  });

  router.get("/:id", (req, res) => {
    const auction = q.getAuction.get(req.params.id);
    if (!auction) return res.status(404).json({ error: "Auction not found" });

    const bids = q.getBidsForAuction.all(req.params.id);
    res.json({ ...auction, bids });
  });

  return router;
}
