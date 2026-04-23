export type StacksNetwork = "mainnet" | "testnet" | "devnet" | "mocknet";

export interface StacksAnalyticsConfig {
  contractAddress: string;
  contractName?: string;
  network?: StacksNetwork;
  apiUrl?: string;
  fee?: number;
  anchorMode?: "onChainOnly" | "offChainOnly" | "any";
  postConditionMode?: "allow" | "deny";
  hiroApiKey?: string;
}

export interface PageViewEvent {
  projectId: string;
  page: string;
}

export interface ActionEvent {
  projectId: string;
  action: string;
  target: string;
}

export interface ConversionEvent {
  projectId: string;
  conversionType: string;
  value: number;
}

export interface CustomEvent {
  projectId: string;
  eventType: string;
  payload: string;
}

export type AnalyticsEvent =
  | ({ type: "page-view" } & PageViewEvent)
  | ({ type: "action" } & ActionEvent)
  | ({ type: "conversion" } & ConversionEvent)
  | ({ type: "custom" } & CustomEvent);

export interface TransactionResult {
  txId: string;
  explorerUrl: string;
}

export interface BroadcastSuccess {
  success: true;
  txId: string;
  explorerUrl: string;
}

export interface BroadcastFailure {
  success: false;
  error: string;
  reason: string;
}

export type BroadcastResult = BroadcastSuccess | BroadcastFailure;

export interface WalletRequestOptions {
  contract: string;
  functionName: string;
  functionArgs: import("@stacks/transactions").ClarityValue[];
  network?: StacksNetwork;
  sponsored?: boolean;
}

export const DEFAULT_CONTRACT_NAME = "analytics-tracker";

export const DEFAULT_API_URLS: Record<StacksNetwork, string> = {
  mainnet: "https://api.mainnet.hiro.so",
  testnet: "https://api.testnet.hiro.so",
  devnet: "http://localhost:3999",
  mocknet: "http://localhost:3999",
};
