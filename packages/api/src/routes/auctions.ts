import { Router } from "express";
import type { Client } from "@libsql/client";
import { createQueries } from "../db/queries.js";

export function auctionsRouter(db: Client): Router {
  const router = Router();
  const q = createQueries(db);

  router.get("/", async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const auctions = await q.getAuctions.all(limit, offset);
    res.json({ auctions });
  });

  router.get("/active", async (_req, res) => {
    const auctions = await q.getActiveAuctions.all();
    res.json(auctions);
  });

  router.get("/:id", async (req, res) => {
    const auction = await q.getAuction.get(req.params.id);
    if (!auction) return res.status(404).json({ error: "Auction not found" });

    const bids = await q.getBidsForAuction.all(req.params.id);
    res.json({ ...auction, bids });
  });

  return router;
}
