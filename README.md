# Vault Chain Protocol Web

Frontend from the team's `dayyttt/vault-chain-protocol` repository, kept separate from the Hardhat contracts in the repository root.

## Run locally

```powershell
cd web
Copy-Item .env.local.example .env.local
npm install
npm run dev
```

Fill the required `NEXT_PUBLIC_*` values in `.env.local` before attempting a launch. The frontend will block a launch when the destination contracts or router have not been deployed.

The root project remains the EVM contract and deployment suite; run its commands from the root directory.
