import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadPool, upsertBet, createProfile } from "./api";
import { scoreBet, CONDS, BASE_FLOOR } from "./scoring";
import { nameFor, flagFor } from "./teams";
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

function teamLabel(code) {
  return code && code.trim() ? nameFor(code) : "A definir";
}

// "A:2" → "🇧🇷 BRA (2)" — advancer + condition.
function pickLabel(pick, match) {
  if (!pick) return "—";
  const [side, cond] = pick.split(":");
  const code = side === "A" ? match.homeTeam : match.awayTeam;
  const short = cond === "P" ? "pên" : cond === "3" ? "3+" : cond;
  return `${flagFor(code)} ${code ?? "?"} (${short})`;
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

  // Paint the navy onto the outermost elements while this page is mounted,
  // so the background fills the whole viewport (not just the content column).
  useEffect(() => {
    const root = document.documentElement;
    const { body } = document;
    const prev = { html: root.style.background, body: body.style.background };
    root.style.background = "#0a1330";
    body.style.background = "#0a1330";
    return () => {
      root.style.background = prev.html;
      body.style.background = prev.body;
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
      pool.profiles.map((p) => [
        p.id,
        { profile: p, points: p.startingPoints ?? 0, big: 0, small: 0, played: 0 },
      ]),
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
          Mata-mata · 1 pt no classificado · 3 pts cravando a condição (P / 1 / 2 / 3+)
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
          <th title="Cravou classificado + condição (3 pts)">Cheios</th>
          <th title="Acertou só o classificado (1 pt)">Parciais</th>
          <th>Jogos</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((r, i) => (
          <tr key={r.profile.id}>
            <td>{i + 1}</td>
            <td>
              <div className="lb-name">{r.profile.displayName}</div>
              <div className="lb-sub">
                grupos {r.profile.startingPoints ?? 0} · mata +{r.points - (r.profile.startingPoints ?? 0)}
              </div>
            </td>
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
                <span>{pickLabel(b.pick, match)}</span>
                <span className="pts">{pts == null ? "" : `${pts} pt`}</span>
              </li>
            ))}
          {!bets.length && <li className="muted">sem palpites</li>}
        </ul>
      )}
    </div>
  );
}

// One match's pick row: home team + its condition buttons, then away.
// A pick is "A:<cond>" (home advances) or "B:<cond>" (away advances).
function PickRow({ match, value, onPick }) {
  const known = !!match.homeTeam && !!match.awayTeam;
  const sideBtns = (side, conds) =>
    conds.map(({ v, label }) => {
      const val = side + ":" + v;
      return (
        <button
          key={val}
          type="button"
          disabled={!known}
          className={"pick-btn" + (value === val ? " on" : "")}
          onClick={() => onPick(val)}
        >
          {label}
        </button>
      );
    });
  return (
    <div className="pick-match">
      <div className="pick-when">
        {STAGE_LABEL[match.stage]} · {teamLabel(match.homeTeam)} vs {teamLabel(match.awayTeam)}
      </div>
      <div className="pick-sides">
        <div className="pick-side">
          <div className="pick-team">
            <span>{flagFor(match.homeTeam)}</span>
            <span className="pick-name">{teamLabel(match.homeTeam)}</span>
          </div>
          <div className="pick-btns">{sideBtns("A", CONDS)}</div>
        </div>
        <div className="pick-side">
          <div className="pick-team pick-team-r">
            <span className="pick-name">{teamLabel(match.awayTeam)}</span>
            <span>{flagFor(match.awayTeam)}</span>
          </div>
          <div className="pick-btns">{sideBtns("B", [...CONDS].reverse())}</div>
        </div>
      </div>
    </div>
  );
}

const ME_KEY = "copa2026:me";

