// Entrypoint for the agent host (GCE e2-micro). This is the OLD start.mjs
// stripped of API spawning — the API now runs separately on Cloud Run, and
// this process only seeds + spawns the 6 agent loops.
//
// Required env:
//   API_URL              public URL of the Cloud Run API (https://...)
//   INTERNAL_API_TOKEN   shared secret enforced by the API on /internal/*
//   VENICE_API_KEY       LLM key
//   PINATA_JWT           IPFS pinning
//   ALCHEMY_API_KEY      (or BASE_SEPOLIA_RPC_URL)
//   AGENT_<NAME>_PRIVATE_KEY   one per agent
//   NOEPINAX_ART_ADDRESS, NOEPINAX_AUCTION_ADDRESS, NOEPINAX_MARKETPLACE_ADDRESS

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const apiUrl = process.env.API_URL;
const token = process.env.INTERNAL_API_TOKEN;
if (!apiUrl) {
  console.error("[start-agents] API_URL is required");
  process.exit(1);
}
if (!token) {
  console.error("[start-agents] INTERNAL_API_TOKEN is required");
  process.exit(1);
}

const AGENT_NAMES = ["noepinax", "temperance", "fervor", "dusk", "contrarian", "echo"];
const processes = [];

function spawnProc(label, cmd, args, cwd, extraEnv = {}) {
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (d) => process.stdout.write(`[${label}] ${d}`));
  child.stderr?.on("data", (d) => process.stderr.write(`[${label}] ${d}`));
  child.on("exit", (code) => {
    console.log(`[${label}] exited (${code})`);
    // If any agent dies, tear the whole container down — systemd (or the
    // Container-Optimized OS managed instance) will restart everything cleanly
    // instead of leaving us running with 5/6 agents indefinitely.
    console.error(`[start-agents] ${label} died — shutting down container`);
    for (const p of processes) {
      if (p !== child) p.kill("SIGTERM");
    }
    setTimeout(() => process.exit(code ?? 1), 1000);
  });
  processes.push(child);
  return child;
}

async function waitForApi(maxRetries = 60, delayMs = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${apiUrl}/health`);
      if (res.ok) {
        console.log("[start-agents] API is ready");
        return;
      }
    } catch {}
    console.log(`[start-agents] waiting for API at ${apiUrl}... (${i + 1}/${maxRetries})`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error("API did not become ready");
}

async function fetchErc8004Id(address) {
  try {
    const res = await fetch(`https://8004scan.io/api/v1/agents?owner_address=${address}&limit=1`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.items?.[0]?.token_id ?? null;
  } catch {
    return null;
  }
}

async function seedAgents() {
  const configDir = join(root, "packages", "agent", "dist", "config");

  for (const name of AGENT_NAMES) {
    const envKey = `AGENT_${name.toUpperCase()}_PRIVATE_KEY`;
    const pk = process.env[envKey];
    if (!pk) {
      console.log(`[seed] skipping ${name} — no private key`);
      continue;
    }

    const { privateKeyToAccount } = await import("viem/accounts");
    const address = privateKeyToAccount(pk).address;
    const configFile = name === "noepinax" ? "artist.json" : `${name}.json`;
    const config = JSON.parse(readFileSync(join(configDir, configFile), "utf-8"));

    const erc8004Id = await fetchErc8004Id(address);

    const res = await fetch(`${apiUrl}/internal/seed-agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: name,
        name,
        role: config.role,
        wallet_address: address,
        personality: config.personality,
        erc8004_id: erc8004Id,
      }),
    });
    console.log(`[seed] ${name} (${config.role}) -> ${address} [erc8004:#${erc8004Id ?? "?"}] [${res.ok ? "ok" : res.status}]`);
  }
}

function shutdown() {
  console.log("\n[start-agents] shutting down...");
  for (const p of processes) p.kill("SIGTERM");
  setTimeout(() => process.exit(0), 3000);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// 1. Wait for API
await waitForApi();

// 2. Seed agents
console.log("[start-agents] seeding agents...");
await seedAgents();

// 3. Spawn agents — artist first, collectors staggered
console.log("[start-agents] spawning agents...");
const agentEnv = { API_URL: apiUrl, INTERNAL_API_TOKEN: token };

spawnProc("noepinax", "node", ["packages/agent/dist/index.js"], root, {
  ...agentEnv,
  AGENT_NAME: "noepinax",
});

const collectors = AGENT_NAMES.filter((n) => n !== "noepinax");
collectors.forEach((name, i) => {
  setTimeout(() => {
    spawnProc(name, "node", ["packages/agent/dist/index.js"], root, {
      ...agentEnv,
      AGENT_NAME: name,
    });
  }, (i + 1) * 2000);
});
