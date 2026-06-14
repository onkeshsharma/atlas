/**
 * BP1 — `atlas-bridge pair [--name <machine>] [--url <atlas>]`
 *
 * Implements the ADR-0004 §4 loopback client half VERBATIM:
 *
 *   1. Pick a free 127.0.0.1 port P; generate a `state` nonce.
 *   2. Start a one-shot HTTP listener at http://127.0.0.1:P.
 *   3. Open the browser to:
 *        <url>/settings/bridges/pair?name=<machine>&cb=http://127.0.0.1:P/callback&state=<nonce>
 *   4. Await the callback: GET /callback?token=<once>&state=<nonce>&name=<machine>
 *   5. Validate state (mismatch → reject + exit 1).
 *   6. Write token to ~/.atlas-bridge/config.json (chmod 600).
 *   7. Serve "you can close this tab" page on the same connection.
 *   8. Shut down listener and exit 0.
 *
 * Token is NEVER printed, NEVER logged (ADR-0004 §4 hard rule).
 *
 * Headless fallback: when no browser can be opened, print manual instructions
 * pointing at the existing paste-token flow (M10 pair-bridge.mjs). Do NOT
 * reimplement that flow.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { mergeConfigFile, readConfigFile } from "../config-file.ts";

type PairOpts = {
  name?: string;
  url?: string;
  env?: NodeJS.ProcessEnv;
  /** injectable open-browser fn — returns true if browser was launched. */
  openBrowser?: (url: string) => Promise<boolean>;
  /** injectable: pick a free loopback port. */
  pickPort?: () => Promise<number>;
  /** if true, suppress console output (tests). */
  silent?: boolean;
};

/** ADR-0004 §4 contract: the exact URL shape the CLI sends to the browser. */
export function buildPairUrl(opts: {
  atlasUrl: string;
  machineName: string;
  callbackBase: string;
  state: string;
}): string {
  const u = new URL(`${opts.atlasUrl}/settings/bridges/pair`);
  u.searchParams.set("name", opts.machineName);
  u.searchParams.set("cb", `${opts.callbackBase}/callback`);
  u.searchParams.set("state", opts.state);
  return u.toString();
}

/** Pick a free 127.0.0.1 port by binding to :0 and releasing. */
export function pickFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen({ port: 0, host: "127.0.0.1" }, () => {
      const addr = srv.address();
      if (!addr || typeof addr === "string") {
        srv.close(() => reject(new Error("could not pick free port")));
        return;
      }
      const port = addr.port;
      srv.close(() => resolve(port));
    });
    srv.once("error", reject);
  });
}

/** Attempt to open a URL in the default browser cross-platform. */
export async function openBrowserDefault(url: string): Promise<boolean> {
  const { exec } = await import("node:child_process");
  return new Promise((resolve) => {
    const platform = process.platform;
    let cmd: string;
    if (platform === "win32") {
      cmd = `start "" "${url}"`;
    } else if (platform === "darwin") {
      cmd = `open "${url}"`;
    } else {
      cmd = `xdg-open "${url}"`;
    }
    exec(cmd, { windowsHide: true }, (err) => resolve(!err));
  });
}

/**
 * Core pair logic — separated for testability.
 * Returns the machine name that was written to config.
 */
