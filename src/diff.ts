import type { DiffResult, DiscoveredUrl, IndexNowState } from "./types.js";

export function diffUrls(
  discovered: DiscoveredUrl[],
  previous: IndexNowState | null,
): DiffResult {
  const added: DiscoveredUrl[] = [];
  const changed: DiscoveredUrl[] = [];
  const unchanged: DiscoveredUrl[] = [];
  const seen = new Set<string>();

  for (const d of discovered) {
    seen.add(d.url);
    const prior = previous?.urls[d.url];
    if (!prior) {
      added.push(d);
    } else if (prior.hash !== d.hash) {
      changed.push(d);
    } else {
      unchanged.push(d);
    }
  }

  const removed: string[] = [];
  if (previous) {
    for (const url of Object.keys(previous.urls)) {
      if (!seen.has(url)) removed.push(url);
    }
  }

  return { added, changed, unchanged, removed };
}

export function buildNextState(
  host: string,
  discovered: DiscoveredUrl[],
  submittedUrls: Set<string>,
  previous: IndexNowState | null,
  now: Date = new Date(),
): IndexNowState {
  const urls: IndexNowState["urls"] = {};
  const nowIso = now.toISOString();
  for (const d of discovered) {
    const prior = previous?.urls[d.url];
    const submitted = submittedUrls.has(d.url);
    urls[d.url] = {
      hash: d.hash,
      submittedAt: submitted ? nowIso : (prior?.submittedAt ?? nowIso),
    };
  }
  return {
    version: 1,
    host,
    lastSubmittedAt: submittedUrls.size > 0 ? nowIso : (previous?.lastSubmittedAt ?? null),
    urls,
  };
}
