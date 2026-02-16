import { WebSocketServer, WebSocket } from "ws";
import { ipcMain } from "electron";
import { networkInterfaces } from "os";
import type { CpLiveState, CpProjectionState, CpSyncStatus, ScreenKey } from "../../shared/ipc";

const DEFAULT_PORT = 9477;

let wss: WebSocketServer | null = null;
let statusCallback: ((status: CpSyncStatus) => void) | null = null;

// Reference to the live command handler (set by registerSyncIpc)
type LiveCommandHandler = (cmd: string, data?: unknown) => Promise<CpLiveState>;
let liveCommandHandler: LiveCommandHandler | null = null;

function getLocalAddresses(): string[] {
  const addresses: string[] = [];
  const nets = networkInterfaces();
  for (const iface of Object.values(nets)) {
    if (!iface) continue;
    for (const info of iface) {
      if (info.family === "IPv4" && !info.internal) {
        addresses.push(info.address);
      }
    }
  }
  return addresses;
}

function getStatus(): CpSyncStatus {
  if (!wss) return { running: false, port: DEFAULT_PORT, clients: 0, addresses: [] };
  const clients = [...wss.clients].filter((c) => c.readyState === WebSocket.OPEN).length;
  const port = (wss.address() as { port: number } | null)?.port ?? DEFAULT_PORT;
  return { running: true, port, clients, addresses: getLocalAddresses() };
}

function broadcastStatus() {
  const status = getStatus();
  statusCallback?.(status);
}

/** Broadcast a message to all connected WebSocket clients */
function broadcastToClients(type: string, payload: unknown) {
  if (!wss) return;
  const msg = JSON.stringify({ type, payload });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

/** Called by main.ts when live state changes */
export function syncBroadcastLive(liveState: CpLiveState) {
  broadcastToClients("live:update", liveState);
}

/** Called by main.ts when screen state changes */
export function syncBroadcastScreenState(key: ScreenKey, state: CpProjectionState) {
  broadcastToClients("screens:state", { key, state });
}

function startServer(port: number): Promise<{ ok: true; port: number; addresses: string[] } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    if (wss) {
      resolve({ ok: true, port: (wss.address() as { port: number }).port, addresses: getLocalAddresses() });
      return;
    }

    try {
      const server = new WebSocketServer({ port, host: "0.0.0.0" });

      server.on("listening", () => {
        wss = server;
        broadcastStatus();
        resolve({ ok: true, port, addresses: getLocalAddresses() });
      });

      server.on("error", (err: Error) => {
        if (!wss) {
          resolve({ ok: false, error: err.message });
        }
      });

      server.on("connection", (ws) => {
        broadcastStatus();

        ws.on("message", async (raw) => {
          try {
            const msg = JSON.parse(String(raw)) as { type?: string; data?: unknown };
            if (msg.type && liveCommandHandler) {
              await liveCommandHandler(msg.type, msg.data);
            }
          } catch {
            // ignore malformed messages
          }
        });

        ws.on("close", () => {
          broadcastStatus();
        });
      });
    } catch (err: unknown) {
      resolve({ ok: false, error: err instanceof Error ? err.message : "Unknown error" });
    }
  });
}

function stopServer(): { ok: true } {
  if (wss) {
    for (const client of wss.clients) {
      client.close();
    }
    wss.close();
    wss = null;
    broadcastStatus();
  }
  return { ok: true };
}

type RegisterSyncOptions = {
  onLiveCommand: LiveCommandHandler;
  onStatusChanged: (status: CpSyncStatus) => void;
};

export function registerSyncIpc(opts: RegisterSyncOptions) {
  liveCommandHandler = opts.onLiveCommand;
  statusCallback = opts.onStatusChanged;

  ipcMain.handle("sync:start", async (_evt, rawPort?: unknown) => {
    const port = typeof rawPort === "number" && rawPort > 0 ? rawPort : DEFAULT_PORT;
    return startServer(port);
  });

  ipcMain.handle("sync:stop", () => {
    return stopServer();
  });

  ipcMain.handle("sync:status", () => {
    return getStatus();
  });
}
