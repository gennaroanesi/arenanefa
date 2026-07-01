import { defineFunction } from "@aws-amplify/backend";

// Polls ESPN's public scoreboard for finished knockout matches and writes
// results + auto-advances winners. Runs every minute but self-gates: it does
// nothing unless a match is currently in its play window (see handler).
export const resultsPoller = defineFunction({
  name: "results-poller",
  schedule: "every 1m",
  timeoutSeconds: 50, // must be < the 60s schedule rate; runs in ~1–3s anyway
  memoryMB: 256,
});
