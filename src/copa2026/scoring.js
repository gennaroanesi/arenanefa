// Knockout scoring (advancer + condition).
//
// A pick is "A:<cond>" / "B:<cond>" where A = home, B = away and cond is one of
// P (penalties) / 1 / 2 / 3 (3 means "3+ goals"). The match result is recorded
// as an exact score (+ `advancer` for penalty ties); the condition is derived:
//   - draw  -> "P", side = whoever advanced
//   - else  -> side = higher score, cond = min(|diff|, 3)
// Points: 3 = right qualifier AND exact condition · 1 = right qualifier, wrong
// condition · 0 = wrong qualifier.
export const TEAM_PTS = 1;
export const EXACT_PTS = 3;

// Head-start floor: everyone (newcomers included) starts with at least this.
export const BASE_FLOOR = 30;

// Condition options shown per side. value -> label.
export const CONDS = [
  { v: "3", label: "3+" },
  { v: "2", label: "2" },
  { v: "1", label: "1" },
  { v: "P", label: "P" },
];
export const COND_LONG = {
  P: "nos pênaltis",
  1: "por 1 gol",
  2: "por 2 gols",
  3: "por 3+ gols",
};

// Derive the result pick ("A:2", "B:P", …) from a match's score + advancer.
// Returns null if the match hasn't been scored yet (or a tie has no advancer).
export function resultPick(match) {
  if (match?.homeScore == null || match?.awayScore == null) return null;
  const h = match.homeScore;
  const a = match.awayScore;
  if (h === a) {
    if (!match.advancer) return null; // tie without a recorded winner
    const side = match.advancer === match.homeTeam ? "A" : "B";
    return side + ":P";
  }
  const side = h > a ? "A" : "B";
  const diff = Math.abs(h - a);
  return side + ":" + (diff >= 3 ? "3" : String(diff));
}

/**
 * Points a knockout pick earns against a match.
 * @returns number of points, or null if the match hasn't been scored yet.
 */
export function scoreBet(bet, match) {
  if (match?.status !== "FINISHED") return null; // don't score live/scheduled
  const res = resultPick(match);
  if (res == null) return null; // not decided yet
  if (!bet?.pick) return 0;
  const [ps, pc] = bet.pick.split(":");
  const [rs, rc] = res.split(":");
  if (ps !== rs) return 0; // wrong qualifier
  return pc === rc ? EXACT_PTS : TEAM_PTS;
}
