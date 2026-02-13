# church-presenter

Desktop app (Electron + React + Prisma/SQLite) for church projection and service planning:
- songs library + projection
- Bible lookup + add to plan
- service plan composer (drag/drop + live cursor)
- projection screens `A/B/C` with mirror mode
- announcements (text/PDF/image)

## Prerequisites
- Node.js 20+
- npm 10+

## Install
```bash
npm install
```

## Run (dev)
```bash
npm run dev
```

## Validate / Build
```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Database
- SQLite with Prisma
- default URL: `file:../data/app.db` (from `apps/desktop/.env`)
- local DB files are intentionally git-ignored

## Product rules
- one plan per date
- when creating/duplicating a plan on an occupied date, the app automatically picks the next available date

## Project structure
- `apps/desktop/src/main`: Electron main process + IPC
- `apps/desktop/src/preload`: secure bridge (`window.cp`)
- `apps/desktop/src/renderer/src`: React UI
- `apps/desktop/prisma`: schema + migrations

## Current quality gates
- lint + typecheck + unit tests + build
- CI workflow runs the same checks on push/PR
