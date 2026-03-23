import "dotenv/config";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import Database from "better-sqlite3";
import { privateKeyToAccount } from "viem/accounts";
import { AGENT_NAMES } from "@noepinax/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDb = join(__dirname, "..", "noepinax.db");
const apiDb = join(__dirname, "..", "packages", "api", "noepinax.db");
const dbPath = process.env.DATABASE_PATH || rootDb;

const db = new Database(dbPath, { fileMustExist: false });
db.pragma("journal_mode = WAL");

const schemaPath = join(__dirname, "..", "packages", "api", "src", "db", "schema.sql");
db.exec(readFileSync(schemaPath, "utf-8"));

const upsert = db.prepare(`
  INSERT INTO agents (id, name, role, wallet_address, personality, status)
  VALUES (?, ?, ?, ?, ?, 'idle')
  ON CONFLICT(id) DO UPDATE SET
    wallet_address = excluded.wallet_address,
    personality = excluded.personality
`);

const configDir = join(__dirname, "..", "packages", "agent", "src", "config");

for (const name of AGENT_NAMES) {
  const envKey = `AGENT_${name.toUpperCase()}_PRIVATE_KEY`;
  const pk = process.env[envKey] as `0x${string}`;
  if (!pk) {
    console.log(`skipping ${name} - no private key`);
    continue;
  }

  const address = privateKeyToAccount(pk).address;
  const configFile = name === "noepinax" ? "artist.json" : `${name}.json`;
  const config = JSON.parse(readFileSync(join(configDir, configFile), "utf-8"));

  upsert.run(name, name, config.role, address, config.personality);
  console.log(`seeded ${name} (${config.role}) -> ${address}`);
}

db.close();

// also seed the API's local db so `pnpm dev` from packages/api works
if (dbPath !== apiDb) {
  const db2 = new Database(apiDb, { fileMustExist: false });
  db2.pragma("journal_mode = WAL");
  db2.exec(readFileSync(schemaPath, "utf-8"));
  const upsert2 = db2.prepare(`
    INSERT INTO agents (id, name, role, wallet_address, personality, status)
    VALUES (?, ?, ?, ?, ?, 'idle')
    ON CONFLICT(id) DO UPDATE SET
      wallet_address = excluded.wallet_address,
      personality = excluded.personality
  `);
  for (const name of AGENT_NAMES) {
    const envKey = `AGENT_${name.toUpperCase()}_PRIVATE_KEY`;
    const pk = process.env[envKey] as `0x${string}`;
    if (!pk) continue;
    const address = privateKeyToAccount(pk).address;
    const configFile = name === "noepinax" ? "artist.json" : `${name}.json`;
    const config = JSON.parse(readFileSync(join(configDir, configFile), "utf-8"));
    upsert2.run(name, name, config.role, address, config.personality);
  }
  db2.close();
  console.log("also seeded packages/api/noepinax.db");
}

console.log("\ndone.");
