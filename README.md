# nextjs-indexnow

IndexNow integration for Next.js — automatically ping Bing, Yandex, Seznam, Naver, and Yep with URLs that were added or changed in the latest build.

- **Zero sitemap dependency.** Discovers URLs directly from Next's build output (`.next/prerender-manifest.json` + `.next/routes-manifest.json`), including every result of `generateStaticParams`.
- **Diff-based by default.** Persists a state file between builds and only submits URLs that are new or whose content fingerprint changed.
- **Bundler-agnostic.** Runs as a `postbuild` CLI, so it works with both webpack and Turbopack (Next 15/16).
- **Safe defaults.** Dry-run unless `INDEXNOW_SUBMIT=true`.
- **Pluggable state.** Ship your own adapter for Vercel KV, Redis, S3, etc.

## Installation

```bash
pnpm add -D nextjs-indexnow
# or: npm i -D nextjs-indexnow / yarn add -D nextjs-indexnow
```

## Quickstart

**1. Generate a key and host the key file:**

```bash
npx nextjs-indexnow init
# writes public/<key>.txt and prints the key
```

**2. Wire up `next.config.ts`:**

```ts
import { withIndexNow } from "nextjs-indexnow";

export default withIndexNow(
  {
    // your existing Next config
  },
  {
    host: "example.com",
    exclude: ["/api/**", "/admin/**"],
  },
);
```

**3. Add a `postbuild` script:**

```jsonc
// package.json
{
  "scripts": {
    "build": "next build",
    "postbuild": "nextjs-indexnow"
  }
}
```

**4. Configure env vars:**

| Var               | Required | Description                                                     |
| ----------------- | -------- | --------------------------------------------------------------- |
| `INDEXNOW_KEY`    | yes      | The key you generated above. Must match `public/<key>.txt`.      |
| `INDEXNOW_SUBMIT` | no       | Set to `"true"` on production deploys to actually POST. Default: dry-run. |

Set `INDEXNOW_SUBMIT=true` **only in production** — preview deploys should stay in dry-run to avoid flooding the IndexNow API with short-lived URLs.

## How URL discovery works

After `next build`, nextjs-indexnow reads:

- `.next/prerender-manifest.json` → concrete URLs from static pages and `generateStaticParams`.
- `.next/routes-manifest.json` → additional static routes, `basePath`, and redirects (to strip redirect sources).

It then filters:

- Internal routes (`/_error`, `/_not-found`, `.rsc` endpoints).
- Anything under `/api/*`.
- URLs matched by your `redirects()` config.
- Your `exclude` globs.

…and keeps only URLs matched by your `include` globs (default: everything).

Each URL is fingerprinted from manifest metadata plus the generated `.html` file's size and mtime. On the next build, URLs whose fingerprint hasn't changed are skipped.

## Config reference

```ts
interface IndexNowOptions {
  /** Bare hostname, e.g. "example.com". Required. */
  host: string;

  /** Env var holding the IndexNow key. Default "INDEXNOW_KEY". */
  keyEnv?: string;

  /** Public URL where the key is served. Default: https://{host}/{key}.txt. */
  keyLocation?: string;

  /** Allowlist globs. Default ["/**"]. */
  include?: string[];

  /** Blocklist globs. Default []. */
  exclude?: string[];

  /** Pluggable state storage. Default FileStateAdapter(".indexnow-state.json"). */
  state?: StateAdapter;

  /** IndexNow endpoint URL. Override for testing. */
  endpoint?: string;

  /** Env var flag that must equal "true" to POST. Default "INDEXNOW_SUBMIT". */
  submitEnv?: string;

  /** .next directory. Default ".next". */
  distDir?: string;
}
```

## Custom state adapters

Ship state somewhere persistent — Vercel KV, S3, Redis, Postgres — by implementing:

```ts
interface StateAdapter {
  read(): Promise<IndexNowState | null>;
  write(state: IndexNowState): Promise<void>;
}
```

Example (Vercel KV):

```ts
import { kv } from "@vercel/kv";
import { withIndexNow, type IndexNowState, type StateAdapter } from "nextjs-indexnow";

const kvState: StateAdapter = {
  async read() {
    return (await kv.get<IndexNowState>("indexnow:state")) ?? null;
  },
  async write(state) {
    await kv.set("indexnow:state", state);
  },
};

export default withIndexNow(
  { /* next config */ },
  { host: "example.com", state: kvState },
);
```

## CLI

```
nextjs-indexnow [run]       Read .next and submit changed URLs (run is default)
nextjs-indexnow init        Generate a key and write public/<key>.txt
nextjs-indexnow --help
```

## Standalone `indexnow.config.ts`

If you can't use `withIndexNow` (e.g. your `next.config` can't be imported from the CLI), drop an `indexnow.config.ts` next to it:

```ts
// indexnow.config.ts
import type { IndexNowOptions } from "nextjs-indexnow";

export default {
  host: "example.com",
  exclude: ["/api/**"],
} satisfies IndexNowOptions;
```

The CLI prefers this file over `next.config`.

## Why a `postbuild` CLI and not a build hook?

Next 16 defaults to Turbopack, which silently ignores `next.config`'s `webpack` customization. A webpack-hook plugin would no-op for most users with no warning. A `postbuild` script runs once after every build, regardless of bundler.

## License

MIT © Sebastian Grebe
