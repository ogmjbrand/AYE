# AYE

AYE is a browser-based 3D life-simulation prototype built with React,
TypeScript, Vite, Three.js, and React Three Fiber.

## Run locally

```powershell
npm install
npm run dev
```

## Checks

```powershell
npm run build
npm run lint
npm test
npm run assets:check
```

## Project documents

- [Requirements register](docs/AYE_REQUIREMENTS_REGISTER.md) — reconciled
  requirements, status, evidence, gaps, and next acceptance criteria.
- [Architecture and audit](docs/ARCHITECTURE.md) — architectural history and
  system boundaries; check the register for current-worktree status.
- [Art direction](docs/ART_DIRECTION.md) — visual target and honest limits of
  the browser prototype.
- [Asset checklist](docs/ASSET_CHECKLIST.md) and
  [asset inventory](docs/ASSET_INVENTORY.md) — installed, missing, and
  licensing-sensitive assets.
- [Character pipeline](docs/CHARACTER_PIPELINE.md) — current character rig,
  customization, and migration constraints.
- [Backend status](docs/BACKEND.md) — local Supabase foundations and
  deployment limitations.

The game currently saves guest progress in this browser. The presence of
backend migrations or account UI does not mean cloud saves, multiplayer,
payments, or a production backend are deployed.
