import { Router } from "express";
import type Database from "better-sqlite3";

export function marketplaceRouter(db: Database.Database): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const status = req.query.status || "active";
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 12, 50);
    const offset = (page - 1) * limit;

    const { count } = db.prepare(
      "SELECT COUNT(*) as count FROM marketplace_listings ml LEFT JOIN artworks a ON a.token_id = ml.token_id WHERE ml.status = ? AND a.title IS NOT NULL"
    ).get(status) as { count: number };

    const listings = db.prepare(`
      SELECT ml.*, a.title, a.image_url, a.metadata, a.decision
      FROM marketplace_listings ml
      LEFT JOIN artworks a ON a.token_id = ml.token_id
      WHERE ml.status = ? AND a.title IS NOT NULL
      ORDER BY ml.created_at DESC
      LIMIT ? OFFSET ?
    `).all(status, limit, offset);

    const parsed = listings.map((row: any) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      decision: row.decision ? JSON.parse(row.decision) : null,
    }));

    res.json({ listings: parsed, total: count, page, pages: Math.ceil(count / limit) });
  });

  router.get("/sold", (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = (page - 1) * limit;

    const { count } = db.prepare(
      "SELECT COUNT(*) as count FROM marketplace_listings WHERE status = 'sold'"
    ).get() as { count: number };

    const sold = db.prepare(`
      SELECT ml.*, a.title, a.image_url
      FROM marketplace_listings ml
      LEFT JOIN artworks a ON a.token_id = ml.token_id
      WHERE ml.status = 'sold'
      ORDER BY ml.sold_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    res.json({ listings: sold, total: count, page, pages: Math.ceil(count / limit) });
  });

  return router;
}
