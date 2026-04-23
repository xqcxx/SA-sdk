import type { ClarityValue } from "@stacks/transactions";
import { buildContractArgs, getContractFunctionName } from "./args.js";
import { buildAndBroadcastTransaction } from "./transaction.js";
import { resolveConfig, getExplorerUrl } from "./network.js";
import type {
  StacksAnalyticsConfig,
  PageViewEvent,
  ActionEvent,
  ConversionEvent,
  CustomEvent,
  BroadcastResult,
  TransactionResult,
  WalletRequestOptions,
  StacksNetwork,
} from "./types.js";

export class StacksAnalytics {
  private readonly config: ReturnType<typeof resolveConfig>;

  constructor(config: StacksAnalyticsConfig) {
    this.config = resolveConfig(config);
  }

  get contractIdentifier(): string {
    return `${this.config.contractAddress}.${this.config.contractName}`;
  }

  get network(): StacksNetwork {
    return this.config.network;
  }

  async trackPageView(
    event: PageViewEvent,
    senderKey: string,
    options?: { nonce?: bigint; fee?: number },
  ): Promise<BroadcastResult> {
    return this.sendTransaction(
      "page-view",
      event,
      senderKey,
      options,
    );
  }

  async trackAction(
    event: ActionEvent,
    senderKey: string,
    options?: { nonce?: bigint; fee?: number },
  ): Promise<BroadcastResult> {
    return this.sendTransaction(
      "action",
      event,
      senderKey,
      options,
    );
  }

  async trackConversion(
    event: ConversionEvent,
    senderKey: string,
    options?: { nonce?: bigint; fee?: number },
  ): Promise<BroadcastResult> {
    return this.sendTransaction(
      "conversion",
      event,
      senderKey,
      options,
    );
  }

  async trackCustomEvent(
    event: CustomEvent,
    senderKey: string,
    options?: { nonce?: bigint; fee?: number },
  ): Promise<BroadcastResult> {
    return this.sendTransaction(
      "custom",
      event,
      senderKey,
      options,
    );
  }

  buildWalletRequest(
    eventType: "page-view",
    event: PageViewEvent,
  ): WalletRequestOptions;
  buildWalletRequest(
    eventType: "action",
    event: ActionEvent,
  ): WalletRequestOptions;
  buildWalletRequest(
    eventType: "conversion",
    event: ConversionEvent,
  ): WalletRequestOptions;
  buildWalletRequest(
    eventType: "custom",
    event: CustomEvent,
  ): WalletRequestOptions;
  buildWalletRequest(
    eventType: "page-view" | "action" | "conversion" | "custom",
    event: PageViewEvent | ActionEvent | ConversionEvent | CustomEvent,
  ): WalletRequestOptions {
    const functionName = getContractFunctionName(eventType);
    const functionArgs = buildContractArgs(eventType, event);

    return {
      contract: this.contractIdentifier as `${string}.${string}`,
      functionName,
      functionArgs,
      network: this.config.network,
      sponsored: false,
    };
  }

  async callWithWallet(
    walletRequest: (options: WalletRequestOptions) => Promise<{ txId?: string; txid?: string }>,
    eventType: "page-view",
    event: PageViewEvent,
  ): Promise<TransactionResult>;
  async callWithWallet(
    walletRequest: (options: WalletRequestOptions) => Promise<{ txId?: string; txid?: string }>,
    eventType: "action",
    event: ActionEvent,
  ): Promise<TransactionResult>;
  async callWithWallet(
    walletRequest: (options: WalletRequestOptions) => Promise<{ txId?: string; txid?: string }>,
    eventType: "conversion",
    event: ConversionEvent,
  ): Promise<TransactionResult>;
  async callWithWallet(
    walletRequest: (options: WalletRequestOptions) => Promise<{ txId?: string; txid?: string }>,
    eventType: "custom",
    event: CustomEvent,
  ): Promise<TransactionResult>;
  async callWithWallet(
    walletRequest: (options: WalletRequestOptions) => Promise<{ txId?: string; txid?: string }>,
    eventType: "page-view" | "action" | "conversion" | "custom",
    event: PageViewEvent | ActionEvent | ConversionEvent | CustomEvent,
  ): Promise<TransactionResult> {
    const req = this.buildWalletRequest(
      eventType as "page-view",
      event as PageViewEvent,
    );
    const response = await walletRequest(req);
    const txId = response.txid ?? response.txId ?? "unknown";
    return {
      txId,
      explorerUrl: getExplorerUrl(txId, this.config.network),
    };
  }

  private async sendTransaction(
    eventType: "page-view" | "action" | "conversion" | "custom",
    event: PageViewEvent | ActionEvent | ConversionEvent | CustomEvent,
    senderKey: string,
    options?: { nonce?: bigint; fee?: number },
  ): Promise<BroadcastResult> {
    const functionName = getContractFunctionName(eventType);
    const functionArgs = buildContractArgs(eventType, event);

    return buildAndBroadcastTransaction({
      contractAddress: this.config.contractAddress,
      contractName: this.config.contractName,
      functionName,
      functionArgs,
      senderKey,
      network: this.config.network,
      apiUrl: this.config.apiUrl,
      fee: options?.fee ?? this.config.fee,
      nonce: options?.nonce,
      anchorMode: this.config.anchorMode,
      postConditionMode: this.config.postConditionMode,
      hiroApiKey: this.config.hiroApiKey,
    });
  }
}

export function createStacksAnalytics(
  config: StacksAnalyticsConfig,
): StacksAnalytics {
  return new StacksAnalytics(config);
}
