# @rednevsky/sa-sdk

**TypeScript SDK for on-chain product analytics on the Stacks blockchain.**

Track page views, user actions, conversions, and custom events as immutable on-chain telemetry via the `analytics-tracker` Clarity contract. Built for teams that need auditable, indexable analytics with no mutable contract state.

---

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Tracking Events](#tracking-events)
  - [Page Views](#page-views)
  - [Actions](#actions)
  - [Conversions](#conversions)
  - [Custom Events](#custom-events)
- [Wallet-Based Usage (Browser)](#wallet-based-usage-browser)
  - [With @stacks/connect](#with-stacksconnect)
  - [callWithWallet Helper](#callwithwallet-helper)
- [Server-Side Usage (Private Key)](#server-side-usage-private-key)
- [API Reference](#api-reference)
  - [StacksAnalytics Class](#stacksanalytics-class)
  - [Factory Function](#factory-function)
  - [Argument Builders](#argument-builders)
  - [Network Utilities](#network-utilities)
  - [Low-Level Transaction Builder](#low-level-transaction-builder)
- [Types](#types)
  - [StacksAnalyticsConfig](#stacksanalyticsconfig)
  - [Event Types](#event-types)
  - [BroadcastResult](#broadcastresult)
  - [TransactionResult](#transactionresult)
  - [WalletRequestOptions](#walletrequestoptions)
- [Clarity Contract Reference](#clarity-contract-reference)
- [Architecture](#architecture)
- [Module Formats](#module-formats)
- [Development](#development)
- [License](#license)

---

## Overview

This SDK wraps the `analytics-tracker` Clarity smart contract, which is a **stateless, emit-only** contract on Stacks. Every tracked event becomes an on-chain transaction with a structured `print` event, readable by any Stacks indexer (e.g. Hiro API, Stacks.js event streams, or custom ETL pipelines).

The contract exposes four public functions:

| Contract Function | SDK Method | Purpose |
|---|---|---|
| `track-page-view` | `trackPageView()` | Record page/screen views |
| `track-action` | `trackAction()` | Record user interactions (clicks, navigations) |
| `track-conversion` | `trackConversion()` | Record conversion events with a numeric value |
| `track-custom-event` | `trackCustomEvent()` | Record arbitrary events with a string payload |

The SDK supports two modes of operation:

1. **Server-side** — Sign and broadcast transactions directly with a private key
2. **Browser** — Build wallet requests for `@stacks/connect` to let users sign via their wallet (Leather, Xverse, etc.)

---

## Installation

```bash
npm install @rednevsky/sa-sdk @stacks/transactions
```

`@stacks/transactions` is a required peer dependency. `@stacks/network` is an optional peer dependency for advanced network configuration.

### Yarn

```bash
yarn add @rednevsky/sa-sdk @stacks/transactions
```

### pnpm

```bash
pnpm add @rednevsky/sa-sdk @stacks/transactions
```

---

## Quick Start

```ts
import { createStacksAnalytics } from "@rednevsky/sa-sdk";

const analytics = createStacksAnalytics({
  contractAddress: "SP3CPTJFP3TQK00DV0B5SGE8R0N3Z40MWJ6QZD38Y",
  network: "testnet",
});

// Server-side: sign with a private key
const result = await analytics.trackPageView(
  { projectId: "my-dapp", page: "/dashboard" },
  "your-private-key-hex",
);

if (result.success) {
  console.log("TX:", result.txId);
  console.log("Explorer:", result.explorerUrl);
}
```

---

## Configuration

### `StacksAnalyticsConfig`

| Property | Type | Default | Description |
|---|---|---|---|
| `contractAddress` | `string` | **required** | The Stacks address that deployed the `analytics-tracker` contract |
| `contractName` | `string` | `"analytics-tracker"` | The name of the Clarity contract |
| `network` | `"mainnet" \| "testnet" \| "devnet" \| "mocknet"` | `"mainnet"` | Target Stacks network |
| `apiUrl` | `string` | Hiro public API per network | Custom Stacks API URL (for self-hosted nodes) |
| `fee` | `number` | `800` | Transaction fee in microSTX |
| `anchorMode` | `"onChainOnly" \| "offChainOnly" \| "any"` | `"any"` | Block anchoring strategy |
| `postConditionMode` | `"allow" \| "deny"` | `"allow"` | Post-condition safety mode |
| `hiroApiKey` | `string` | `undefined` | Hiro API key for higher rate limits |

### Example: Custom Network

```ts
const analytics = createStacksAnalytics({
  contractAddress: "SP3CPTJFP3TQK00DV0B5SGE8R0N3Z40MWJ6QZD38Y",
  contractName: "analytics-tracker",
  network: "testnet",
  apiUrl: "https://my-stacks-node.example.com",
  fee: 1000,
  hiroApiKey: process.env.HIRO_API_KEY,
});
```

---

## Tracking Events

### Page Views

Track page or screen views within your application.

```ts
const result = await analytics.trackPageView(
  {
    projectId: "my-dapp",       // string-ascii, max 40 chars
    page: "/dashboard/settings", // string-utf8, max 120 chars
  },
  senderKey,
);
```

### Actions

Track user interactions such as button clicks, form submissions, or navigation events.

```ts
const result = await analytics.trackAction(
  {
    projectId: "my-dapp",     // string-ascii, max 40 chars
    action: "cta_click",      // string-ascii, max 40 chars
    target: "hero-start-btn", // string-utf8, max 120 chars
  },
  senderKey,
);
```

### Conversions

Track conversion events with an associated numeric value (e.g. purchase amount, signup count).

```ts
const result = await analytics.trackConversion(
  {
    projectId: "my-dapp",     // string-ascii, max 40 chars
    conversionType: "signup", // string-ascii, max 40 chars
    value: 1,                 // uint (non-negative integer)
  },
  senderKey,
);
```

### Custom Events

Track arbitrary events with a string payload for maximum flexibility.

```ts
const result = await analytics.trackCustomEvent(
  {
    projectId: "my-dapp",         // string-ascii, max 40 chars
    eventType: "session",         // string-ascii, max 40 chars
    payload: '{"duration":120}',  // string-utf8, max 300 chars
  },
  senderKey,
);
```

### Per-Transaction Options

All tracking methods accept an optional third argument for overriding fee and nonce:

```ts
const result = await analytics.trackPageView(
  { projectId: "my-dapp", page: "/home" },
  senderKey,
  { fee: 2000, nonce: 42n },
);
```

---

## Wallet-Based Usage (Browser)

For browser dApps, you typically want the user to sign transactions through their wallet (Leather, Xverse, etc.) rather than using a raw private key.

### With `@stacks/connect`

Use `buildWalletRequest()` to construct the request object, then pass it to `@stacks/connect`'s `request()` function:

```ts
import { createStacksAnalytics } from "@rednevsky/sa-sdk";
import { request } from "@stacks/connect";

const analytics = createStacksAnalytics({
  contractAddress: "SP3CPTJFP3TQK00DV0B5SGE8R0N3Z40MWJ6QZD38Y",
  network: "testnet",
});

// Build the request for a page view
const walletReq = analytics.buildWalletRequest("page-view", {
  projectId: "my-dapp",
  page: "/landing",
});

// Send to the user's wallet for signing
const response = await request("stx_callContract", walletReq);
console.log("Transaction ID:", response.txId);
```

### `callWithWallet` Helper

For a more streamlined flow, use `callWithWallet()` which handles the request construction and response parsing:

```ts
const result = await analytics.callWithWallet(
  // Pass any function that accepts WalletRequestOptions and returns a tx response
  (opts) => request("stx_callContract", opts),
  "action",
  {
    projectId: "my-dapp",
    action: "button_click",
    target: "purchase-btn",
  },
);

console.log("TX:", result.txId);
console.log("Explorer:", result.explorerUrl);
```

This works for all event types:

```ts
// Page view
await analytics.callWithWallet(walletFn, "page-view", { projectId: "app", page: "/" });

// Conversion
await analytics.callWithWallet(walletFn, "conversion", { projectId: "app", conversionType: "purchase", value: 99 });

// Custom event
await analytics.callWithWallet(walletFn, "custom", { projectId: "app", eventType: "error", payload: "timeout" });
```

---

## Server-Side Usage (Private Key)

For automated/bot scenarios, backend services, or scripting, sign transactions directly with a private key:

```ts
import { createStacksAnalytics } from "@rednevsky/sa-sdk";

const analytics = createStacksAnalytics({
  contractAddress: "SP3CPTJFP3TQK00DV0B5SGE8R0N3Z40MWJ6QZD38Y",
  network: "mainnet",
});

const senderKey = process.env.STX_PRIVATE_KEY!;

// Track a page view
const result = await analytics.trackPageView(
  { projectId: "backend-cron", page: "/health-check" },
  senderKey,
);

if (result.success) {
  console.log(`Emitted on-chain: ${result.explorerUrl}`);
} else {
  console.error(`Failed: ${result.error} — ${result.reason}`);
}
```

### Batch Scripting

Since the contract is stateless, you can fire multiple events in sequence without worrying about state conflicts. Manage nonces manually for ordered submission:

```ts
let nonce = 0n;

for (const page of ["/home", "/about", "/pricing"]) {
  await analytics.trackPageView(
    { projectId: "batch-script", page },
    senderKey,
    { nonce: nonce++ },
  );
}
```

---

## API Reference

### `StacksAnalytics` Class

The main client class. Construct it directly or use the `createStacksAnalytics` factory.

```ts
import { StacksAnalytics } from "@rednevsky/sa-sdk";

const client = new StacksAnalytics({
  contractAddress: "SP3CPTJFP3TQK00DV0B5SGE8R0N3Z40MWJ6QZD38Y",
  network: "testnet",
});
```

#### Properties

| Property | Type | Description |
|---|---|---|
| `contractIdentifier` | `string` | Full contract ID: `{address}.{name}` |
| `network` | `StacksNetwork` | The resolved network name |

#### Methods

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `trackPageView(event, senderKey, options?)` | `PageViewEvent`, `string`, `{ nonce?, fee? }` | `Promise<BroadcastResult>` | Emit a page-view event |
| `trackAction(event, senderKey, options?)` | `ActionEvent`, `string`, `{ nonce?, fee? }` | `Promise<BroadcastResult>` | Emit an action event |
| `trackConversion(event, senderKey, options?)` | `ConversionEvent`, `string`, `{ nonce?, fee? }` | `Promise<BroadcastResult>` | Emit a conversion event |
| `trackCustomEvent(event, senderKey, options?)` | `CustomEvent`, `string`, `{ nonce?, fee? }` | `Promise<BroadcastResult>` | Emit a custom event |
| `buildWalletRequest(eventType, event)` | Event type + event data | `WalletRequestOptions` | Build a request for `@stacks/connect` |
| `callWithWallet(walletRequest, eventType, event)` | Wallet function + event type + data | `Promise<TransactionResult>` | End-to-end wallet-signed call |

---

### Factory Function

#### `createStacksAnalytics(config)`

Creates and returns a `StacksAnalytics` instance.

```ts
import { createStacksAnalytics } from "@rednevsky/sa-sdk";

const analytics = createStacksAnalytics({
  contractAddress: "SP3CPTJFP3TQK00DV0B5SGE8R0N3Z40MWJ6QZD38Y",
  network: "testnet",
});
```

---

### Argument Builders

Low-level helpers that construct the `ClarityValue[]` arrays matching the contract's function signatures. Useful if you need the raw Clarity args without the full client.

```ts
import {
  buildPageViewArgs,
  buildActionArgs,
  buildConversionArgs,
  buildCustomEventArgs,
  buildContractArgs,
  getContractFunctionName,
} from "@rednevsky/sa-sdk";
```

| Function | Input | Output |
|---|---|---|
| `buildPageViewArgs(event)` | `PageViewEvent` | `ClarityValue[]` — `[stringAscii, stringUtf8]` |
| `buildActionArgs(event)` | `ActionEvent` | `ClarityValue[]` — `[stringAscii, stringAscii, stringUtf8]` |
| `buildConversionArgs(event)` | `ConversionEvent` | `ClarityValue[]` — `[stringAscii, stringAscii, uint]` |
| `buildCustomEventArgs(event)` | `CustomEvent` | `ClarityValue[]` — `[stringAscii, stringAscii, stringUtf8]` |
| `buildContractArgs(type, event)` | Any event type + data | `ClarityValue[]` — dispatches to the correct builder |
| `getContractFunctionName(type)` | Event type string | Contract function name (e.g. `"track-page-view"`) |

---

### Network Utilities

```ts
import {
  resolveApiUrl,
  createStacksNetwork,
  getExplorerUrl,
  resolveConfig,
} from "@rednevsky/sa-sdk";
```

| Function | Description |
|---|---|
| `resolveApiUrl(network, apiUrl?)` | Returns the Stacks API base URL for a network |
| `createStacksNetwork(network, apiUrl?)` | Creates a `@stacks/network` StacksNetwork object |
| `getExplorerUrl(txId, network)` | Returns a Hiro Explorer URL for a transaction |
| `resolveConfig(config)` | Fills in defaults for a partial `StacksAnalyticsConfig` |

Default API URLs:

| Network | URL |
|---|---|
| `mainnet` | `https://api.mainnet.hiro.so` |
| `testnet` | `https://api.testnet.hiro.so` |
| `devnet` | `http://localhost:3999` |
| `mocknet` | `http://localhost:3999` |

---

### Low-Level Transaction Builder

```ts
import { buildAndBroadcastTransaction } from "@rednevsky/sa-sdk";
import type { BuildAndBroadcastOptions } from "@rednevsky/sa-sdk";
```

#### `buildAndBroadcastTransaction(options)`

Builds a signed contract-call transaction and broadcasts it to the Stacks network. This is what the `StacksAnalytics` class uses internally, but you can call it directly for maximum control.

```ts
const result = await buildAndBroadcastTransaction({
  contractAddress: "SP3CPTJFP3TQK00DV0B5SGE8R0N3Z40MWJ6QZD38Y",
  contractName: "analytics-tracker",
  functionName: "track-page-view",
  functionArgs: buildPageViewArgs({ projectId: "app", page: "/" }),
  senderKey: "your-private-key-hex",
  network: "testnet",
  fee: 800,
  nonce: 0n,
  anchorMode: "any",
  postConditionMode: "allow",
});
```

Returns `BroadcastResult` (see [Types](#types)).

---

## Types

All types are exported from the package root.

### `StacksAnalyticsConfig`

```ts
interface StacksAnalyticsConfig {
  contractAddress: string;
  contractName?: string;              // default: "analytics-tracker"
  network?: StacksNetwork;            // default: "mainnet"
  apiUrl?: string;                    // default: Hiro public API
  fee?: number;                       // default: 800 (microSTX)
  anchorMode?: "onChainOnly" | "offChainOnly" | "any"; // default: "any"
  postConditionMode?: "allow" | "deny";                 // default: "allow"
  hiroApiKey?: string;
}
```

### Event Types

```ts
interface PageViewEvent {
  projectId: string;  // string-ascii, max 40 chars
  page: string;       // string-utf8, max 120 chars
}

interface ActionEvent {
  projectId: string;  // string-ascii, max 40 chars
  action: string;     // string-ascii, max 40 chars
  target: string;     // string-utf8, max 120 chars
}

interface ConversionEvent {
  projectId: string;      // string-ascii, max 40 chars
  conversionType: string; // string-ascii, max 40 chars
  value: number;          // uint (non-negative)
}

interface CustomEvent {
  projectId: string;  // string-ascii, max 40 chars
  eventType: string;  // string-ascii, max 40 chars
  payload: string;    // string-utf8, max 300 chars
}

type AnalyticsEvent =
  | ({ type: "page-view" } & PageViewEvent)
  | ({ type: "action" } & ActionEvent)
  | ({ type: "conversion" } & ConversionEvent)
  | ({ type: "custom" } & CustomEvent);
```

### `BroadcastResult`

Discriminated union returned by all server-side tracking methods:

```ts
interface BroadcastSuccess {
  success: true;
  txId: string;
  explorerUrl: string;
}

interface BroadcastFailure {
  success: false;
  error: string;   // Machine-readable error code
  reason: string;  // Human-readable error message
}

type BroadcastResult = BroadcastSuccess | BroadcastFailure;
```

Usage:

```ts
const result = await analytics.trackPageView(event, key);

if (result.success) {
  console.log("TX ID:", result.txId);
  console.log("Explorer:", result.explorerUrl);
} else {
  console.error("Error:", result.error);
  console.error("Reason:", result.reason);
}
```

### `TransactionResult`

Returned by `callWithWallet()`:

```ts
interface TransactionResult {
  txId: string;
  explorerUrl: string;
}
```

### `WalletRequestOptions`

Object built by `buildWalletRequest()`, compatible with `@stacks/connect`'s `request("stx_callContract", ...)`:

```ts
interface WalletRequestOptions {
  contract: string;            // e.g. "SP123.analytics-tracker"
  functionName: string;        // e.g. "track-page-view"
  functionArgs: ClarityValue[];
  network?: StacksNetwork;
  sponsored?: boolean;
}
```

---

## Clarity Contract Reference

The SDK targets the `analytics-tracker` Clarity contract, which is stateless and emit-only. All functions use `(print ...)` to emit structured events and return `(ok true)`.

### `track-page-view`

```clarity
(define-public (track-page-view
  (project-id (string-ascii 40))
  (page (string-utf8 120))
))
```

Prints: `{ event: "page-view", project: project-id, page: page, sender: tx-sender, burn-block: burn-block-height }`

### `track-action`

```clarity
(define-public (track-action
  (project-id (string-ascii 40))
  (action (string-ascii 40))
  (target (string-utf8 120))
))
```

Prints: `{ event: "action", project: project-id, action: action, target: target, sender: tx-sender, burn-block: burn-block-height }`

### `track-conversion`

```clarity
(define-public (track-conversion
  (project-id (string-ascii 40))
  (conversion-type (string-ascii 40))
  (value uint)
))
```

Prints: `{ event: "conversion", project: project-id, conversion: conversion-type, value: value, sender: tx-sender, burn-block: burn-block-height }`

### `track-custom-event`

```clarity
(define-public (track-custom-event
  (project-id (string-ascii 40))
  (event-type (string-ascii 40))
  (payload (string-utf8 300))
))
```

Prints: `{ event: "custom", project: project-id, event-type: event-type, payload: payload, sender: tx-sender, burn-block: burn-block-height }`

### `get-contract-info` (read-only)

```clarity
(define-read-only (get-contract-info))
```

Returns: `(ok { contract: "analytics-tracker", version: "1.0.0", stateless: true })`

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Your Application                │
│                                                  │
│   ┌──────────────────┐  ┌────────────────────┐  │
│   │  Server-Side Bot │  │  Browser dApp      │  │
│   │  (private key)   │  │  (wallet signing)  │  │
│   └────────┬─────────┘  └─────────┬──────────┘  │
│            │                      │              │
│   ┌────────┴──────────────────────┴──────────┐  │
│   │         @rednevsky/sa-sdk                 │  │
│   │                                           │  │
│   │  StacksAnalytics                          │  │
│   │  ├─ trackPageView()     buildWalletReq() │  │
│   │  ├─ trackAction()       callWithWallet()  │  │
│   │  ├─ trackConversion()                     │  │
│   │  └─ trackCustomEvent()                    │  │
│   │                                           │  │
│   │  Internals:                               │  │
│   │  ├─ args.ts      → Clarity value builders │  │
│   │  ├─ network.ts   → Network resolution     │  │
│   │  └─ transaction.ts → Build + broadcast    │  │
│   └───────────────────┬───────────────────────┘  │
│                       │                          │
└───────────────────────┼──────────────────────────┘
                        │
            ┌───────────┴───────────┐
            │   Stacks Blockchain    │
            │                        │
            │  analytics-tracker     │
            │  (stateless contract)  │
            │                        │
            │  Emits print events    │
            │  → Indexer picks up    │
            │  → Dashboard / ETL     │
            └────────────────────────┘
```

Key design principles:

- **Stateless contract** — No map reads/writes, no nonce tracking in contract. Every call is independent.
- **Emit-only** — Events are captured via `print` statements, read by off-chain indexers.
- **Script-friendly** — No prior state required, so repeated and batched submissions work predictably.
- **Dual-mode SDK** — Same API shape works for both private-key automation and wallet-signed user flows.

---

## Module Formats

The package ships with dual CommonJS and ESM builds:

| Format | Entry | Extension |
|---|---|---|
| ESM | `dist/esm/index.js` | `.js` |
| CommonJS | `dist/cjs/index.cjs` | `.cjs` |
| Type declarations | `dist/types/index.d.ts` | `.d.ts` |

Node.js and bundlers automatically resolve the correct format via the `exports` field in `package.json`:

```json
{
  "exports": {
    ".": {
      "import": {
        "types": "./dist/types/index.d.ts",
        "default": "./dist/esm/index.js"
      },
      "require": {
        "types": "./dist/types/index.d.ts",
        "default": "./dist/cjs/index.cjs"
      }
    }
  }
}
```

---

## Development

```bash
# Install dependencies
npm install

# Type-check
npm run lint

# Build all outputs
npm run build

# Clean build artifacts
npm run clean
```

### Build outputs

- `npm run build:cjs` — CommonJS output with `.cjs` extensions
- `npm run build:esm` — ESM output with `type: "module"` package marker
- `npm run build:types` — Declaration files (`.d.ts`) only

---

## License

MIT
