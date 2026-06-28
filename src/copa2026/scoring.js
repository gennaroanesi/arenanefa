// Per-stage scoring for the Copa 2026 pool.
//
// Group stage:  1 pt for the correct result (win/draw/loss), else 0.
// Knockout:     3 pts for the correct goal difference (e.g. bet 3-1, actual
//               2-0 → both +2 → 3 pts), else 1 pt for the correct result, else 0.
export const SCORING = {
  group: { result: 1 },
  knockout: { gd: 3, result: 1 },
};

// Head-start for newcomers who join for the knockouts (missed the group stage).
export const NEWCOMER_BONUS = 30;

const sign = (a, b) => (a > b ? 1 : a < b ? -1 : 0);

const isGroup = (match) => match?.stage === "GROUP";

/**
 * Points a bet earns against a match.
 * @returns number of points, or null if the match hasn't been scored yet.
 */
export function scoreBet(bet, match) {
  if (match?.homeScore == null || match?.awayScore == null) return null; // not played
  if (bet?.predHome == null || bet?.predAway == null) return 0;

  const outcomeHit = sign(bet.predHome, bet.predAway) === sign(match.homeScore, match.awayScore);

  if (isGroup(match)) {
    return outcomeHit ? SCORING.group.result : 0;
  }

  // Knockout: exact goal difference (implies correct winner + margin) = 3 pts.
  const gdHit = bet.predHome - bet.predAway === match.homeScore - match.awayScore;
  if (gdHit) return SCORING.knockout.gd;
  return outcomeHit ? SCORING.knockout.result : 0;
}
