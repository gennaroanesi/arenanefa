import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadPool, upsertBet } from "./api";
import { scoreBet, SCORING } from "./scoring";
import BracketView from "./BracketView";
import "./copa2026.css";

const STAGES = [
  { key: "GROUP", label: "Fase de Grupos" },
  { key: "R32", label: "16-avos (Round of 32)" },
  { key: "R16", label: "Oitavas" },
  { key: "QF", label: "Quartas" },
  { key: "SF", label: "Semifinais" },
  { key: "THIRD_PLACE", label: "Disputa de 3º" },
  { key: "FINAL", label: "Final" },
];
const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.key, s.label]));

function matchSort(a, b) {
  if (a.kickoff && b.kickoff) return a.kickoff.localeCompare(b.kickoff);
  return (a.slot ?? 0) - (b.slot ?? 0);
}

function isOpen(match) {
  // Betting is open while the match isn't finished and the deadline hasn't passed.
  if (match.status === "FINISHED") return false;
  if (match.homeScore != null && match.awayScore != null) return false;
  if (match.bettingDeadline) return new Date(match.bettingDeadline) > new Date();
  return true;
}

function teamLabel(t) {
  return t && t.trim() ? t : "A definir";
}

export default function Copa2026() {
  const [pool, setPool] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("leaderboard"); // leaderboard | bracket | matches | mybets

  async function refresh() {
    setError(null);
    try {
      setPool(await loadPool());
    } catch (e) {
      setError(e.message ?? String(e));
    }
  }

  useEffect(() => {
    let alive = true;
    loadPool()
      .then((data) => alive && setPool(data))
      .catch((e) => alive && setError(e.message ?? String(e)));
    return () => {
      alive = false;
    };
  }, []);

  const matchesById = useMemo(
    () => Object.fromEntries((pool?.matches ?? []).map((m) => [m.id, m])),
    [pool],
  );

  // Leaderboard: total points + tier breakdown per profile.
  // big = 3-pt hits (knockout goal difference); small = 1-pt hits (result).
  const standings = useMemo(() => {
    if (!pool) return [];
    const byProfile = Object.fromEntries(
      pool.profiles.map((p) => [p.id, { profile: p, points: 0, big: 0, small: 0, played: 0 }]),
    );
    for (const bet of pool.bets) {
      const row = byProfile[bet.profileId];
      const match = matchesById[bet.matchId];
      if (!row || !match) continue;
      const pts = scoreBet(bet, match);
      if (pts == null) continue; // match not scored yet
      row.points += pts;
      row.played += 1;
      if (pts === 3) row.big += 1;
      else if (pts === 1) row.small += 1;
    }
    return Object.values(byProfile).sort(
      (a, b) => b.points - a.points || b.big - a.big || a.profile.displayName.localeCompare(b.profile.displayName),
    );
  }, [pool, matchesById]);

  const matchesByStage = useMemo(() => {
    const groups = {};
    for (const m of pool?.matches ?? []) (groups[m.stage] ??= []).push(m);
    for (const k of Object.keys(groups)) groups[k].sort(matchSort);
    return groups;
  }, [pool]);

  if (error) {
    return (
      <Shell>
        <p className="error">Erro ao carregar: {error}</p>
        <button onClick={refresh}>Tentar de novo</button>
      </Shell>
    );
  }
  if (!pool) {
    return (
      <Shell>
        <p>Carregando…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <nav className="tabs">
        <button className={tab === "leaderboard" ? "on" : ""} onClick={() => setTab("leaderboard")}>
          Classificação
        </button>
        <button className={tab === "bracket" ? "on" : ""} onClick={() => setTab("bracket")}>
          Chave
        </button>
        <button className={tab === "matches" ? "on" : ""} onClick={() => setTab("matches")}>
          Jogos &amp; Palpites
        </button>
        <button className={tab === "mybets" ? "on" : ""} onClick={() => setTab("mybets")}>
          Meus Palpites
        </button>
      </nav>

      {tab === "leaderboard" && <Leaderboard standings={standings} />}
      {tab === "bracket" && <BracketView matches={pool.matches} />}
      {tab === "matches" && (
        <Matches pool={pool} matchesByStage={matchesByStage} />
      )}
      {tab === "mybets" && (
        <MyBets pool={pool} matchesByStage={matchesByStage} onSaved={refresh} />
      )}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="copa-page">
    <div className="copa">
      <header className="copa-header">
        <Link to="/" className="back">← arena nefa</Link>
        <h1>Bolão Copa 2026 🏆</h1>
        <p className="rules">
          Grupos: {SCORING.group.result} pt no resultado · Mata-mata: {SCORING.knockout.gd} pts no
          saldo de gols, {SCORING.knockout.result} pt no resultado
        </p>
      </header>
      {children}
    </div>
    </div>
  );
}

function Leaderboard({ standings }) {
  if (!standings.length) return <p>Nenhum participante ainda.</p>;
  return (
    <table className="board">
      <thead>
        <tr>
          <th>#</th>
          <th>Nome</th>
          <th>Pontos</th>
          <th title="Acertos de 3 pts (saldo de gols no mata-mata)">3 pts</th>
          <th title="Acertos de 1 pt (resultado)">1 pt</th>
          <th>Jogos</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((r, i) => (
          <tr key={r.profile.id}>
            <td>{i + 1}</td>
            <td>{r.profile.displayName}</td>
            <td className="pts">{r.points}</td>
            <td>{r.big}</td>
            <td>{r.small}</td>
            <td>{r.played}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Matches({ pool, matchesByStage }) {
  const profilesById = Object.fromEntries(pool.profiles.map((p) => [p.id, p]));
  const betsByMatch = {};
  for (const b of pool.bets) (betsByMatch[b.matchId] ??= []).push(b);

  return (
    <div className="stages">
      {STAGES.filter((s) => matchesByStage[s.key]?.length).map((s) => (
        <section key={s.key}>
          <h2>{s.label}</h2>
          {matchesByStage[s.key].map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              bets={betsByMatch[m.id] ?? []}
              profilesById={profilesById}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function MatchCard({ match, bets, profilesById }) {
  const [open, setOpen] = useState(false);
  const played = match.homeScore != null && match.awayScore != null;
  return (
    <div className="match">
      <button className="match-head" onClick={() => setOpen((o) => !o)}>
        <span className="teams">
          {teamLabel(match.homeTeam)} <em>vs</em> {teamLabel(match.awayTeam)}
        </span>
        <span className="score">
          {played ? `${match.homeScore} – ${match.awayScore}` : isOpen(match) ? "aberto" : "—"}
        </span>
        <span className="count">{bets.length} palpites</span>
      </button>
      {open && (
        <ul className="bets">
          {bets
            .map((b) => ({ b, pts: scoreBet(b, match) }))
            .sort((x, y) => (y.pts ?? -1) - (x.pts ?? -1))
            .map(({ b, pts }) => (
              <li key={b.id}>
                <span>{profilesById[b.profileId]?.displayName ?? "?"}</span>
                <span>
                  {b.predHome} – {b.predAway}
                </span>
                <span className="pts">{pts == null ? "" : `${pts} pt`}</span>
              </li>
            ))}
          {!bets.length && <li className="muted">sem palpites</li>}
        </ul>
      )}
    </div>
  );
}

function MyBets({ pool, matchesByStage, onSaved }) {
  const [profileId, setProfileId] = useState("");
  const [drafts, setDrafts] = useState({}); // matchId -> {home, away}
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const myBets = useMemo(() => {
    const map = {};
    for (const b of pool.bets) if (b.profileId === profileId) map[b.matchId] = b;
    return map;
  }, [pool, profileId]);

  const openMatches = useMemo(
    () =>
      STAGES.flatMap((s) => matchesByStage[s.key] ?? [])
        .filter(isOpen)
        .sort(matchSort),
    [matchesByStage],
  );

  function setDraft(matchId, side, value) {
    setDrafts((d) => ({ ...d, [matchId]: { ...d[matchId], [side]: value } }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const edits = Object.entries(drafts).filter(([, v]) => v.home !== undefined || v.away !== undefined);
      for (const [matchId, v] of edits) {
        const existing = myBets[matchId];
        const predHome = Number(v.home ?? existing?.predHome);
        const predAway = Number(v.away ?? existing?.predAway);
        if (Number.isNaN(predHome) || Number.isNaN(predAway)) continue;
        await upsertBet({ id: existing?.id, profileId, matchId, predHome, predAway });
      }
      setDrafts({});
      setMsg("Palpites salvos!");
      await onSaved();
    } catch (e) {
      setMsg("Erro: " + (e.message ?? String(e)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mybets">
      <label className="who">
        Quem é você?{" "}
        <select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
          <option value="">— escolha seu nome —</option>
          {[...pool.profiles]
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
        </select>
      </label>

      {!profileId && <p className="muted">Selecione seu nome para palpitar.</p>}

      {profileId && !openMatches.length && (
        <p className="muted">Nenhum jogo aberto para palpite no momento.</p>
      )}

      {profileId &&
        openMatches.map((m) => {
          const existing = myBets[m.id];
          const d = drafts[m.id] ?? {};
          return (
            <div className="bet-row" key={m.id}>
              <span className="stage-tag">{STAGE_LABEL[m.stage]}</span>
              <span className="teams">
                {teamLabel(m.homeTeam)} vs {teamLabel(m.awayTeam)}
              </span>
              <input
                type="number"
                min="0"
                value={d.home ?? existing?.predHome ?? ""}
                onChange={(e) => setDraft(m.id, "home", e.target.value)}
              />
              <span>–</span>
              <input
                type="number"
                min="0"
                value={d.away ?? existing?.predAway ?? ""}
                onChange={(e) => setDraft(m.id, "away", e.target.value)}
              />
            </div>
          );
        })}

      {profileId && openMatches.length > 0 && (
        <div className="save-bar">
          <button disabled={saving} onClick={save}>
            {saving ? "Salvando…" : "Salvar palpites"}
          </button>
          {msg && <span className="msg">{msg}</span>}
        </div>
      )}
    </div>
  );
}
