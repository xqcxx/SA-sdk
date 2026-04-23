import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
} from "@stacks/transactions";
import type { ClarityValue, SignedContractCallOptions } from "@stacks/transactions";
import { createStacksNetwork, getExplorerUrl } from "./network.js";
import type { StacksNetwork, BroadcastResult } from "./types.js";

export interface BuildAndBroadcastOptions {
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: ClarityValue[];
  senderKey: string;
  network: StacksNetwork;
  apiUrl?: string;
  fee?: number;
  nonce?: bigint;
  anchorMode?: "onChainOnly" | "offChainOnly" | "any";
  postConditionMode?: "allow" | "deny";
  hiroApiKey?: string;
}

function toAnchorMode(mode?: "onChainOnly" | "offChainOnly" | "any"): AnchorMode {
  switch (mode) {
    case "onChainOnly":
      return AnchorMode.OnChainOnly;
    case "offChainOnly":
      return AnchorMode.OffChainOnly;
    default:
      return AnchorMode.Any;
  }
}

function toPostConditionMode(mode?: "allow" | "deny"): PostConditionMode {
  return mode === "deny" ? PostConditionMode.Deny : PostConditionMode.Allow;
}

export async function buildAndBroadcastTransaction(
  options: BuildAndBroadcastOptions,
): Promise<BroadcastResult> {
  const stacksNetwork = createStacksNetwork(options.network, options.apiUrl);

  const txOptions: SignedContractCallOptions = {
    contractAddress: options.contractAddress,
    contractName: options.contractName,
    functionName: options.functionName,
    functionArgs: options.functionArgs,
    senderKey: options.senderKey,
    network: stacksNetwork,
    postConditionMode: toPostConditionMode(options.postConditionMode),
    fee: options.fee,
  };

  if (options.nonce !== undefined) {
    txOptions.nonce = options.nonce;
  }

  try {
    const transaction = await makeContractCall(txOptions);
    transaction.anchorMode = toAnchorMode(options.anchorMode);

    const broadcastResponse = await broadcastTransaction({
      transaction,
      network: stacksNetwork,
    });

    if ("error" in broadcastResponse) {
      return {
        success: false,
        error: String(broadcastResponse.error),
        reason: String(broadcastResponse.reason),
      };
    }

    const txId = broadcastResponse.txid;
    return {
      success: true,
      txId,
      explorerUrl: getExplorerUrl(txId, options.network),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: "broadcast_failed",
      reason: message,
    };
  }
}
