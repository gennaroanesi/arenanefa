// Knockout bracket topology for the 2026 World Cup (match slots 73–104).
// FEEDS[slot] = [homeFeederSlot, awayFeederSlot] — the two matches whose
// winners play in `slot`. Used to render the bracket and to label TBD teams.
export const FEEDS = {
  89: [74, 77], 90: [73, 75], 91: [76, 78], 92: [79, 80],
  93: [83, 84], 94: [81, 82], 95: [86, 88], 96: [85, 87],
  97: [89, 90], 98: [93, 94], 99: [91, 92], 100: [95, 96],
  101: [97, 98], 102: [99, 100],
  103: [101, 102], // third place (losers)
  104: [101, 102], // final (winners)
};

// Two-sided layout. Left half flows R32→SF rightward; right half mirrors.
export const LEFT = {
  r32: [74, 77, 73, 75, 83, 84, 81, 82],
  r16: [89, 90, 93, 94],
  qf: [97, 98],
  sf: [101],
};
export const RIGHT = {
  sf: [102],
  qf: [99, 100],
  r16: [91, 92, 95, 96],
  r32: [76, 78, 79, 80, 86, 88, 85, 87],
};
export const FINAL = 104;
export const THIRD = 103;

export const ROUND_LABELS = {
  r32: "16-avos",
  r16: "Oitavas",
  qf: "Quartas",
  sf: "Semi",
};
