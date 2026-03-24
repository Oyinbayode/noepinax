import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const apiPort = process.env.API_PORT || "10000";
const apiUrl = process.env.API_URL || `http://localhost:${apiPort}`;
const processes = [];

const AGENT_NAMES = ["noepinax", "temperance", "fervor", "dusk", "contrarian", "echo"];

let apiDied = false;
let apiExitCode = null;

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
    if (label === "api") {
      apiDied = true;
      apiExitCode = code;
    }
  });
  processes.push(child);
  return child;
}

async function waitForApi(maxRetries = 30, delayMs = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${apiUrl}/api/agents`);
      if (res.ok) {
        console.log("[start] API is ready");
        return;
      }
    } catch {}
    console.log(`[start] waiting for API... (${i + 1}/${maxRetries})`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error("API did not become ready");
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

    const res = await fetch(`${apiUrl}/internal/seed-agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: name,
        name,
        role: config.role,
        wallet_address: address,
        personality: config.personality,
      }),
    });
    console.log(`[seed] ${name} (${config.role}) -> ${address} [${res.ok ? "ok" : res.status}]`);
  }
}

function shutdown() {
  console.log("\n[start] shutting down...");
  for (const p of processes) p.kill("SIGTERM");
  setTimeout(() => process.exit(0), 3000);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// 1. Start API
console.log("[start] launching API...");
spawnProc("api", "node", ["packages/api/dist/server.js"], root, { API_PORT: apiPort });

// 2. Wait for it
await waitForApi();

// 3. Seed agents
console.log("[start] seeding agents...");
await seedAgents();

// 4. Spawn agents — artist first, then collectors staggered
console.log("[start] spawning agents...");
spawnProc("noepinax", "node", ["packages/agent/dist/index.js"], root, {
  AGENT_NAME: "noepinax",
  API_URL: apiUrl,
});

const collectors = AGENT_NAMES.filter((n) => n !== "noepinax");
collectors.forEach((name, i) => {
  setTimeout(() => {
    spawnProc(name, "node", ["packages/agent/dist/index.js"], root, {
      AGENT_NAME: name,
      API_URL: apiUrl,
    });
  }, (i + 1) * 2000);
});
