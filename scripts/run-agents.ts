import "dotenv/config";
import { spawn, ChildProcess } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { AGENT_NAMES } from "@noepinax/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const processes: ChildProcess[] = [];

function spawnAgent(name: string) {
  const child = spawn("npx", ["tsx", "src/index.ts"], {
    cwd: join(root, "packages", "agent"),
    env: { ...process.env, AGENT_NAME: name },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const tag = `[${name}]`;
  child.stdout?.on("data", (d) => process.stdout.write(`${tag} ${d}`));
  child.stderr?.on("data", (d) => process.stderr.write(`${tag} ${d}`));
  child.on("exit", (code) => console.log(`${tag} exited (${code})`));

  processes.push(child);
  return child;
}

function spawnApi() {
  const child = spawn("npx", ["tsx", "src/server.ts"], {
    cwd: join(root, "packages", "api"),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.on("data", (d) => process.stdout.write(`[api] ${d}`));
  child.stderr?.on("data", (d) => process.stderr.write(`[api] ${d}`));
  child.on("exit", (code) => console.log(`[api] exited (${code})`));

  processes.push(child);
  return child;
}

function shutdown() {
  console.log("\nshutting down...");
  for (const p of processes) {
    p.kill("SIGTERM");
  }
  setTimeout(() => process.exit(0), 3000);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("starting api server...");
spawnApi();

// give the API a moment to initialize the DB
setTimeout(() => {
  console.log("starting agents...");

  // artist first
  spawnAgent("noepinax");

  // stagger collectors so they don't all hit Venice at once
  const collectors = AGENT_NAMES.filter((n) => n !== "noepinax");
  collectors.forEach((name, i) => {
    setTimeout(() => spawnAgent(name), (i + 1) * 2000);
  });
}, 2000);
