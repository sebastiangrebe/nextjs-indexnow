import { diffUrls, buildNextState } from "./diff.js";
import { discoverUrls } from "./discover-urls.js";
import { defaultKeyLocation, validateKey } from "./key.js";
import { resolveOptions } from "./resolve-options.js";
import { submitToIndexNow } from "./submit.js";
import type { IndexNowOptions } from "./types.js";

export interface RunResult {
  dryRun: boolean;
  totalUrls: number;
  submittedUrls: string[];
  skippedUnchanged: number;
  removedUrls: string[];
  status: number;
  ok: boolean;
  keyLocation: string;
}

export interface RunArgs {
  options: IndexNowOptions;
  /** Inject a fetch impl (for tests). */
  fetchImpl?: typeof fetch;
  /** Force a dry run regardless of env. */
  forceDryRun?: boolean;
  logger?: Pick<Console, "log" | "warn" | "error">;
}

export async function runIndexNow(args: RunArgs): Promise<RunResult> {
  const opts = resolveOptions(args.options);
  const log = args.logger ?? console;

  const key = process.env[opts.keyEnv];
  if (!key) {
    throw new Error(
      `IndexNow: env var ${opts.keyEnv} is not set. Generate a key with \`nextjs-indexnow init\` and configure it.`,
    );
  }
  validateKey(key);

  const keyLocation = opts.keyLocation ?? defaultKeyLocation(opts.host, key);

  const discovered = await discoverUrls({
    distDir: opts.distDir,
    cwd: opts.cwd,
    host: opts.host,
    include: opts.include,
    exclude: opts.exclude,
  });

  const previous = await opts.state.read();
  const diff = diffUrls(discovered, previous);
  const toSubmit = [...diff.added, ...diff.changed];

  const envFlag = process.env[opts.submitEnv];
  const dryRun = args.forceDryRun || envFlag !== "true";

  log.log(
    `[nextjs-indexnow] ${discovered.length} URL(s) discovered — ${diff.added.length} new, ${diff.changed.length} changed, ${diff.unchanged.length} unchanged, ${diff.removed.length} removed.`,
  );

  if (toSubmit.length === 0) {
    log.log("[nextjs-indexnow] Nothing to submit.");
    const nextState = buildNextState(opts.host, discovered, new Set(), previous);
    await opts.state.write(nextState);
    return {
      dryRun,
      totalUrls: discovered.length,
      submittedUrls: [],
      skippedUnchanged: diff.unchanged.length,
      removedUrls: diff.removed,
      status: 200,
      ok: true,
      keyLocation,
    };
  }

  if (dryRun) {
    log.log(`[nextjs-indexnow] DRY RUN — would submit ${toSubmit.length} URL(s):`);
    for (const u of toSubmit) log.log(`  ${u.url}`);
    log.log(
      `[nextjs-indexnow] Set ${opts.submitEnv}=true to actually submit to ${opts.endpoint}.`,
    );
    return {
      dryRun: true,
      totalUrls: discovered.length,
      submittedUrls: toSubmit.map((u) => u.url),
      skippedUnchanged: diff.unchanged.length,
      removedUrls: diff.removed,
      status: 0,
      ok: true,
      keyLocation,
    };
  }

  const submittedUrlList = toSubmit.map((u) => u.url);
  const result = await submitToIndexNow({
    host: opts.host,
    key,
    keyLocation,
    urlList: submittedUrlList,
    endpoint: opts.endpoint,
    fetchImpl: args.fetchImpl,
  });

  if (!result.ok) {
    log.error(
      `[nextjs-indexnow] Submission failed with HTTP ${result.status}. State file NOT updated.`,
    );
    return {
      dryRun: false,
      totalUrls: discovered.length,
      submittedUrls: [],
      skippedUnchanged: diff.unchanged.length,
      removedUrls: diff.removed,
      status: result.status,
      ok: false,
      keyLocation,
    };
  }

  const submittedSet = new Set(submittedUrlList);
  const nextState = buildNextState(opts.host, discovered, submittedSet, previous);
  await opts.state.write(nextState);

  log.log(
    `[nextjs-indexnow] Submitted ${result.submittedCount} URL(s) in ${result.batches} batch(es). HTTP ${result.status}.`,
  );

  return {
    dryRun: false,
    totalUrls: discovered.length,
    submittedUrls: submittedUrlList,
    skippedUnchanged: diff.unchanged.length,
    removedUrls: diff.removed,
    status: result.status,
    ok: true,
    keyLocation,
  };
}
