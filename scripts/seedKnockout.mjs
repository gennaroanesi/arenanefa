// Seeds the 2026 World Cup knockout bracket (matches 73–104) into whatever
// Amplify backend amplify_outputs.json points at (sandbox by default).
//
// Upsert by `slot`: creates missing matches, updates teams/kickoff/stage on
// existing ones. So re-running after group results finalize backfills the TBD
// teams — just edit MATCHES below and run again. Teams are FIFA 3-letter codes
// (the UI maps code → PT-BR name + flag via src/copa2026/teams.js).
//
//   node scripts/seedKnockout.mjs
//
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { readFileSync } from "fs";

const outputs = JSON.parse(readFileSync(new URL("../amplify_outputs.json", import.meta.url)));
Amplify.configure(outputs);
const client = generateClient();

// slot, stage, kickoff (UTC ISO), home, away. null team = not yet determined.
// Teams are FIFA 3-letter codes (see src/copa2026/teams.js).
const MATCHES = [
  // ── Round of 32 (16-avos) ────────────────────────────────────
  [73, "R32", "2026-06-28T19:00:00Z", "RSA", "CAN"],
  [74, "R32", "2026-06-29T20:30:00Z", "GER", "PAR"],
  [75, "R32", "2026-06-30T01:00:00Z", "NED", "MAR"],
  [76, "R32", "2026-06-29T17:00:00Z", "BRA", "JPN"],
  [77, "R32", "2026-06-30T21:00:00Z", "FRA", "SWE"],
  [78, "R32", "2026-06-30T17:00:00Z", "CIV", "NOR"],
  [79, "R32", "2026-07-01T01:00:00Z", "MEX", "ECU"],
  [80, "R32", "2026-07-01T16:00:00Z", "ENG", "COD"],
  [81, "R32", "2026-07-02T00:00:00Z", "USA", "BIH"],
  [82, "R32", "2026-07-01T20:00:00Z", "BEL", "SEN"],
  [83, "R32", "2026-07-02T23:00:00Z", "POR", "CRO"],
  [84, "R32", "2026-07-02T19:00:00Z", "ESP", "AUT"],
  [85, "R32", "2026-07-03T03:00:00Z", "SUI", "ALG"],
  [86, "R32", "2026-07-03T22:00:00Z", "ARG", "CPV"],
  [87, "R32", "2026-07-04T01:30:00Z", "COL", "GHA"],
  [88, "R32", "2026-07-03T18:00:00Z", "AUS", "EGY"],
  // ── Round of 16 (teams TBD; fed by R32 winners) ──────────────
  [89, "R16", "2026-07-04T21:00:00Z", null, null],
  [90, "R16", "2026-07-04T17:00:00Z", null, null],
  [91, "R16", "2026-07-05T20:00:00Z", null, null],
  [92, "R16", "2026-07-06T00:00:00Z", null, null],
  [93, "R16", "2026-07-06T19:00:00Z", null, null],
  [94, "R16", "2026-07-07T00:00:00Z", null, null],
  [95, "R16", "2026-07-07T16:00:00Z", null, null],
  [96, "R16", "2026-07-07T20:00:00Z", null, null],
  // ── Quarter-finals ───────────────────────────────────────────
  [97, "QF", "2026-07-09T20:00:00Z", null, null],
  [98, "QF", "2026-07-10T19:00:00Z", null, null],
  [99, "QF", "2026-07-11T21:00:00Z", null, null],
  [100, "QF", "2026-07-12T01:00:00Z", null, null],
  // ── Semi-finals ──────────────────────────────────────────────
  [101, "SF", "2026-07-14T19:00:00Z", null, null],
  [102, "SF", "2026-07-15T19:00:00Z", null, null],
  // ── Third place & Final ──────────────────────────────────────
  [103, "THIRD_PLACE", "2026-07-18T21:00:00Z", null, null],
  [104, "FINAL", "2026-07-19T19:00:00Z", null, null],
];

async function listAllMatches() {
  const out = [];
  let nextToken = null;
  do {
    const res = await client.models.Match.list({ nextToken, limit: 1000 });
    if (res.errors?.length) throw new Error(res.errors.map((e) => e.message).join("; "));
    out.push(...res.data);
    nextToken = res.nextToken;
  } while (nextToken);
  return out;
}

const bySlot = new Map((await listAllMatches()).map((m) => [m.slot, m]));
let created = 0;
let updated = 0;

for (const [slot, stage, kickoff, homeTeam, awayTeam] of MATCHES) {
  const fields = { stage, slot, kickoff, bettingDeadline: kickoff, homeTeam, awayTeam };
  const found = bySlot.get(slot);
  const res = found
    ? await client.models.Match.update({ id: found.id, ...fields })
    : await client.models.Match.create({ ...fields, status: "SCHEDULED" });
  if (res.errors?.length) {
    console.error(`slot ${slot} FAILED:`, res.errors.map((e) => e.message).join("; "));
  } else {
    if (found) updated++;
    else created++;
    console.log(`slot ${slot} ${stage} ${homeTeam ?? "—"} vs ${awayTeam ?? "—"}`);
  }
}

console.log(`\nDone. created=${created} updated=${updated}`);
