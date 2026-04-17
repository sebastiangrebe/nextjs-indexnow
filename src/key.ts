import { randomBytes } from "node:crypto";

const KEY_RE = /^[a-f0-9]{8,128}$/i;

/** Generate a new IndexNow key (32 hex chars). */
export function generateKey(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Validate an IndexNow key per spec: 8–128 chars, hex only.
 * Throws with an actionable message if invalid.
 */
export function validateKey(key: string): void {
  if (!key) {
    throw new Error("IndexNow key is empty. Set the INDEXNOW_KEY env var.");
  }
  if (!KEY_RE.test(key)) {
    throw new Error(
      `IndexNow key must be 8–128 hex characters (a–f, 0–9). Got ${key.length} chars.`,
    );
  }
}

export function defaultKeyLocation(host: string, key: string): string {
  return `https://${host}/${key}.txt`;
}
