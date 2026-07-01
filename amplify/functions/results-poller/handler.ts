import type { Handler } from "aws-lambda";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/results-poller";
import type { Schema } from "../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

// ── Bracket topology (kept in sync with src/copa2026/bracket.js) ──────────
const FEEDS: Record<number, [number, number]> = {
  89: [74, 77], 90: [73, 75], 91: [76, 78], 92: [79, 80],
  93: [83, 84], 94: [81, 82], 95: [86, 88], 96: [85, 87],
  97: [89, 90], 98: [93, 94], 99: [91, 92], 100: [95, 96],
  101: [97, 98], 102: [99, 100], 103: [101, 102], 104: [101, 102],
};
const THIRD = 103;

type M = Schema["Match"]["type"];

function winnerOf(m?: M): string | null {
  if (!m || m.status !== "FINISHED" || m.homeScore == null || m.awayScore == null) return null;
  if (m.homeScore > m.awayScore) return m.homeTeam ?? null;
  if (m.awayScore > m.homeScore) return m.awayTeam ?? null;
  return m.advancer ?? null;
}
function loserOf(m?: M): string | null {
  const w = winnerOf(m);
  if (!w) return null;
  return w === m!.homeTeam ? m!.awayTeam ?? null : m!.homeTeam ?? null;
}

async function listMatches(): Promise<M[]> {
  const out: M[] = [];
  let nextToken: string | null | undefined = null;
  do {
    const page = (await client.models.Match.list({ nextToken, limit: 1000 })) as {
      data: M[];
      nextToken?: string | null;
    };
    out.push(...page.data);
    nextToken = page.nextToken;
  } while (nextToken);
  return out;
}

function espnDates(now: Date): string[] {
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const day = 86_400_000;
  return [new Date(now.getTime() - day), now, new Date(now.getTime() + day)].map(fmt);
}

const WINDOW_BEFORE = 5 * 60 * 1000; // start polling 5 min before kickoff
const WINDOW_AFTER = 4 * 60 * 60 * 1000; // keep polling up to 4h after (ET + pens + buffer)

export const handler: Handler = async () => {
  const matches = await listMatches();
  const now = Date.now();

  // Self-gate: only do work if a match is in its play window.
  const active = matches.some((m) => {
    if (m.status === "FINISHED" || !m.kickoff) return false;
    const k = new Date(m.kickoff).getTime();
    return now >= k - WINDOW_BEFORE && now <= k + WINDOW_AFTER;
  });
  if (!active) {
    console.log("no active match window — skipping");
    return;
  }

  // Fetch ESPN scoreboard for yesterday/today/tomorrow (UTC) to cover kickoffs.
  const events: any[] = [];
  for (const d of espnDates(new Date(now))) {
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${d}`,
      );
      if (res.ok) events.push(...((await res.json()).events ?? []));
    } catch (e) {
      console.error("ESPN fetch failed", d, e);
    }
  }

  const bySlot: Record<number, M> = Object.fromEntries(matches.map((m) => [m.slot as number, { ...m }]));
  let results = 0;

  for (const ev of events) {
    const state = ev?.status?.type?.state; // "pre" | "in" | "post"
    if (state !== "in" && state !== "post") continue; // live or finished
    const comps = ev.competitions?.[0]?.competitors ?? [];
    if (comps.length !== 2) continue;
    const teams = comps.map((c: any) => ({
      code: c.team?.abbreviation as string,
      score: Number(c.score),
      winner: !!c.winner,
      shootout: c.shootoutScore,
    }));
    if (teams.some((t: any) => !t.code || Number.isNaN(t.score))) continue;

    const codes = new Set(teams.map((t: any) => t.code));
    const match = matches.find(
      (m) => m.homeTeam && m.awayTeam && codes.has(m.homeTeam) && codes.has(m.awayTeam),
    );
    if (!match) continue;

    const homeT = teams.find((t: any) => t.code === match.homeTeam);
    const awayT = teams.find((t: any) => t.code === match.awayTeam);
    if (!homeT || !awayT) continue;

    const final = state === "post";
    const status = final ? "FINISHED" : "LIVE";
    const pens = final && (homeT.shootout != null || awayT.shootout != null);
    const advancer = pens ? (homeT.winner ? match.homeTeam : match.awayTeam) : null;

    // Idempotent: skip if already recorded identically.
    if (
      match.status === status &&
      match.homeScore === homeT.score &&
      match.awayScore === awayT.score &&
      (match.advancer ?? null) === (advancer ?? null)
    ) {
      continue;
    }
    await client.models.Match.update({
      id: match.id,
      homeScore: homeT.score,
      awayScore: awayT.score,
      advancer,
      status,
    });
    bySlot[match.slot as number] = {
      ...bySlot[match.slot as number],
      homeScore: homeT.score,
      awayScore: awayT.score,
      advancer,
      status,
    };
    results++;
    console.log(
      `${status} M${match.slot}: ${match.homeTeam} ${homeT.score}-${awayT.score} ${match.awayTeam}` +
        (pens ? ` (pênaltis → ${advancer})` : ""),
    );
  }

  // Auto-advance winners (and third-place losers) into fed matches.
  let advanced = 0;
  for (const [fedStr, [a, b]] of Object.entries(FEEDS)) {
    const fed = Number(fedStr);
    const m = matches.find((x) => x.slot === fed);
    if (!m) continue;
    const home = fed === THIRD ? loserOf(bySlot[a]) : winnerOf(bySlot[a]);
    const away = fed === THIRD ? loserOf(bySlot[b]) : winnerOf(bySlot[b]);
    const upd: any = { id: m.id };
    if (home && home !== m.homeTeam) upd.homeTeam = home;
    if (away && away !== m.awayTeam) upd.awayTeam = away;
    if (Object.keys(upd).length > 1) {
      await client.models.Match.update(upd);
      advanced++;
    }
  }

  console.log(`done — results=${results} advanced=${advanced}`);
};
