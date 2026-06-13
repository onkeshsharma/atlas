/**
 * BP3 — Service registration types (platform-agnostic).
 *
 * The service layer writes OS-specific specs (launchd plist, systemd unit,
 * Windows registry/HKCU run key) so the daemon auto-starts on login. All
 * seams are injectable for unit-testing without touching the real OS.
 *
 * ADR-0004 §5: the process auto-starts but is inert until paired; honors
 * a local `paused` flag; no inbound ports (loopback listener only during
 * `pair`).
 */

/** The config a service spec needs to run the bridge daemon at login. */
export type ServiceConfig = {
  /** Full path to the atlas-bridge binary (SEA artifact or node+ts). */
  executablePath: string;
  /** ATLAS_BRIDGE_HOME override (where config.json lives). Null = default. */
  bridgeHome: string | null;
  /** Atlas URL to bake into the environment. Null = read from config file. */
  atlasUrl: string | null;
  /** Human-readable label / service name. Default: "io.atlas.bridge". */
  label: string;
  /** Log file path. Null = OS default / stderr only. */
  logPath: string | null;
};

/** The contract each OS registrar must satisfy. */
export type ServiceRegistrar = {
  /** Write / install the service spec. Returns the spec path (for logging). */
  install(config: ServiceConfig): Promise<string>;
  /** Remove the service spec. Returns true if it was present and removed. */
  uninstall(config: ServiceConfig): Promise<boolean>;
  /** Check whether the service spec is currently installed. */
  isInstalled(config: ServiceConfig): Promise<boolean>;
};

/** Returned by install/uninstall operations. */
export type ServiceResult = {
  ok: boolean;
  specPath: string;
  message: string;
};
