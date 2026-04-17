export interface UrlState {
  hash: string;
  submittedAt: string;
}

export interface IndexNowState {
  version: 1;
  host: string;
  lastSubmittedAt: string | null;
  urls: Record<string, UrlState>;
}

export interface StateAdapter {
  read(): Promise<IndexNowState | null>;
  write(state: IndexNowState): Promise<void>;
}

export interface IndexNowOptions {
  /** Bare host without protocol, e.g. "tandemu.dev". Required. */
  host: string;
  /** Env var name holding the IndexNow key. Default "INDEXNOW_KEY". */
  keyEnv?: string;
  /**
   * Explicit public URL where the key file is served.
   * Default: `https://{host}/{key}.txt`.
   */
  keyLocation?: string;
  /** Allowlist globs applied after internal filters. Default ["/**"]. */
  include?: string[];
  /** Blocklist globs applied after include. Default []. */
  exclude?: string[];
  /** Pluggable state adapter. Default: FileStateAdapter(".indexnow-state.json"). */
  state?: StateAdapter;
  /** IndexNow endpoint URL. Override for testing. */
  endpoint?: string;
  /** Env var name that must equal "true" for the CLI to actually POST. Default "INDEXNOW_SUBMIT". */
  submitEnv?: string;
  /** Override the .next directory. Default: ".next". */
  distDir?: string;
  /** Working directory (where .next and state file live). Default: process.cwd(). */
  cwd?: string;
}

export interface ResolvedOptions extends Required<Omit<IndexNowOptions, "state" | "keyLocation">> {
  state: StateAdapter;
  keyLocation: string | null;
}

export interface DiscoveredUrl {
  url: string;
  /** Stable fingerprint for diffing. */
  hash: string;
}

export interface DiffResult {
  added: DiscoveredUrl[];
  changed: DiscoveredUrl[];
  unchanged: DiscoveredUrl[];
  removed: string[];
}

export interface SubmitResult {
  ok: boolean;
  status: number;
  submittedCount: number;
  batches: number;
}
