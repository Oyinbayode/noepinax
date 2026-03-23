import { formatEther } from "viem";
import type { SafetyCheck } from "@noepinax/shared";

const MIN_BALANCE_WEI = 1_000_000_000_000_000n; // 0.001 ETH

export class GasGuardrails {
  private dailyLimit: bigint;
  private spent: bigint = 0n;
  private lastReset: number = Date.now();

  constructor(dailyLimit: bigint) {
    this.dailyLimit = dailyLimit;
  }

  canProceed(estimatedGas: bigint, currentBalance: bigint): SafetyCheck {
    this.maybeReset();

    if (currentBalance < MIN_BALANCE_WEI) {
      return {
        check: "min_balance",
        passed: false,
        remaining: formatEther(currentBalance),
        details: `Balance ${formatEther(currentBalance)} ETH below minimum ${formatEther(MIN_BALANCE_WEI)} ETH`,
      };
    }

    if (this.spent + estimatedGas > this.dailyLimit) {
      return {
        check: "daily_gas_limit",
        passed: false,
        remaining: formatEther(this.dailyLimit - this.spent),
        details: `Would exceed daily gas limit. Spent: ${formatEther(this.spent)}, Limit: ${formatEther(this.dailyLimit)}`,
      };
    }

    return {
      check: "gas_budget",
      passed: true,
      remaining: formatEther(this.dailyLimit - this.spent),
    };
  }

  recordGasUsed(gasWei: bigint): void {
    this.maybeReset();
    this.spent += gasWei;
  }

  get dailySpent(): string {
    return formatEther(this.spent);
  }

  private maybeReset(): void {
    const dayMs = 86_400_000;
    if (Date.now() - this.lastReset > dayMs) {
      this.spent = 0n;
      this.lastReset = Date.now();
    }
  }
}
