import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH || "./noepinax.db";
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");

    const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
    db.exec(schema);
  }
  return db;
}