export async function runPair(opts: PairOpts = {}): Promise<{ name: string }> {
  const env = opts.env ?? process.env;
  const silent = opts.silent ?? false;
  const log = silent ? () => {} : console.log.bind(console);
  const errLog = silent ? () => {} : console.error.bind(console);

  // Resolve atlasUrl: flag > env > config file > error
  let atlasUrl = opts.url ?? env.ATLAS_URL?.replace(/\/$/, "");
  if (!atlasUrl) {
    const file = await readConfigFile(env);
    atlasUrl = file?.url;
  }
  if (!atlasUrl) {
    errLog("No Atlas URL. Pass --url <atlas-url> or set ATLAS_URL.");
    process.exit(1);
  }

  // Resolve machine name: flag > config file > hostname
  let machineName = opts.name;
  if (!machineName) {
    const file = await readConfigFile(env);
    machineName = file?.name;
  }
  if (!machineName) {
    const { hostname } = await import("node:os");
    machineName = hostname();
  }

  // 1. Pick a free port + generate state nonce
  const port = await (opts.pickPort ? opts.pickPort() : pickFreePort());
  const callbackBase = `http://127.0.0.1:${port}`;
  const state = randomBytes(16).toString("hex");

  // Build the pair URL (will be opened in the browser after listener starts)
  const pairUrl = buildPairUrl({ atlasUrl, machineName, callbackBase, state });

  // 2. Start one-shot callback server BEFORE opening the browser
  //    (the browser may redirect immediately; the listener must be ready)
  let resolveToken!: (token: string) => void;
  let rejectToken!: (err: Error) => void;
  const tokenPromise = new Promise<string>((res, rej) => {
    resolveToken = res;
    rejectToken = rej;
  });
  // Suppress "unhandled rejection" warnings — the promise IS consumed by
  // Promise.race below; the rejection fires in a server callback before
  // the race branch catches it.
  tokenPromise.catch(() => {});

  const server: Server = createServer(
    (req: IncomingMessage, res: ServerResponse): void => {
      const url = new URL(req.url ?? "/", callbackBase);

      if (url.pathname !== "/callback") {
        res.writeHead(404).end("Not found");
        return;
      }

      const receivedState = url.searchParams.get("state");
      const token = url.searchParams.get("token");
      const receivedName = url.searchParams.get("name");

      // 5. Validate state
      if (receivedState !== state) {
        res.writeHead(400, { "Content-Type": "text/html" }).end(
          `<html><body><p>Pairing failed: state mismatch. Please try again.</p></body></html>`,
        );
        rejectToken(new Error("state mismatch — possible CSRF; pairing rejected"));
        return;
      }

      if (!token) {
        res.writeHead(400, { "Content-Type": "text/html" }).end(
          `<html><body><p>Pairing failed: no token received.</p></body></html>`,
        );
        rejectToken(new Error("callback did not include a token"));
        return;
      }

      // 7. Serve "you can close this tab" page
      res.writeHead(200, { "Content-Type": "text/html" }).end(
        `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Atlas Bridge paired</title>
<style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0f0f0f;color:#e5e5e5}
.card{max-width:440px;text-align:center;padding:2rem}
h1{font-size:1.25rem;font-weight:600;margin:0 0 .5rem}
p{font-size:.9rem;color:#888;margin:0}</style></head>
<body><div class="card">
<h1>Bridge paired.</h1>
<p>"${receivedName ?? machineName}" is now connected to Atlas.<br>You can close this tab.</p>
</div></body></html>`,
      );

      // Token delivered — resolve (never log it)
      resolveToken(token);
    },
  );

  server.listen({ port, host: "127.0.0.1" });
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  // 3. Try to open the browser (after listener is ready)
  const doOpen = opts.openBrowser ?? openBrowserDefault;
  const opened = await doOpen(pairUrl);

  if (!opened) {
    // Headless fallback — guide to the manual paste-token path (M10).
    server.closeAllConnections?.();
    await new Promise<void>((r) => server.close(() => r()));
    errLog("");
    errLog("Could not open a browser automatically (headless environment).");
    errLog("");
    errLog("To pair manually:");
    errLog(`  1. Open Atlas in your browser and go to Settings → Bridges.`);
    errLog(`  2. Click "Pair a new bridge" and run the pair command there.`);
    errLog(`  3. Copy the token shown and run:`);
    errLog(`       ATLAS_URL=${atlasUrl} ATLAS_BRIDGE_TOKEN=<token> atlas-bridge start`);
    errLog("");
    errLog(`Or open this URL manually and approve pairing:`);
    errLog(`  ${pairUrl}`);
    process.exit(1);
  }

  log(`Pairing "${machineName}" with Atlas at ${atlasUrl} …`);
  log("Waiting for approval in the browser …");

  // 4. Wait for token (timeout after 5 minutes)
  const timeoutMs = 5 * 60 * 1000;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  let tokenOrTimeout: string;
  try {
    tokenOrTimeout = await Promise.race([
      tokenPromise,
      new Promise<never>((_, rej) => {
        timeoutHandle = setTimeout(
          () => rej(new Error("timed out waiting for Atlas to redirect back (5 min)")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    // Drain current connections; allow the browser to receive the response
    setTimeout(() => server.closeAllConnections?.(), 200);
    setTimeout(() => server.close(), 300);
  }

  // 6. Write to config (token never logged)
  await mergeConfigFile({ url: atlasUrl, token: tokenOrTimeout, name: machineName }, env);

  log(`Paired. Bridge "${machineName}" is ready.`);
  log(`Run: atlas-bridge start`);

  return { name: machineName };
}
