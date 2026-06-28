// PT-BR team name → ISO 3166-1 alpha-2 (for flag emoji). Mirrors the names
// stored in the DB (scripts/teamNames.js).
const ISO2 = {
  México: "MX", "África do Sul": "ZA", "Coreia do Sul": "KR", Tchéquia: "CZ",
  Suíça: "CH", Canadá: "CA", "Bósnia e Herzegovina": "BA", Catar: "QA",
  Brasil: "BR", Marrocos: "MA", Haiti: "HT",
  "Estados Unidos": "US", Austrália: "AU", Paraguai: "PY", Turquia: "TR",
  Alemanha: "DE", "Costa do Marfim": "CI", Equador: "EC", "Curaçao": "CW",
  Holanda: "NL", Japão: "JP", Suécia: "SE", Tunísia: "TN",
  Bélgica: "BE", Egito: "EG", Irã: "IR", "Nova Zelândia": "NZ",
  Espanha: "ES", "Cabo Verde": "CV", Uruguai: "UY", "Arábia Saudita": "SA",
  França: "FR", Noruega: "NO", Senegal: "SN", Iraque: "IQ",
  Argentina: "AR", Áustria: "AT", Argélia: "DZ", Jordânia: "JO",
  Portugal: "PT", Colômbia: "CO", "RD Congo": "CD", Uzbequistão: "UZ",
  Gana: "GH", Croácia: "HR", Panamá: "PA",
};

// England & Scotland use subdivision flag emoji (no plain ISO2 regional pair).
const SPECIAL = {
  Inglaterra: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Escócia: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
};

export function flagFor(name) {
  if (!name) return "";
  if (SPECIAL[name]) return SPECIAL[name];
  const iso = ISO2[name];
  if (!iso) return "";
  return String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
