import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import type { IndexNowState, StateAdapter } from "../types.js";

export interface FileStateAdapterOptions {
  /** Path to the state file. Relative paths are resolved against cwd. Default ".indexnow-state.json". */
  path?: string;
  /** Working directory for relative paths. Default process.cwd(). */
  cwd?: string;
}

export class FileStateAdapter implements StateAdapter {
  private readonly absPath: string;

  constructor(opts: FileStateAdapterOptions = {}) {
    const p = opts.path ?? ".indexnow-state.json";
    const cwd = opts.cwd ?? process.cwd();
    this.absPath = isAbsolute(p) ? p : resolve(cwd, p);
  }

  async read(): Promise<IndexNowState | null> {
    try {
      const buf = await readFile(this.absPath, "utf8");
      const parsed = JSON.parse(buf) as IndexNowState;
      if (parsed.version !== 1) return null;
      return parsed;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async write(state: IndexNowState): Promise<void> {
    await mkdir(dirname(this.absPath), { recursive: true });
    await writeFile(this.absPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  }

  get location(): string {
    return this.absPath;
  }
}
