import { createNetwork } from "@stacks/network";
import type { StacksNetwork, StacksAnalyticsConfig, DEFAULT_API_URLS } from "./types.js";

export function resolveApiUrl(
  network: StacksNetwork,
  apiUrl?: string,
): string {
  if (apiUrl) return apiUrl;
  const defaults: Record<StacksNetwork, string> = {
    mainnet: "https://api.mainnet.hiro.so",
    testnet: "https://api.testnet.hiro.so",
    devnet: "http://localhost:3999",
    mocknet: "http://localhost:3999",
  };
  return defaults[network];
}

export function createStacksNetwork(
  network: StacksNetwork,
  apiUrl?: string,
) {
  const url = resolveApiUrl(network, apiUrl);
  return createNetwork({
    network: network as "mainnet" | "testnet" | "devnet" | "mocknet",
    client: { baseUrl: url },
  });
}

export function getExplorerUrl(txId: string, network: StacksNetwork): string {
  const chain = network === "mainnet" ? "mainnet" : "testnet";
  return `https://explorer.hiro.so/txid/${txId}?chain=${chain}`;
}

export function resolveConfig(config: StacksAnalyticsConfig): Required<
  Omit<StacksAnalyticsConfig, "hiroApiKey">
> & { hiroApiKey: string | undefined } {
  return {
    contractAddress: config.contractAddress,
    contractName: config.contractName ?? "analytics-tracker",
    network: config.network ?? "mainnet",
    apiUrl: resolveApiUrl(config.network ?? "mainnet", config.apiUrl),
    fee: config.fee ?? 800,
    anchorMode: config.anchorMode ?? "any",
    postConditionMode: config.postConditionMode ?? "allow",
    hiroApiKey: config.hiroApiKey,
  };
}
