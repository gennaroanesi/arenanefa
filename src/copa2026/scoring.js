// Tiered scoring for the Copa 2026 pool. Tweak the point values here.
export const SCORING = {
  exact: 3, // exact scoreline
  result: 1, // correct result (win/draw/loss) but wrong score
  miss: 0,
};

const sign = (a, b) => (a > b ? 1 : a < b ? -1 : 0);

/**
 * Points a bet earns against a match.
 * @returns number of points, or null if the match hasn't been scored yet.
 */
export function scoreBet(bet, match) {
  if (match?.homeScore == null || match?.awayScore == null) return null; // not played
  if (bet?.predHome == null || bet?.predAway == null) return SCORING.miss;
  if (bet.predHome === match.homeScore && bet.predAway === match.awayScore) {
    return SCORING.exact;
  }
  if (sign(bet.predHome, bet.predAway) === sign(match.homeScore, match.awayScore)) {
    return SCORING.result;
  }
  return SCORING.miss;
}
