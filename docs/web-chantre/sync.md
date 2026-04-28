# Synchronisation SQLite ↔ PostgreSQL — App Desktop

L'app desktop fonctionne principalement sur PostgreSQL (Supabase).
En cas d'absence de connexion internet, elle bascule automatiquement sur
SQLite local. La synchronisation est bidirectionnelle avec PostgreSQL comme
source de vérité absolue.

---

## Principe général

```
Démarrage app
      │
      ▼
checkDbConnection() ──── OK ────► mode PostgreSQL (principal)
      │                                    │
    Échec                         sync pull au démarrage
      │                           sync push à chaque mutation
      ▼                           sync pull toutes les 1-2h
mode SQLite (fallback)
      │
  écriture locale
      │
reconnexion détectée
      │
      ▼
sync push → PostgreSQL
(PostgreSQL gagne en cas de conflit)
toast si écrasement
```

---

## Source de vérité

**PostgreSQL gagne toujours** en cas de conflit.

Justification : les chantres sur l'app web sont les gestionnaires officiels
de la bibliothèque. Le desktop est le consommateur principal. Si un même chant
a été modifié des deux côtés pendant une coupure, la version PostgreSQL écrase
la version SQLite — sans merge, sans diff.

L'utilisateur desktop reçoit un toast d'avertissement si des modifications
locales ont été écrasées, pour ne pas être surpris.

---

## États de connexion

```ts
type ConnectionState =
  | "ONLINE"       // connecté à PostgreSQL, opérations normales
  | "OFFLINE"      // SQLite fallback, modifications locales en attente
  | "SYNCING"      // sync en cours (pull ou push)
  | "SYNC_ERROR"   // sync échouée, retry prévu
```

Persisté en mémoire dans le process main. Broadcasté aux fenêtres renderer
via IPC (`sync:stateChange`) pour affichage dans l'UI.

---

## Architecture dans le code

### Fichiers concernés

```
apps/desktop/src/main/
  db.ts                  ← checkDbConnection(), getActiveDb()
  sync/
    syncManager.ts       ← orchestrateur principal
    pullSync.ts          ← PostgreSQL → SQLite
    pushSync.ts          ← SQLite → PostgreSQL (modifications offline)
    conflictResolver.ts  ← résolution de conflits (PostgreSQL gagne)
    syncState.ts         ← état de connexion, broadcast IPC
```

### `db.ts` — sélection de la base active

```ts
import { PrismaClient as PgClient } from "@prisma/client"         // provider postgresql
import Database from "better-sqlite3"

let connectionState: ConnectionState = "ONLINE"
let pgClient: PgClient | null = null

export async function checkDbConnection(): Promise<boolean> {
  try {
    await getPgClient().$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

export function getPgClient(): PgClient {
  if (!pgClient) {
    pgClient = new PgClient({ datasources: { db: { url: process.env.DATABASE_URL } } })
  }
  return pgClient
}

export function getSqliteDb(): Database.Database {
  return new Database(getSqlitePath())
}

/** Retourne le client actif selon l'état de connexion */
export function getActiveDb() {
  return connectionState === "ONLINE" ? getPgClient() : getSqliteDb()
}
```

---

## Démarrage de l'app

Dans `main.ts`, séquence d'initialisation :

```ts
import { SyncManager } from "./sync/syncManager"

app.whenReady().then(async () => {
  const sync = new SyncManager()
  await sync.initialize()   // détecte connexion + pull initial si online

  // Retry de connexion toutes les 2 minutes si offline
  setInterval(() => sync.checkAndReconnect(), 2 * 60 * 1000)

  // Pull périodique toutes les 2 heures si online
  setInterval(() => sync.periodicPull(), 2 * 60 * 60 * 1000)

  createMainWindow()
})
```

---

## SyncManager — orchestrateur

```ts
// sync/syncManager.ts

export class SyncManager {
  private state: ConnectionState = "ONLINE"

  async initialize() {
    const online = await checkDbConnection()
    if (online) {
      await this.pullFromPostgres()
    } else {
      this.setState("OFFLINE")
    }
  }

  async checkAndReconnect() {
    if (this.state === "ONLINE" || this.state === "SYNCING") return

    const online = await checkDbConnection()
    if (!online) return

    // Reconnexion détectée — push d'abord, puis pull
    this.setState("SYNCING")
    try {
      const pushResult = await pushOfflineChanges()
      await this.pullFromPostgres()
      this.setState("ONLINE")

      if (pushResult.overwritten > 0) {
        broadcastToWindows("sync:conflictWarning", {
          overwritten: pushResult.overwritten,
          message: `${pushResult.overwritten} modification(s) locale(s) écrasée(s) par la version serveur.`,
        })
      }
    } catch (e) {
      this.setState("SYNC_ERROR")
    }
  }

  async periodicPull() {
    if (this.state !== "ONLINE") return
    this.setState("SYNCING")
    try {
      await this.pullFromPostgres()
      this.setState("ONLINE")
    } catch {
      this.setState("SYNC_ERROR")
    }
  }

  private setState(state: ConnectionState) {
    this.state = state
    broadcastToWindows("sync:stateChange", { state })
  }
}
```

