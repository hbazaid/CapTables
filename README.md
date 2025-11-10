# CapTables

CapTables is a Web3-native cap table management platform. It combines audited smart contracts with a modern dashboard so founders, finance teams, and counsel can manage share classes, allocations, vesting schedules, and secondary transfers in a trustless way.

## Project layout

```
contracts/   Hardhat workspace containing the CapTable Solidity contracts & tests
frontend/    Next.js dashboard that interacts with the deployed CapTable contract
.env.example Sample environment variables for both stacks
```

## Prerequisites

- Node.js 20+
- npm 10+
- MetaMask or another injected wallet for interacting with the dApp

---

## Smart contracts (`/contracts`)

### Install dependencies

```bash
cd contracts
npm install
```

### Run tests

```bash
npm test
```

### Compile & generate typings

```bash
npx hardhat compile
```

### Deploy

1. Copy `.env.example` to `.env` and fill in `SEPOLIA_RPC_URL`, `SEPOLIA_PRIVATE_KEY`, and `ETHERSCAN_API_KEY` (optional for verification).
2. Deploy using Hardhat (example for Sepolia):

```bash
CAP_TABLE_OWNER=0xYourDesiredOwnerAddress npx hardhat run scripts/deploy.ts --network sepolia
```

### Key contract features

- Create share classes with authorization limits, currencies, and optional transfer restrictions.
- Issue, transfer, and burn shares with full event history.
- Maintain vesting metadata (start, cliff, end) for each holder/class pair.
- Query aggregated snapshots of share classes and holder positions.

---

## Frontend (`/frontend`)

### Install dependencies

```bash
cd frontend
npm install
```

### Environment variables

Create `frontend/.env.local` with:

```bash
NEXT_PUBLIC_CAP_TABLE_ADDRESS=0xDeployedCapTableAddress
NEXT_PUBLIC_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY   # optional read-only RPC
```

### Run the development server

```bash
npm run dev
```

Navigate to `http://localhost:3000` to open the Cap Table Management Console. Connect your wallet (owner permissions enforced on-chain) to issue shares, update vesting, or manage transfers.

### Frontend highlights

- Wallet connection with runtime network feedback.
- Share class analytics, utilization metrics, and allocation summaries.
- Forms to create share classes, issue shares (with optional vesting), transfer equity, burn shares, and update vesting schedules.
- Automatic data refresh against the deployed contract.

---

## Mono-repo workflows

- **Format & Lint**: Contracts include Prettier scripts (`npm run lint`, `npm run format`). The frontend uses ESLint (`npm run lint`).
- **ABI Sync**: Re-run `npx hardhat compile` whenever contracts change. The ABI is automatically exported to `frontend/src/lib/abi/capTable.ts` via the generation script in `contracts`.
- **Environment**: Update `.env` / `.env.local` values whenever you deploy new contract instances or switch networks. Do not commit private keys.

---

## Next steps

- Build a Hardhat deployment script and automate ABI syncing on compile.
- Add role-based access control (e.g., multi-sig admins) and granular permissions.
- Extend the dashboard with analytics, exports (CSV/PDF), and document storage integrations.
- Integrate with managed wallets (Fireblocks, Gnosis Safe) for institutional usage.

Happy building! 🎉