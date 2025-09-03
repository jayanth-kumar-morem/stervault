# Stervault Lending

Stervault is a DeFi lending protocol built on Solana. Users can deposit tokens to earn interest, use deposits as collateral, borrow against collateral with real‑time Pyth prices, repay loans, and view transaction history – all from a modern Next.js web app backed by an Anchor program.


## Contents

- Overview
- Key Technologies
- Project Structure
- Getting Started
- Local Development & Environment Setup
- Blockchain Architecture (Anchor Program)
- Account Structure & PDA Derivations
- Program Instructions & Errors
- API/IDL Reference
- Frontend Architecture & Data Layer
- Core Features (Markets, Deposits, Borrowing, Repayment, Withdrawals, History)
- Configuration & Constants (Tokens, Price Feeds)
- Price Oracle Integration (Pyth)
- Testing
- Deployment
- Troubleshooting
- License


## Overview

- Solana lending protocol with interest‑bearing accounting, LTV risk controls, and liquidations safeguards.
- Real‑time pricing via Pyth Network feeds for collateral and borrow validation.
- Next.js app (App Router) with typed data layer and reusable UI components.


## Key Technologies

- Solana, Anchor, SPL Token, Associated Token Accounts
- Pyth Network price feeds
- Next.js, React, React Query, TypeScript, Tailwind CSS
- Anchor Bankrun/solana-bankrun for testing


## Project Structure

Top‑level folders to know:

- `anchor/`: Anchor program, tests, IDL, and scripts
  - `programs/lending/`: Rust program source
  - `target/idl/lending.json`: Generated IDL
  - `target/types/lending.ts`: Generated TypeScript client
  - `price-feeds/`: Pyth feed mapping files per environment
  - `scripts/`: Utilities (e.g., Pyth setup)
- `src/`: Next.js app and components
  - `app/`: Routes, layouts, providers
  - `components/`: Feature UIs and data access hooks
  - `components/ui/`: Shared UI primitives used across the app
  - `lib/`: Utilities, constants
- `public/`: Token metadata JSON per environment and static assets
- `docs/`: In‑repo documentation (architecture, API, features, etc.)


## Getting Started

### Prerequisites

- Node v18.18.0+
- Rust v1.77.2+
- Anchor CLI 0.30.1+
- Solana CLI 1.18.17+
- pnpm (recommended)

### Install

```bash
pnpm install
```

### Start the web app

```bash
pnpm dev
```

### Build the web app

```bash
pnpm build
```


## Local Development & Environment Setup

### Anchor workflow

- Sync program id (updates Anchor config and `declare_id!`):

```bash
pnpm anchor keys sync
```

- Build the program:

```bash
pnpm anchor-build
```

- Start local validator with program deployed:

```bash
pnpm anchor-localnet
```

- Run program tests:

```bash
pnpm anchor-test
```

### Tokens & Price Feeds

- Localnet tokens: `public/tokens_localnet.json`
- Devnet tokens: `public/tokens_devnet.json`
- Pyth feed mappings (e.g., devnet): `anchor/price-feeds/pyth_mapping_devnet.json`

Pyth program id (devnet): `pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT`


## Blockchain Architecture (Anchor Program)

- Program implements deposits, withdrawals, borrowing, and repayment.
- Real‑time price validation (borrow/repay) protects LTV and liquidation rules.
- On‑chain state split across deterministic Program Derived Addresses (PDAs).

Deployed example (docs): `FYkahL7zxyc3cS9wwA8b45JUNKoHSw6R4Ln5t7GXU5oD` (regenerate/sync in your env as needed).


## Account Structure & PDA Derivations

Primary account types:

- Bank: per‑mint market configuration and aggregates
- UserGlobalState: per‑user global context (mint list, active positions, counters)
- UserTokenState: per‑user, per‑mint balances in protocol units
- BorrowPosition: per‑position collateral/borrow tuple with lifecycle
- PythNetworkFeedId: mapping from token symbol → Pyth feed id

PDA seeds:

