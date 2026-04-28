import { app } from "electron";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { BrowserWindow } from "electron";

export type ConnectionState = "ONLINE" | "OFFLINE" | "SYNCING" | "SYNC_ERROR";

const SYNC_FILE_NAME = "sync.json";

function getSyncFilePath() {
  return join(app.getPath("userData"), SYNC_FILE_NAME);
}

function readSyncFile(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(getSyncFilePath(), "utf-8")) as Record<string, string>;
  } catch {
    return {};
  }
}

export function getLastPullTimestamp(): string {
  return readSyncFile().lastPullAt ?? new Date(0).toISOString();
}

export function saveLastPullTimestamp(iso: string): void {
  const data = readSyncFile();
  writeFileSync(getSyncFilePath(), JSON.stringify({ ...data, lastPullAt: iso }));
}

export function saveLastPushTimestamp(iso: string): void {
  const data = readSyncFile();
  writeFileSync(getSyncFilePath(), JSON.stringify({ ...data, lastPushAt: iso }));
}

export function broadcastToWindows(channel: string, payload: unknown): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    try {
      win.webContents.send(channel, payload);
    } catch {
      // window may have been destroyed
    }
  });
}
