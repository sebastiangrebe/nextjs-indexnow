import { join } from "node:path";

export const SIDECAR_DIR = join("node_modules", ".cache", "nextjs-indexnow");
export const SIDECAR_FILENAME = "options.json";

export function sidecarPath(cwd: string): string {
  return join(cwd, SIDECAR_DIR, SIDECAR_FILENAME);
}