- Bank: `[mint_address]`
- Treasury token account: `["treasury", mint_address]`
- UserGlobalState: `["user_global", user_pubkey]`
- UserTokenState: `[user_pubkey, mint_address]`
- BorrowPosition: `["position", user_pubkey, collateral_mint, borrow_mint, position_id]`
- PythNetworkFeedId: `["pyth_network_feed_id", symbol]`

The protocol uses a shares‑based accounting model (values tracked as s) for automatic interest accrual.


## Program Instructions & Errors

Initialization:

- `initBank`
- `initUser`
- `initUserTokenState`
- `initBorrowPosition`
- `storeSymbolFeedId`

User flow:

- `deposit(amount)`
- `withdraw(amount)`
- `borrow(position_id, amount)`
- `repay(position_id, amount)`

Selected error codes (see IDL for full list):

- 6000 BorrowAmountTooLarge
- 6001 WithdrawAmountExceedsCollateralValue
- 6002 OverWithdrawRequest
- 6004 OverBorrowRequest
- 6005 OverRepayRequest
- 6008 InvalidPriceFeed
- 6012 StalePrice
- 6015 InsufficientCollateral


## API/IDL Reference

- IDL: `anchor/target/idl/lending.json`
- TS client types: `anchor/target/types/lending.ts`

Core instruction accounts include user signer, mints, banks (borrow/collateral), user token states, ATAs, Pyth price updates, and PDA accounts noted above.


## Frontend Architecture & Data Layer

- Next.js App Router in `src/app/` with provider stack:
  - `ReactQueryProvider` → data fetching/cache
  - `ClusterProvider` → network/cluster
  - `SolanaProvider` → wallet integration
- Strongly‑typed data access hooks in `src/components/*/*-data-access.tsx` wrap the Anchor client and Pyth price utilities.
- UI built from reusable primitives in `src/components/ui/` (do not implement UI from scratch).


## Core Features

### Markets & Banking

- Browse token markets (Banks) with APY, LTV, and risk parameters.
- Token metadata (symbol, name, logo, decimals) merged from environment JSON.

### Deposits & Withdrawals

- Deposit tokens to earn interest (shares‑based accounting).
- Withdraw principal + accrued interest, with validation against balances and LTV.

### Borrowing & Repayment

- Open borrow positions by pledging collateral; borrow token must respect max LTV based on Pyth prices.
- Repay debt partially or fully; release collateral as positions become healthy or fully repaid.
- Active positions include collateral/borrow USD values, LTV, and health indicators.

### Transaction History

- View recent protocol interactions and token movements.


## Configuration & Constants

Tokens (per environment):

- `public/tokens_localnet.json`
- `public/tokens_devnet.json`
- `public/tokens.json` (generic)

Pyth mapping (example devnet entry):

```json
{
  "pythProgramId": "pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT",
  "priceFeeds": {
    "SOL": {
      "symbol": "SOL",
      "feedId": "0xef0d8b6f...c280b56d",
      "address": "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE"
    }
  }
}
```

Bank parameters (per mint): deposit/borrow interest rates, max LTV, liquidation thresholds/bonus, fees, min deposit, accrual period.


## Price Oracle Integration (Pyth)

- `storeSymbolFeedId` maps symbols to feed ids on‑chain.
- Borrow/repay require current `PriceUpdateV2` accounts for both collateral and borrow tokens.
- Frontend batches price requests and caches results for USD conversions and LTV calculations.


## Testing

- Anchor tests:

```bash
pnpm anchor-test
```

- Bankrun/local workflows for deterministic program testing are configured in `anchor/tests` and `anchor/tests/bankrun-utils`.


## Deployment

- Devnet deploy:

```bash
pnpm anchor deploy --provider.cluster devnet
```

- After deploy, sync keys and ensure the frontend uses the updated program id (IDL/types regenerate during builds and tests).


## Troubleshooting

- Prices not found: verify `anchor/price-feeds/pyth_mapping_*.json` and that `storeSymbolFeedId` was run for required symbols.
- PDA errors: confirm seeds and wallet, and that initialization instructions were executed.
- LTV/health rejections: borrow may exceed max LTV or collateral value given current Pyth prices.


## License

MIT
