import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let client: Client | null = null;

export async function initDb(): Promise<Client> {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
    await client.executeMultiple(schema);
  }
  return client;
}

export function getDb(): Client {
  if (!client) throw new Error("Database not initialized — call initDb() first");
  return client;
}
