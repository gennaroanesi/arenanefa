import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/**
 * Copa 2026 betting pool — data model.
 *
 * The 2026 World Cup runs 48 teams → 12 groups (A–L) → a Round of 32, then
 * R16 / QF / SF / third-place / final. Group-stage bets already happened
 * (imported from a file); knockout matches are added as the bracket resolves.
 *
 * Auth: there is no real authentication yet, so everything is public via an
 * API key. PIN-based identity is planned — `Profile.pinHash` is reserved for
 * it. When PINs go live, lock writes (and the pinHash field) behind a
 * Lambda-gated custom mutation instead of the open apiKey rule below.
 */
const schema = a
  .schema({
    // ── Profile ─────────────────────────────────────────────────────────
    // One row per person in the pool. Deliberately lightweight.
    Profile: a.model({
      displayName: a.string().required(),
      // Reserved for future name+PIN self-serve auth. Unused for now; never
      // expose this once it actually holds a hash.
      pinHash: a.string(),
      // Head-start points. Newcomers who join for the knockouts (and so missed
      // the group stage) get a handicap here; the seeded 16 stay at 0/null.
      // Added to their total in the leaderboard. Null is treated as 0.
      startingPoints: a.integer(),
      bets: a.hasMany("Bet", "profileId"),
    }),

    // ── Match ───────────────────────────────────────────────────────────
    // Group-stage and knockout matches. Knockout rows can exist before the
    // teams are known (homeTeam/awayTeam null, positioned by `slot`).
    Match: a.model({
      stage: a.enum(["GROUP", "R32", "R16", "QF", "SF", "THIRD_PLACE", "FINAL"]),
      // "A".."L" for group stage; null for knockouts.
      group: a.string(),
      // Official match number / bracket slot for ordering and seeding.
      slot: a.integer(),
      homeTeam: a.string(),
      awayTeam: a.string(),
      kickoff: a.datetime(),
      bettingDeadline: a.datetime(),
      // Actual result — null until played.
      homeScore: a.integer(),
      awayScore: a.integer(),
      // For knockouts: which team advanced (resolves draws / shootouts).
      advancer: a.string(),
      status: a.enum(["SCHEDULED", "FINISHED"]),
      bets: a.hasMany("Bet", "matchId"),
    }),

    // ── Bet ─────────────────────────────────────────────────────────────
    // One per person per match: an exact-scoreline prediction.
    Bet: a.model({
      profileId: a.id().required(),
      matchId: a.id().required(),
      predHome: a.integer().required(),
      predAway: a.integer().required(),
      // Optional helper for knockout ties; unused while bets are scoreline-only.
      predAdvancer: a.string(),
      profile: a.belongsTo("Profile", "profileId"),
      match: a.belongsTo("Match", "matchId"),
    }),
  })
  .authorization((allow) => [allow.publicApiKey()]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: { expiresInDays: 365 },
  },
});
