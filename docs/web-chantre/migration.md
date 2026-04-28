# Initialisation PostgreSQL

Ce document couvre deux choses distinctes :
1. **Ajout de PostgreSQL dans l'app desktop** (en plus du SQLite existant — fallback offline)
2. **Création du schéma PostgreSQL pour `apps/web`** sur Supabase

---

## Principe

```
apps/desktop/                      apps/web/
  prisma/schema.prisma (sqlite)      prisma/schema.prisma (postgresql)
  src/main/sync/ ──────────────────► PostgreSQL Supabase ◄── apps/web
  data/app.db (fallback offline)
```

- Le desktop utilise **PostgreSQL en priorité** et SQLite en fallback offline.
- La synchronisation est gérée par `sync/syncManager.ts` (voir `sync.md`).
- PostgreSQL est la source de vérité partagée entre desktop et web.
- SQLite du desktop n'est jamais accédé par l'app web.

---

## Prérequis

- [ ] Compte Supabase créé sur [supabase.com](https://supabase.com) (free tier suffisant)
- [ ] Projet Supabase créé (Dashboard → New project → choisir région Europe West)
- [ ] Deux URLs notées depuis Supabase → Project Settings → Database :
  - **Direct Connection** (pour `prisma migrate dev` en local) : `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`
  - **Transaction Pooler** (pour l'app web sur Vercel + desktop) : `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
- [ ] Node.js ≥ 18 sur la machine de développement

---

## Vue d'ensemble

```
Partie A — App desktop
  Phase A1 — Ajouter le client PostgreSQL (Prisma postgresql)
  Phase A2 — Exporter les données SQLite existantes vers PostgreSQL
  Phase A3 — Vérification desktop

Partie B — App web
  Phase B1 — Créer apps/web/prisma/schema.prisma
  Phase B2 — Appliquer le schéma sur PostgreSQL Supabase
  Phase B3 — Vérification web
```

---

## Partie A — App desktop

### Phase A1 — Ajouter le client PostgreSQL dans apps/desktop

Le schéma Prisma SQLite du desktop (`apps/desktop/prisma/schema.prisma`) **ne change pas**.
On ajoute un second client Prisma avec le provider `postgresql`, utilisé uniquement
pour la synchronisation. Les deux coexistent sans conflit.

Ajouter dans `apps/desktop/package.json` :
```json
{
  "dependencies": {
    "@prisma/client": "^6.0.0"
  },
  "devDependencies": {
    "prisma": "^6.0.0"
  }
}
```

Créer `apps/desktop/prisma/schema.pg.prisma` (second schéma, provider postgresql) :
```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/@prisma/pg-client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Même modèles que schema.prisma mais provider postgresql
// (Song, SongBlock, ServicePlan, ServiceItem uniquement — pas les modèles web)
model Song { ... }
model SongBlock { ... }
model ServicePlan { ... }
model ServiceItem { ... }
```

Ajouter dans `apps/desktop/.env` :
```env
# Transaction Pooler Supabase (port 6543) — utilisé par l'app en runtime
DATABASE_URL_PG="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
```

Générer le client PostgreSQL :
```bash
cd apps/desktop
npx prisma generate --schema=prisma/schema.pg.prisma
```

---

### Phase A2 — Exporter les données SQLite vers PostgreSQL

Après avoir mis en place le `SyncManager` (voir `sync.md`), effectuer un premier
push complet des données SQLite existantes vers PostgreSQL :

```bash
# Dans l'app desktop, ouvrir DevTools → Console
await window.cp.sync.pushAll()   # pousse tout sans vérifier les conflits (base vide)
```

Ou via un script one-shot :
```bash
cd apps/desktop
npx ts-node src/main/sync/initialPush.ts
```

Vérifier dans `prisma studio` (apps/web) que les données sont bien arrivées.

---

### Phase A3 — Vérification desktop

- [ ] L'app démarre et se connecte à PostgreSQL (indicateur vert dans le Header)
- [ ] Couper internet → basculement automatique sur SQLite (badge orange "Hors ligne")
- [ ] Créer un chant en offline → visible dans SQLite
- [ ] Rétablir internet → sync automatique → chant visible dans PostgreSQL
- [ ] `npm run typecheck` passe sans erreur
- [ ] `npm run test` passe sans erreur

---

## Partie B — App web

### Phase B1 — Créer le schéma Prisma de apps/web

Créer `apps/web/prisma/schema.prisma` :

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── Modèles métier (repris du desktop, adaptés PostgreSQL) ───────────────────

model Song {
  id        String      @id @default(cuid())
  title     String      @unique
  author    String?
  key       String?
  tags      String[]    // tableau natif PostgreSQL (pas JSON-as-TEXT)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  blocks    SongBlock[]
  favorites Favorite[]
  learnings SongLearning[]
  items     ServiceItem[]
}

model SongBlock {
  id     String @id @default(cuid())
  songId String
  label  String
  type   String // VERSE | CHORUS | BRIDGE | INTRO | OUTRO | OTHER
  lyrics String
  order  Int

  song  Song       @relation(fields: [songId], references: [id], onDelete: Cascade)
  notes SongNote[]
}

model ServicePlan {
  id               String        @id @default(cuid())
  date             DateTime      @unique
  title            String?
  backgroundConfig String?       // JSON-as-TEXT — ne pas changer en Json
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  items ServiceItem[]
}

model ServiceItem {
  id               String  @id @default(cuid())
  planId           String
  order            Int
  kind             String
  title            String?
  content          String?
  refId            String?
  refSubId         String?
  mediaPath        String?
  backgroundConfig String? // JSON-as-TEXT — ne pas changer en Json
  secondaryContent String? // JSON-as-TEXT — ne pas changer en Json
  durationSeconds  Int?

  plan ServicePlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  song Song?       @relation(fields: [refId], references: [id], onDelete: SetNull)
}

// ── Modèles spécifiques à l'app web ─────────────────────────────────────────

model User {
  id           String    @id @default(cuid())
  name         String
  email        String    @unique
  passwordHash String
  role         UserRole  @default(CHANTRE)
  isActive     Boolean   @default(true)
  lastLoginAt  DateTime?
  createdAt    DateTime  @default(now())

  favorites Favorite[]
  notes     SongNote[]
  learnings SongLearning[]
}

enum UserRole {
  ADMIN
  CHANTRE
  LECTEUR
}

model Favorite {
  userId    String
  songId    String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  song Song @relation(fields: [songId], references: [id], onDelete: Cascade)

  @@id([userId, songId])
}

model SongNote {
  id          String   @id @default(cuid())
  userId      String
  songBlockId String
  content     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  songBlock SongBlock @relation(fields: [songBlockId], references: [id], onDelete: Cascade)
}

model SongLearning {
  userId    String
  songId    String
  status    LearningStatus @default(TO_LEARN)
  updatedAt DateTime       @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  song Song @relation(fields: [songId], references: [id], onDelete: Cascade)

  @@id([userId, songId])
}

enum LearningStatus {
  TO_LEARN
  IN_PROGRESS
  MASTERED
}
```

> **Note `Song.tags`** : en PostgreSQL on utilise le tableau natif `String[]`
> au lieu d'un JSON-as-TEXT. La couche API web lira et écrira ce champ comme
> un tableau TypeScript normal — aucun `JSON.parse` nécessaire.
>
> **Note `backgroundConfig` / `secondaryContent`** : conservés en `String?`
> (JSON-as-TEXT) pour cohérence avec le desktop. Parsés manuellement côté API
> si besoin d'accéder à leur contenu.

---

## Phase B2 — Appliquer le schéma sur PostgreSQL Supabase

### 2.1 Deux URLs Supabase à connaître

Depuis Supabase → Project Settings → Database :

| Usage | URL | Port |
|-------|-----|------|
| `prisma migrate dev` (local) | Direct Connection | 5432 |
| App runtime (Vercel + desktop) | Transaction Pooler | 6543 |

Prisma migrate a besoin de la connexion directe (pas de pooler pour les migrations).

### 2.2 Créer `apps/web/.env` (pour Prisma CLI) et `apps/web/.env.local` (pour Next.js)

`apps/web/.env` — utilisé par `prisma migrate` uniquement :
```env
# Direct Connection — NE PAS utiliser en production (pas de pooler)
DATABASE_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
```

`apps/web/.env.local` — utilisé par Next.js en dev :
```env
# Transaction Pooler — connexion via pgbouncer (mode session)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
```

Ne jamais committer ces fichiers (déjà dans `.gitignore`).

### 2.3 Appliquer la première migration

```bash
cd apps/web
npx prisma migrate dev --name "init"
```

Cette commande :
1. Lit `prisma/schema.prisma`
2. Crée le fichier de migration dans `prisma/migrations/`
3. Applique la migration sur la base Supabase via la Direct Connection
4. Génère le client Prisma dans `node_modules/@prisma/client`

### 2.4 Créer le client Prisma singleton

`apps/web/src/lib/prisma.ts` :

```ts
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

Importer dans les Route Handlers via `import { prisma } from "@/lib/prisma"`.

---

## Phase B3 — Vérification web

### Checklist

- [ ] `npx prisma studio` s'ouvre et affiche les tables vides
- [ ] Les tables `Song`, `SongBlock`, `ServicePlan`, `ServiceItem`, `User`,
      `Favorite`, `SongNote`, `SongLearning` sont présentes
- [ ] `npm run prisma:generate` passe sans erreur
- [ ] `npm run typecheck` (apps/web) passe sans erreur
- [ ] Créer un utilisateur ADMIN via le script seed (`seed.md`)
- [ ] Se connecter avec ce compte sur l'app web

### Vérifier la connexion depuis le desktop (optionnel)

L'app desktop n'est pas affectée par cette initialisation — son SQLite
est intact. Vérifier simplement que le desktop fonctionne toujours normalement
après avoir travaillé sur apps/web.

---

## Futures migrations de schéma

Pour toute modification du schéma `apps/web/prisma/schema.prisma` :

```bash
cd apps/web
# Développement — crée et applique une migration
npx prisma migrate dev --name "description-du-changement"

# Production — applique les migrations en attente (sans interaction)
npx prisma migrate deploy
```

La commande `migrate deploy` est celle utilisée dans le pipeline Vercel
(voir `deploiement.md`). Ne jamais utiliser `migrate dev` en production.

---

## App desktop — SQLite intact

Le schéma SQLite du desktop (`prisma/schema.prisma`) et `better-sqlite3` restent
**inchangés**. Seul un second schéma `prisma/schema.pg.prisma` est ajouté pour
la synchronisation. Les scripts `prisma:generate` et `db:migrate:safe` existants
continuent de pointer sur le schéma SQLite.
