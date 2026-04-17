export { withIndexNow } from "./with-index-now.js";
export { submitToIndexNow } from "./submit.js";
export { discoverUrls } from "./discover-urls.js";
export { diffUrls, buildNextState } from "./diff.js";
export { runIndexNow } from "./run.js";
export { generateKey, validateKey, defaultKeyLocation } from "./key.js";
export { FileStateAdapter } from "./state/file.js";
export type {
  DiffResult,
  DiscoveredUrl,
  IndexNowOptions,
  IndexNowState,
  ResolvedOptions,
  StateAdapter,
  SubmitResult,
  UrlState,
} from "./types.js";
