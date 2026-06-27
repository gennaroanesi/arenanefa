import { client } from "../amplifyClient";

// Page through every record of a model (Amplify lists max ~100 at a time).
async function listAll(model, options = {}) {
  const out = [];
  let nextToken = null;
  do {
    const res = await model.list({ ...options, nextToken, limit: 1000 });
    if (res.errors?.length) throw new Error(res.errors.map((e) => e.message).join("; "));
    out.push(...res.data);
    nextToken = res.nextToken;
  } while (nextToken);
  return out;
}

export function loadPool() {
  return Promise.all([
    listAll(client.models.Profile),
    listAll(client.models.Match),
    listAll(client.models.Bet),
  ]).then(([profiles, matches, bets]) => ({ profiles, matches, bets }));
}

export async function upsertBet({ id, profileId, matchId, predHome, predAway }) {
  const input = { profileId, matchId, predHome, predAway };
  const res = id
    ? await client.models.Bet.update({ id, predHome, predAway })
    : await client.models.Bet.create(input);
  if (res.errors?.length) throw new Error(res.errors.map((e) => e.message).join("; "));
  return res.data;
}
