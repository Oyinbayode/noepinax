import { randomUUID } from "crypto";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import pino from "pino";
import type { CycleLog, ToolCall, SafetyCheck } from "@noepinax/shared";

export class AgentLogger {
  private logPath: string;
  private logs: CycleLog[] = [];
  readonly console: pino.Logger;
  readonly agentId: string;

  constructor(agentName: string, logsDir?: string) {
    this.agentId = agentName;
    const dir = logsDir || join(process.cwd(), "logs");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    this.logPath = join(dir, `${agentName}_log.json`);

    if (existsSync(this.logPath)) {
      try {
        this.logs = JSON.parse(readFileSync(this.logPath, "utf-8"));
      } catch {
        this.logs = [];
      }
    }

    this.console = pino({
      name: agentName,
      transport: {
        target: "pino-pretty",
        options: { colorize: true },
      },
    });
  }

  startCycle(): string {
    return randomUUID();
  }

  logPhase(
    cycleId: string,
    phase: CycleLog["phase"],
    inputs: Record<string, unknown>,
    decisions: Record<string, unknown>,
    toolCalls: ToolCall[],
    safetyChecks: SafetyCheck[],
    outcome: Record<string, unknown>,
    veniceTokens: number,
    gasWei: string,
  ): void {
    const entry: CycleLog = {
      cycle_id: cycleId,
      agent_id: this.agentId,
      timestamp: new Date().toISOString(),
      phase,
      inputs,
      decisions,
      tool_calls: toolCalls,
      safety_checks: safetyChecks,
      outcome,
      compute_budget: { venice_tokens: veniceTokens, gas_wei: gasWei },
    };

    this.logs.push(entry);
    this.console.info({ phase, cycleId }, `[${phase}] completed`);
    this.pushToApi(entry);
  }

  private pushToApi(entry: CycleLog): void {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    fetch(`${apiUrl}/internal/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id: entry.agent_id,
        cycle_id: entry.cycle_id,
        phase: entry.phase,
        log_data: entry,
      }),
    }).catch(() => {});
  }

  flush(): void {
    const dir = dirname(this.logPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(this.logPath, JSON.stringify(this.logs, null, 2));
  }

  get entries(): CycleLog[] {
    return this.logs;
  }
}
