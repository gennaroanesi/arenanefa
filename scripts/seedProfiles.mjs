// Seeds / updates the 16 pool participants with their group-stage base score
// (stored in startingPoints). Idempotent: creates missing, updates existing.
// Base is floored at 30 (everyone starts with at least 30).
//
//   node scripts/seedProfiles.mjs
//
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { readFileSync } from "fs";

const outputs = JSON.parse(readFileSync(new URL("../amplify_outputs.json", import.meta.url)));
Amplify.configure(outputs);
const client = generateClient();

const FLOOR = 30;
// [displayName, group-stage total]
const SEED = [
  ["Thallis", 46], ["Xinnh01", 43], ["Atarão", 42], ["Sena", 41],
  ["Christian", 40], ["Douglas Flores", 40], ["Tatu", 40], ["Fábio S. B.", 40],
  ["Reginato", 39], ["Bruno Viana", 38], ["Professor Mezzalira", 38], ["Rasche", 38],
  ["Diego Goulart", 36], ["João", 36], ["Seiki", 29], ["Anesi", 28],
];

async function listAll() {
  const out = [];
  let nextToken = null;
  do {
    const res = await client.models.Profile.list({ nextToken, limit: 1000 });
    if (res.errors?.length) throw new Error(res.errors.map((e) => e.message).join("; "));
    out.push(...res.data);
    nextToken = res.nextToken;
  } while (nextToken);
  return out;
}

const bySlug = new Map((await listAll()).map((p) => [p.displayName, p]));
let created = 0;
let updated = 0;
for (const [displayName, raw] of SEED) {
  const startingPoints = Math.max(FLOOR, raw);
  const found = bySlug.get(displayName);
  const res = found
    ? await client.models.Profile.update({ id: found.id, startingPoints })
    : await client.models.Profile.create({ displayName, startingPoints });
  if (res.errors?.length) {
    console.error(`FAILED ${displayName}:`, res.errors.map((e) => e.message).join("; "));
  } else {
    if (found) updated++;
    else created++;
    console.log(`${found ? "updated" : "created"}: ${displayName} → ${startingPoints} pts`);
  }
}
console.log(`\nDone. created=${created} updated=${updated}`);
