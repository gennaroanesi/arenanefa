// Seeds the 16 pool participants into whatever backend amplify_outputs.json
// points at. Idempotent: skips a name that already exists.
//
//   node scripts/seedProfiles.mjs
//
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { readFileSync } from "fs";

const outputs = JSON.parse(readFileSync(new URL("../amplify_outputs.json", import.meta.url)));
Amplify.configure(outputs);
const client = generateClient();

const NAMES = [
  "Diego Goulart", "Bruno Viana", "Reginato", "Seiki", "Xinnh01", "João",
  "Atarão", "Anesi", "Christian", "Douglas Flores", "Sena", "Thallis",
  "Tatu", "Fábio S. B.", "Professor Mezzalira", "Rasche",
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

const existing = new Set((await listAll()).map((p) => p.displayName));
let created = 0;
for (const displayName of NAMES) {
  if (existing.has(displayName)) {
    console.log(`skip (exists): ${displayName}`);
    continue;
  }
  const res = await client.models.Profile.create({ displayName });
  if (res.errors?.length) console.error(`FAILED ${displayName}:`, res.errors.map((e) => e.message).join("; "));
  else { created++; console.log(`created: ${displayName}`); }
}
console.log(`\nDone. created=${created} total names=${NAMES.length}`);
