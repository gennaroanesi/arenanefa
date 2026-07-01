import { defineBackend } from "@aws-amplify/backend";
import { data } from "./data/resource";
import { resultsPoller } from "./functions/results-poller/resource";

/**
 * Copa 2026 backend: data + a scheduled Lambda that syncs finished knockout
 * results from ESPN's public scoreboard (self-gated to match windows).
 */
defineBackend({
  data,
  resultsPoller,
});
