// Teams keyed by FIFA 3-letter country code (stable). Matches store codes in
// homeTeam/awayTeam; the UI derives the PT-BR name and flag from the code.
// This decouples stored data from display, so renaming a team (e.g. Holanda ↔
// Países Baixos) never breaks bet/result matching.
const TEAMS = {
  // Group A
  MEX: { name: "México", iso2: "MX" },
  RSA: { name: "África do Sul", iso2: "ZA" },
  KOR: { name: "Coreia do Sul", iso2: "KR" },
  CZE: { name: "Tchéquia", iso2: "CZ" },
  // Group B
  SUI: { name: "Suíça", iso2: "CH" },
  CAN: { name: "Canadá", iso2: "CA" },
  BIH: { name: "Bósnia e Herzegovina", iso2: "BA" },
  QAT: { name: "Catar", iso2: "QA" },
  // Group C
  BRA: { name: "Brasil", iso2: "BR" },
  MAR: { name: "Marrocos", iso2: "MA" },
  SCO: { name: "Escócia", iso2: "GB-SCT" },
  HAI: { name: "Haiti", iso2: "HT" },
  // Group D
  USA: { name: "Estados Unidos", iso2: "US" },
  AUS: { name: "Austrália", iso2: "AU" },
  PAR: { name: "Paraguai", iso2: "PY" },
  TUR: { name: "Turquia", iso2: "TR" },
  // Group E
  GER: { name: "Alemanha", iso2: "DE" },
  CIV: { name: "Costa do Marfim", iso2: "CI" },
  ECU: { name: "Equador", iso2: "EC" },
  CUW: { name: "Curaçao", iso2: "CW" },
  // Group F
  NED: { name: "Holanda", iso2: "NL" },
  JPN: { name: "Japão", iso2: "JP" },
  SWE: { name: "Suécia", iso2: "SE" },
  TUN: { name: "Tunísia", iso2: "TN" },
  // Group G
  BEL: { name: "Bélgica", iso2: "BE" },
  EGY: { name: "Egito", iso2: "EG" },
  IRN: { name: "Irã", iso2: "IR" },
  NZL: { name: "Nova Zelândia", iso2: "NZ" },
  // Group H
  ESP: { name: "Espanha", iso2: "ES" },
  CPV: { name: "Cabo Verde", iso2: "CV" },
  URU: { name: "Uruguai", iso2: "UY" },
  KSA: { name: "Arábia Saudita", iso2: "SA" },
  // Group I
  FRA: { name: "França", iso2: "FR" },
  NOR: { name: "Noruega", iso2: "NO" },
  SEN: { name: "Senegal", iso2: "SN" },
  IRQ: { name: "Iraque", iso2: "IQ" },
  // Group J
  ARG: { name: "Argentina", iso2: "AR" },
  AUT: { name: "Áustria", iso2: "AT" },
  ALG: { name: "Argélia", iso2: "DZ" },
  JOR: { name: "Jordânia", iso2: "JO" },
  // Group K
  POR: { name: "Portugal", iso2: "PT" },
  COL: { name: "Colômbia", iso2: "CO" },
  COD: { name: "RD Congo", iso2: "CD" },
  UZB: { name: "Uzbequistão", iso2: "UZ" },
  // Group L
  ENG: { name: "Inglaterra", iso2: "GB-ENG" },
  GHA: { name: "Gana", iso2: "GH" },
  CRO: { name: "Croácia", iso2: "HR" },
  PAN: { name: "Panamá", iso2: "PA" },
};

// Subdivision flags have no plain regional-indicator pair.
const SPECIAL_FLAG = {
  "GB-ENG": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "GB-SCT": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
};

function flagFromIso(iso2) {
  if (!iso2) return "";
  if (SPECIAL_FLAG[iso2]) return SPECIAL_FLAG[iso2];
  return String.fromCodePoint(...[...iso2].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

// PT-BR display name for a code (falls back to the code itself if unknown).
export function nameFor(code) {
  return TEAMS[code]?.name ?? code ?? "";
}

// Flag emoji for a code.
export function flagFor(code) {
  return code ? flagFromIso(TEAMS[code]?.iso2) : "";
}

export { TEAMS };
