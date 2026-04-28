import { checkDbConnection } from "./pgClient";
import { pullFromPostgres } from "./pullSync";
import { pushOfflineChanges } from "./pushSync";
import {
  type ConnectionState,
  broadcastToWindows,
  saveLastPullTimestamp,
} from "./syncState";

export class SyncManager {
  private state: ConnectionState = "ONLINE";

  getState(): ConnectionState {
    return this.state;
  }

  async initialize(): Promise<void> {
    const url = process.env["DATABASE_URL_PG"];
    if (!url || url.includes("user:pass")) {
      // Not configured yet — stay on SQLite, no warning
      this.setState("OFFLINE");
      return;
    }

    const online = await checkDbConnection();
    if (online) {
      this.setState("SYNCING");
      try {
        await pullFromPostgres();
        saveLastPullTimestamp(new Date().toISOString());
        this.setState("ONLINE");
      } catch (e) {
        console.error("[sync] initial pull failed", e);
        this.setState("SYNC_ERROR");
      }
    } else {
      this.setState("OFFLINE");
      broadcastToWindows("pgSync:stateChange", { state: "OFFLINE" });
    }
  }

  async checkAndReconnect(): Promise<void> {
    if (this.state === "ONLINE" || this.state === "SYNCING") return;

    const online = await checkDbConnection();
    if (!online) return;

    this.setState("SYNCING");
    try {
      const pushResult = await pushOfflineChanges();
      await pullFromPostgres();
      saveLastPullTimestamp(new Date().toISOString());
      this.setState("ONLINE");

      if (pushResult.overwritten > 0) {
        broadcastToWindows("pgSync:conflictWarning", {
          overwritten: pushResult.overwritten,
          message: `${pushResult.overwritten} modification(s) locale(s) écrasée(s) par la version serveur.`,
        });
      }
    } catch (e) {
      console.error("[sync] reconnect failed", e);
      this.setState("SYNC_ERROR");
    }
  }

  async periodicPull(): Promise<void> {
    if (this.state !== "ONLINE") return;
    this.setState("SYNCING");
    try {
      await pullFromPostgres();
      saveLastPullTimestamp(new Date().toISOString());
      this.setState("ONLINE");
    } catch (e) {
      console.error("[sync] periodic pull failed", e);
      this.setState("SYNC_ERROR");
    }
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    broadcastToWindows("pgSync:stateChange", { state });
  }
}

export const syncManager = new SyncManager();
