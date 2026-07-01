import { FEEDS, LEFT, RIGHT, FINAL, THIRD, ROUND_LABELS, winnerOf } from "./bracket";
import { flagFor, nameFor } from "./teams";

const fmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function whenLabel(iso) {
  if (!iso) return "";
  const parts = fmt.formatToParts(new Date(iso));
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}/${get("month")} · ${get("hour")}:${get("minute")}`;
}

// Label for a team slot that isn't decided yet.
function placeholder(slot, side /* "home" | "away" */) {
  const feeders = FEEDS[slot];
  if (!feeders) return "A definir";
  const feeder = side === "home" ? feeders[0] : feeders[1];
  return `Venc. M${feeder}`;
}

function TeamRow({ code, slot, side, score, win }) {
  const known = !!code;
  return (
    <div className={`brow ${win ? "win" : ""} ${known ? "" : "tbd"}`}>
      <span className="flag">{flagFor(code)}</span>
      <span className="bname">{known ? nameFor(code) : placeholder(slot, side)}</span>
      <span className="bscore">{score ?? ""}</span>
    </div>
  );
}

function MatchBox({ match, slot }) {
  const played = match?.homeScore != null && match?.awayScore != null;
  const live = match?.status === "LIVE";
  // Winner = whoever advanced (higher score, or the advancer on a penalty tie).
  const winner = winnerOf(match);
  const homeWin = !!winner && winner === match?.homeTeam;
  const awayWin = !!winner && winner === match?.awayTeam;
  return (
    <div className="bbox">
      <div className="bwhen">
        <span className="mno">M{slot}</span>
        {live ? (
          <span className="live-chip">
            <span className="live-dot" /> AO VIVO
          </span>
        ) : (
          <span>{whenLabel(match?.kickoff)}</span>
        )}
      </div>
      <TeamRow
        code={match?.homeTeam}
        slot={slot}
        side="home"
        score={played ? match.homeScore : null}
        win={homeWin}
      />
      <TeamRow
        code={match?.awayTeam}
        slot={slot}
        side="away"
        score={played ? match.awayScore : null}
        win={awayWin}
      />
    </div>
  );
}

function RoundCol({ slots, label, bySlot }) {
  return (
    <div className="bround">
      <div className="rhead">{label}</div>
      {slots.map((s) => (
        <div className="bslot" key={s}>
          <MatchBox match={bySlot[s]} slot={s} />
        </div>
      ))}
    </div>
  );
}

function ConnCol({ n, right }) {
  return (
    <div className={`conn ${right ? "r" : ""}`}>
      {Array.from({ length: n }).map((_, i) => (
        <div className="conn-slot" key={i}>
          <span className="arm arm-tl" />
          <span className="arm arm-bl" />
          <span className="bus" />
          <span className="arm arm-r" />
        </div>
      ))}
    </div>
  );
}

export default function BracketView({ matches }) {
  const bySlot = Object.fromEntries(matches.filter((m) => m.slot != null).map((m) => [m.slot, m]));
  if (!matches.some((m) => m.slot >= 73)) {
    return <p className="muted">Chaveamento ainda não disponível.</p>;
  }

  return (
    <>
      <p className="bracket-hint">← deslize para ver a chave completa →</p>
      <div className="bracket-wrap">
        <div className="bracket">
        <div className="half">
          <RoundCol slots={LEFT.r32} label={ROUND_LABELS.r32} bySlot={bySlot} />
          <ConnCol n={4} />
          <RoundCol slots={LEFT.r16} label={ROUND_LABELS.r16} bySlot={bySlot} />
          <ConnCol n={2} />
          <RoundCol slots={LEFT.qf} label={ROUND_LABELS.qf} bySlot={bySlot} />
          <ConnCol n={1} />
          <RoundCol slots={LEFT.sf} label={ROUND_LABELS.sf} bySlot={bySlot} />
        </div>

        <div className="bcenter">
          <div className="rhead">Final</div>
          <div className="final-box">
            <MatchBox match={bySlot[FINAL]} slot={FINAL} />
          </div>
          <div className="third">
            <div className="third-label">3º lugar</div>
            <MatchBox match={bySlot[THIRD]} slot={THIRD} />
          </div>
        </div>

        <div className="half">
          <RoundCol slots={RIGHT.sf} label={ROUND_LABELS.sf} bySlot={bySlot} />
          <ConnCol n={1} right />
          <RoundCol slots={RIGHT.qf} label={ROUND_LABELS.qf} bySlot={bySlot} />
          <ConnCol n={2} right />
          <RoundCol slots={RIGHT.r16} label={ROUND_LABELS.r16} bySlot={bySlot} />
          <ConnCol n={4} right />
          <RoundCol slots={RIGHT.r32} label={ROUND_LABELS.r32} bySlot={bySlot} />
        </div>
        </div>
      </div>
    </>
  );
}
