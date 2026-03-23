import { Router } from "express";
import type Database from "better-sqlite3";
import { createQueries } from "../db/queries.js";

export function artworksRouter(db: Database.Database): Router {
  const router = Router();
  const q = createQueries(db);

  router.get("/", (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const artworks = q.getArtworks.all(limit, offset);
    const { count } = q.getArtworkCount.get() as { count: number };

    res.json({
      artworks: artworks.map(parseJsonFields),
      total: count,
      page,
      pages: Math.ceil(count / limit),
    });
  });

  router.get("/token/:tokenId", (req, res) => {
    const row = db.prepare("SELECT * FROM artworks WHERE token_id = ?").get(req.params.tokenId);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(parseJsonFields(row));
  });

  router.get("/:id", (req, res) => {
    const artwork = q.getArtwork.get(req.params.id);
    if (!artwork) return res.status(404).json({ error: "Artwork not found" });

    const bids = q.getBidsForArtwork.all(req.params.id);
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
