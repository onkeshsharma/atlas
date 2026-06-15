/**
 * Reversible secret-at-rest (ADR-0007 §3). The cloud-tier Anthropic key must be
 * *recoverable* to call the API (unlike bridge/API tokens, which are one-way
 * hashed), so it is stored AES-256-GCM-encrypted with a key-encryption-key that
 * lives only in the env (`ATLAS_SECRET_KEY`). Ciphertext format:
 *   v1:<iv b64>.<authTag b64>.<ciphertext b64>
 *
 * No KEK configured → encryption is unavailable: `encryptSecret` throws (so we
 * never store a "secret" in plaintext) and `decryptSecret` returns null (so the
 * caller falls back to the env var).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "v1:";

function kek(): Buffer | null {
  const raw = process.env.ATLAS_SECRET_KEY;
  if (!raw) return null;
  // derive a fixed 32-byte key from whatever the env provides.
  return createHash("sha256").update(raw, "utf8").digest();
}

/** true when a KEK is configured (so the in-app key field can be offered). */
export function secretsAvailable(): boolean {
  return kek() !== null;
}

export function encryptSecret(plaintext: string): string {
  const key = kek();
  if (!key) throw new Error("ATLAS_SECRET_KEY not set — cannot store a secret at rest");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}.${tag.toString("base64")}.${ct.toString("base64")}`;
}

export function decryptSecret(stored: string | null | undefined): string | null {
  const key = kek();
  if (!key || !stored || !stored.startsWith(PREFIX)) return null;
  try {
    const [ivB64, tagB64, ctB64] = stored.slice(PREFIX.length).split(".");
    if (!ivB64 || !tagB64 || !ctB64) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null; // wrong KEK / tampered / corrupt — fail closed
  }
}