---

## Pull — PostgreSQL → SQLite

Remplace les données SQLite par les données PostgreSQL.
Opération complète sur `Song`, `SongBlock`, `ServicePlan`, `ServiceItem`.

```ts
// sync/pullSync.ts

export async function pullFromPostgres(): Promise<void> {
  const pg = getPgClient()
  const sqlite = getSqliteDb()

  // Récupérer toutes les données depuis PostgreSQL
  const [songs, plans] = await Promise.all([
    pg.song.findMany({ include: { blocks: true } }),
    pg.servicePlan.findMany({ include: { items: true } }),
  ])

  // Remplacer atomiquement dans SQLite (transaction)
  const replaceAll = sqlite.transaction(() => {
    sqlite.prepare("DELETE FROM SongBlock").run()
    sqlite.prepare("DELETE FROM Song").run()
    sqlite.prepare("DELETE FROM ServiceItem").run()
    sqlite.prepare("DELETE FROM ServicePlan").run()

    for (const song of songs) {
      sqlite.prepare(`
        INSERT INTO Song (id, title, author, key, tags, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(song.id, song.title, song.author, song.key,
             JSON.stringify(song.tags),   // SQLite stocke les tags en JSON-as-TEXT
             song.createdAt.toISOString(), song.updatedAt.toISOString())

      for (const block of song.blocks) {
        sqlite.prepare(`
          INSERT INTO SongBlock (id, songId, label, type, lyrics, "order")
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(block.id, block.songId, block.label, block.type, block.lyrics, block.order)
      }
    }

    for (const plan of plans) {
      sqlite.prepare(`
        INSERT INTO ServicePlan (id, date, title, backgroundConfig, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(plan.id, plan.date.toISOString(), plan.title,
             plan.backgroundConfig, plan.createdAt.toISOString(), plan.updatedAt.toISOString())

      for (const item of plan.items) {
        sqlite.prepare(`
          INSERT INTO ServiceItem
            (id, planId, "order", kind, title, content, refId, refSubId,
             mediaPath, backgroundConfig, secondaryContent, durationSeconds)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(item.id, item.planId, item.order, item.kind, item.title,
               item.content, item.refId, item.refSubId, item.mediaPath,
               item.backgroundConfig, item.secondaryContent, item.durationSeconds)
      }
    }
  })

  replaceAll()
}
```

---

## Push — SQLite offline → PostgreSQL

Envoie les modifications faites en offline vers PostgreSQL.
Utilise `updatedAt` pour détecter les changements locaux depuis le dernier pull.

```ts
// sync/pushSync.ts

export type PushResult = {
  pushed: number      // entités envoyées à PostgreSQL
  overwritten: number // entités locales écrasées par PostgreSQL (conflit)
}

export async function pushOfflineChanges(): Promise<PushResult> {
  const pg = getPgClient()
  const sqlite = getSqliteDb()

  // Lire le timestamp du dernier pull réussi
  const lastPullAt = getLastPullTimestamp()   // persisté dans userData/sync.json

  // Chants modifiés localement après le dernier pull
  const localSongs = sqlite.prepare(`
    SELECT * FROM Song WHERE updatedAt > ?
  `).all(lastPullAt) as LocalSong[]

  let pushed = 0
  let overwritten = 0

  for (const localSong of localSongs) {
    const remoteSong = await pg.song.findUnique({ where: { id: localSong.id } })

    if (!remoteSong) {
      // Nouveau chant créé offline → créer dans PostgreSQL
      await pg.song.create({ data: mapLocalToPg(localSong) })
      pushed++
      continue
    }

    // Conflit : le chant existe des deux côtés
    // PostgreSQL gagne — on ne pousse pas la version locale
    // On compte l'écrasement pour avertir l'utilisateur
    if (new Date(localSong.updatedAt) > new Date(remoteSong.updatedAt)) {
      // Local plus récent, mais PostgreSQL gagne quand même
      overwritten++
    }
    // Si remote plus récent : normal, rien à faire
  }

  // Idem pour ServicePlan / ServiceItem
  // ...

  saveLastPullTimestamp(new Date().toISOString())
  return { pushed, overwritten }
}
```

---

## Résolution de conflits

```ts
// sync/conflictResolver.ts

/**
 * PostgreSQL gagne toujours.
 * Cette fonction détermine combien d'entités locales seraient écrasées,
 * pour alimenter le toast d'avertissement.
 */
export function countConflicts(
  localSongs: LocalSong[],
  remoteSongs: RemoteSong[],
): number {
  const remoteMap = new Map(remoteSongs.map((s) => [s.id, s]))
  let conflicts = 0

  for (const local of localSongs) {
    const remote = remoteMap.get(local.id)
    if (remote && new Date(local.updatedAt) > new Date(remote.updatedAt)) {
      conflicts++
    }
  }

  return conflicts
}
```

---

## Persistance de l'état de sync

Le timestamp du dernier pull réussi est stocké dans `userData/sync.json` :

```json
{
  "lastPullAt": "2026-04-27T08:00:00.000Z",
  "lastPushAt": "2026-04-27T07:55:00.000Z"
}
```

```ts
// sync/syncState.ts

const SYNC_FILE = path.join(app.getPath("userData"), "sync.json")

export function getLastPullTimestamp(): string {
  try {
    const data = JSON.parse(fs.readFileSync(SYNC_FILE, "utf-8"))
    return data.lastPullAt ?? new Date(0).toISOString()
  } catch {
    return new Date(0).toISOString()   // jamais synced
  }
}

export function saveLastPullTimestamp(iso: string) {
  const existing = (() => {
    try { return JSON.parse(fs.readFileSync(SYNC_FILE, "utf-8")) } catch { return {} }
  })()
  fs.writeFileSync(SYNC_FILE, JSON.stringify({ ...existing, lastPullAt: iso }))
}
```

---

## IPC — état de sync dans le renderer

Le renderer reçoit les changements d'état via IPC et affiche un indicateur
dans le `Header` de l'app desktop.

```ts
// Renderer — dans Header.tsx ou LiveBar.tsx
window.cp.sync.onStateChange((state: ConnectionState) => {
  setSyncState(state)
})

window.cp.sync.onConflictWarning(({ overwritten, message }) => {
  toast.warning(message)
})
```

Indicateur visuel dans le `Header` :

| État | Affichage |
|------|-----------|
| `ONLINE` | Point vert discret — aucun texte |
| `OFFLINE` | Badge orange "Hors ligne — modifications locales" |
| `SYNCING` | Spinner discret "Synchronisation..." |
| `SYNC_ERROR` | Badge rouge "Erreur de sync" + bouton "Réessayer" |

---

## Canaux IPC à ajouter

Dans `src/shared/ipc.ts`, ajouter dans `CpApi` :

```ts
sync: {
  getState: () => Promise<ConnectionState>
  onStateChange: (cb: (state: ConnectionState) => void) => Unsubscribe
  onConflictWarning: (cb: (data: { overwritten: number; message: string }) => void) => Unsubscribe
  retrySync: () => Promise<void>
}
```

---

## Cas limites documentés

| Situation | Comportement |
|-----------|-------------|
| Coupure internet pendant un push | Transaction interrompue — SQLite intact, retry au prochain cycle |
| PostgreSQL inaccessible au démarrage | Mode SQLite immédiat, toast "Démarrage hors ligne" |
| Pull échoue à mi-chemin | Transaction SQLite rollback — données précédentes intactes |
| Nouveau chant créé offline, même titre existe sur PostgreSQL | Le chant local est créé avec un suffixe " (local)" — l'admin peut fusionner manuellement |
| SQLite corrompu | Recréer depuis PostgreSQL via pull complet — données offline perdues |

---

## Checklist d'implémentation (Phase 1 desktop)

- [ ] `checkDbConnection()` dans `db.ts`
- [ ] `SyncManager` avec initialize / checkAndReconnect / periodicPull
- [ ] `pullSync.ts` — remplacement atomique SQLite
- [ ] `pushSync.ts` — push des modifications offline
- [ ] `conflictResolver.ts` — comptage des conflits
- [ ] `syncState.ts` — persistance timestamp + broadcast IPC
- [ ] Nouveaux canaux IPC `sync:*` dans `ipc.ts` et `preload.ts`
- [ ] Indicateur visuel dans `Header.tsx`
- [ ] Toast de conflit dans le renderer
- [ ] Tests unitaires pour `conflictResolver.ts` et `pullSync.ts`
