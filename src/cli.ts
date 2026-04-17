#!/usr/bin/env node
import { writeFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { generateKey } from "./key.js";
import { loadIndexNowConfig } from "./load-config.js";
import { runIndexNow } from "./run.js";

async function main(): Promise<void> {
  const [, , cmd = "run", ...rest] = process.argv;
  const cwd = process.cwd();

  if (cmd === "init") {
    await initCommand(cwd, rest);
    return;
  }

  if (cmd === "run" || cmd === undefined) {
    const options = await loadIndexNowConfig(cwd);
    if (!options) {
      console.error(
        "[nextjs-indexnow] No config found. Either wrap your next.config with `withIndexNow` and run this after `next build`, or create `indexnow.config.mjs`.",
      );
      process.exit(1);
    }
    const result = await runIndexNow({ options: { ...options, cwd } });
    if (!result.ok) process.exit(1);
    return;
  }

  if (cmd === "--help" || cmd === "-h" || cmd === "help") {
    printHelp();
    return;
  }

  console.error(`[nextjs-indexnow] Unknown command: ${cmd}`);
  printHelp();
  process.exit(1);
}

async function initCommand(cwd: string, args: string[]): Promise<void> {
  const existingKey = process.env.INDEXNOW_KEY;
  const key = existingKey || generateKey();
  const publicDir = join(cwd, "public");
  try {
    await access(publicDir);
  } catch {
    await mkdir(publicDir, { recursive: true });
  }
  const keyFile = join(publicDir, `${key}.txt`);
  const force = args.includes("--force");
  try {
    await access(keyFile);
    if (!force) {
      console.log(`[nextjs-indexnow] Key file already exists at ${keyFile}. Skipping.`);
      console.log(`[nextjs-indexnow] Use --force to overwrite.`);
      return;
    }
  } catch {
    // doesn't exist — good
  }
  await writeFile(keyFile, key, "utf8");
  console.log(`[nextjs-indexnow] Wrote ${keyFile}`);
  console.log("");
  console.log("Next steps:");
  if (!existingKey) {
    console.log(`  1. Add this env var to your deployment (e.g. Vercel):`);
    console.log(`       INDEXNOW_KEY=${key}`);
  }
  console.log(`  2. Wrap your next.config with \`withIndexNow(config, { host: "example.com" })\`.`);
  console.log(`  3. Add \`"postbuild": "nextjs-indexnow"\` to your package.json scripts.`);
  console.log(`  4. Set INDEXNOW_SUBMIT=true in production to actually submit.`);
}

function printHelp(): void {
  console.log(`nextjs-indexnow — submit URLs to IndexNow after \`next build\`

Usage:
  nextjs-indexnow [run]       Read next build output and submit changed URLs
  nextjs-indexnow init        Generate a key and write the key file to public/
  nextjs-indexnow --help      Show this message

Env vars:
  INDEXNOW_KEY                Hex key (8–128 chars). Required.
  INDEXNOW_SUBMIT             Must be "true" to actually POST. Otherwise dry-run.
`);
}

main().catch((err) => {
  console.error(`[nextjs-indexnow] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