function MyBets({ pool, matchesByStage, onSaved }) {
  // Pre-select the remembered participant, but only if they still exist.
  const [profileId, setProfileIdRaw] = useState(() => {
    const saved = localStorage.getItem(ME_KEY);
    return saved && pool.profiles.some((p) => p.id === saved) ? saved : "";
  });
  const [drafts, setDrafts] = useState({}); // matchId -> pick string
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [newName, setNewName] = useState("");
  const [newBase, setNewBase] = useState("");
  const [joining, setJoining] = useState(false);

  // Persist who's betting so the tab pre-selects them next time.
  function setProfileId(id) {
    setProfileIdRaw(id);
    if (id) localStorage.setItem(ME_KEY, id);
    else localStorage.removeItem(ME_KEY);
  }

  async function joinAsNew() {
    const name = newName.trim();
    if (!name) return;
    if (pool.profiles.some((p) => p.displayName.toLowerCase() === name.toLowerCase())) {
      setMsg("Esse nome já existe — selecione-o na lista.");
      return;
    }
    const base = Math.max(BASE_FLOOR, parseInt(newBase, 10) || BASE_FLOOR);
    setJoining(true);
    setMsg(null);
    try {
      const created = await createProfile(name, base);
      await onSaved(); // reload pool so the new profile shows up
      setProfileId(created.id);
      setNewName("");
      setNewBase("");
      setMsg(`Bem-vindo, ${name}! Você começa com ${base} pts.`);
    } catch (e) {
      setMsg("Erro: " + (e.message ?? String(e)));
    } finally {
      setJoining(false);
    }
  }

  const myBets = useMemo(() => {
    const map = {};
    for (const b of pool.bets) if (b.profileId === profileId) map[b.matchId] = b;
    return map;
  }, [pool, profileId]);

  // Open knockout matches: both teams known and not yet decided.
  const openMatches = useMemo(
    () =>
      STAGES.flatMap((s) => matchesByStage[s.key] ?? [])
        .filter((m) => isOpen(m) && m.homeTeam && m.awayTeam)
        .sort(matchSort),
    [matchesByStage],
  );

  function setPick(matchId, val) {
    setDrafts((d) => {
      const cur = d[matchId] ?? myBets[matchId]?.pick;
      const next = { ...d };
      if (cur === val) next[matchId] = ""; // toggle off
      else next[matchId] = val;
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      for (const [matchId, pick] of Object.entries(drafts)) {
        const existing = myBets[matchId];
        if (!pick) continue; // skip cleared (kept simple: no delete)
        if (existing && existing.pick === pick) continue;
        await upsertBet({ id: existing?.id, profileId, matchId, pick });
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
        Quem está palpitando?{" "}
        <select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
          <option value="">— selecionar participante —</option>
          {[...pool.profiles]
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
        </select>
      </label>

      <div className="join-new">
        <span className="join-or">ou entre como novo participante:</span>
        <div className="join-row">
          <input
            type="text"
            placeholder="Nome / apelido"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && joinAsNew()}
          />
          <input
            type="text"
            inputMode="numeric"
            className="join-base"
            placeholder="Pts grupos"
            value={newBase}
            onChange={(e) => setNewBase(e.target.value.replace(/[^0-9]/g, ""))}
          />
          <button disabled={joining || !newName.trim()} onClick={joinAsNew}>
            {joining ? "Entrando…" : "Entrar"}
          </button>
        </div>
        <span className="join-hint">
          Sem pontos de grupos? Deixe em branco — você começa com {BASE_FLOOR} (piso para quem
          entra agora).
        </span>
      </div>

      {msg && <p className="msg">{msg}</p>}

      {!profileId && <p className="muted">Selecione ou crie um participante para palpitar.</p>}

      {profileId && !openMatches.length && (
        <p className="muted">Nenhum jogo aberto para palpite no momento.</p>
      )}

      {profileId &&
        openMatches.map((m) => (
          <PickRow
            key={m.id}
            match={m}
            value={drafts[m.id] ?? myBets[m.id]?.pick ?? ""}
            onPick={(v) => setPick(m.id, v)}
          />
        ))}

      {profileId && openMatches.length > 0 && (
        <div className="save-bar">
          <button disabled={saving} onClick={save}>
            {saving ? "Salvando…" : "Salvar palpites"}
          </button>
        </div>
      )}
    </div>
  );
}
