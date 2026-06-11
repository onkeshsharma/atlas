/**
 * Cross-platform single-instance lock (v1 prior art: lib/single-instance.ts,
 * rewritten — same strategy): bind a loopback TCP port. The OS guarantees
 * one binder per (loopback, port); a crashed holder releases it
 * automatically — stale-process recovery for free, no native deps.
 * A pid file rides along for human diagnostics only.
 */
import { createServer, type Server } from "node:net";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

export class AlreadyRunningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlreadyRunningError";
  }
}

export type InstanceLock = { port: number; release: () => Promise<void> };

export async function acquireInstanceLock(args: {
  port: number;
  dataDir: string;
}): Promise<InstanceLock> {
  const pidPath = join(args.dataDir, "bridge.pid");
  await mkdir(args.dataDir, { recursive: true });

  const server: Server = createServer();
  server.on("connection", (socket) => socket.destroy());

  await new Promise<void>((resolve, reject) => {
    const onError = (err: NodeJS.ErrnoException) => {
      server.removeListener("listening", onListening);
      reject(err);
    };
    const onListening = () => {
      server.removeListener("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen({ port: args.port, host: "127.0.0.1", exclusive: true });
  }).catch(async (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE" || err.code === "EACCES") {
      let holder = "another atlas bridge process";
      try {
        const raw = (await readFile(pidPath, "utf8")).trim();
        if (/^\d+$/.test(raw)) holder = `PID ${raw}`;
      } catch {
        // pid file missing — possibly an unrelated port collision.
      }
      throw new AlreadyRunningError(
        `the Bridge is already running (lock held by ${holder} on 127.0.0.1:${args.port}). ` +
          `Stop it first, or set ATLAS_BRIDGE_LOCK_PORT if something else owns that port.`,
      );
    }
    throw err;
  });

  await writeFile(pidPath, String(process.pid), "utf8").catch(() => {
    // diagnostics only — the port IS the lock.
  });

  let released = false;
  return {
    port: args.port,
    async release() {
      if (released) return;
      released = true;
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await unlink(pidPath).catch(() => {});
    },
  };
}
