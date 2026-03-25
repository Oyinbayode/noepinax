import { Router } from "express";
import type { Client } from "@libsql/client";
import { createQueries, query } from "../db/queries.js";

export function artworksRouter(db: Client): Router {
  const router = Router();
  const q = createQueries(db);

  router.get("/", async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const artworks = await q.getArtworks.all(limit, offset);
    const { count } = await q.getArtworkCount.get();

    res.json({
      artworks: artworks.map(parseJsonFields),
      total: count,
      page,
      pages: Math.ceil(count / limit),
    });
  });

  router.get("/token/:tokenId", async (req, res) => {
    const row = await query(db, "SELECT * FROM artworks WHERE token_id = ?").get(req.params.tokenId);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(parseJsonFields(row));
  });

  router.get("/:id", async (req, res) => {
    const artwork = await q.getArtwork.get(req.params.id);
    if (!artwork) return res.status(404).json({ error: "Artwork not found" });

    const bids = await q.getBidsForArtwork.all(req.params.id);
    res.json({ ...parseJsonFields(artwork), bids });
  });

  return router;
}

function parseJsonFields(row: any): any {
  return {
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    snapshot: row.snapshot ? JSON.parse(row.snapshot) : null,
    decision: row.decision ? JSON.parse(row.decision) : null,
  };
}
