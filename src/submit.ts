import type { SubmitResult } from "./types.js";

const BATCH_SIZE = 10_000;
const DEFAULT_ENDPOINT = "https://api.indexnow.org/indexnow";

export interface SubmitArgs {
  host: string;
  key: string;
  keyLocation: string | null;
  urlList: string[];
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Submit URLs to the IndexNow endpoint. Batches at 10,000 per request.
 * Returns the aggregate result — `ok` is true only if every batch succeeded.
 */
export async function submitToIndexNow(args: SubmitArgs): Promise<SubmitResult> {
  const {
    host,
    key,
    keyLocation,
    urlList,
    endpoint = DEFAULT_ENDPOINT,
    fetchImpl = fetch,
  } = args;

  if (urlList.length === 0) {
    return { ok: true, status: 200, submittedCount: 0, batches: 0 };
  }

  let overallOk = true;
  let lastStatus = 0;
  let batches = 0;
  for (let i = 0; i < urlList.length; i += BATCH_SIZE) {
    const chunk = urlList.slice(i, i + BATCH_SIZE);
    const body: Record<string, unknown> = { host, key, urlList: chunk };
    if (keyLocation) body.keyLocation = keyLocation;

    const res = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    lastStatus = res.status;
    batches += 1;
    // Per IndexNow spec: 200 OK, 202 Accepted are success.
    if (res.status !== 200 && res.status !== 202) {
      overallOk = false;
      break;
    }
  }

  return { ok: overallOk, status: lastStatus, submittedCount: urlList.length, batches };
}
