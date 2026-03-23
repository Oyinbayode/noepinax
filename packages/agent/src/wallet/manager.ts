import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, base } from "viem/chains";
import { GasGuardrails } from "./guardrails.js";

export class WalletManager {
  readonly account: ReturnType<typeof privateKeyToAccount>;
  readonly sepoliaPublic;
  readonly sepoliaWallet;
  readonly mainnetPublic;
  readonly mainnetWallet;
  readonly guardrails: GasGuardrails;

  constructor(privateKey: `0x${string}`, dailyGasLimit: string) {
    this.account = privateKeyToAccount(privateKey);

    const sepoliaRpc = process.env.ALCHEMY_API_KEY
      ? `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
      : process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

    const mainnetRpc = process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org";

    this.sepoliaPublic = createPublicClient({
      chain: baseSepolia,
      transport: http(sepoliaRpc),
    });

    this.sepoliaWallet = createWalletClient({
      account: this.account,
      chain: baseSepolia,
      transport: http(sepoliaRpc),
    });

    this.mainnetPublic = createPublicClient({
      chain: base,
      transport: http(mainnetRpc),
    });

    this.mainnetWallet = createWalletClient({
      account: this.account,
      chain: base,
      transport: http(mainnetRpc),
    });

    this.guardrails = new GasGuardrails(parseEther(dailyGasLimit));
  }

  get address(): `0x${string}` {
    return this.account.address;
  }

  async sepoliaBalance(): Promise<string> {
    const balance = await this.sepoliaPublic.getBalance({ address: this.address });
    return formatEther(balance);
  }

  async mainnetBalance(): Promise<string> {
    const balance = await this.mainnetPublic.getBalance({ address: this.address });
    return formatEther(balance);
  }

  async gasPrice(): Promise<bigint> {
    return this.sepoliaPublic.getGasPrice();
  }
}
