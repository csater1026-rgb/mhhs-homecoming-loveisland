# MHHS Mystery Homecoming — Love Island Date Matcher

A Love Island-style mystery homecoming date matcher for MHHS. Students enter their
preferences, a teacher runs the matching, and results are revealed mystery-style.

Front end is a static site (`index.html` + `styles.css` + `app.js`, no build
step, no framework). The roster and match state live in a shared Postgres
database (Vercel's Neon integration), behind serverless functions in `api/`
— every student's submission lands in one place no matter what device they
used, and only someone signed in with the shared owner passcode can view or
manage it.

- `db/schema.sql` — run once against the database (two tables: `islanders`,
  `app_state`).
- `lib/` — shared server helpers: `db.js` (Postgres pool + row mapping),
  `auth.js` (passcode check + signed session cookie), `validate.js`
  (server-side re-validation/sanitizing of submissions — never trust the
  client, since `/api/join` is public).
- `api/` — `join` (public, adds to the roster), `login`/`logout` (session),
  `roster` (owner-only: list/add/edit/delete), `state` (owner-only: locked
  couples, match results, reveal position), `reset` (owner-only: wipe
  everything except the passcode).

Required environment variables (set in the Vercel project, not in this
repo): `DATABASE_URL` (added automatically when you connect the Postgres/Neon
integration under the project's Storage tab), `OWNER_PASSCODE` (the shared
owner login — change it any time in Vercel → Settings → Environment
Variables and redeploy), and `SESSION_SECRET` (a long random string used to
sign login sessions).

`vercel.json` sends a strict `Content-Security-Policy` (no `unsafe-inline` or
`unsafe-eval`) along with the usual hardening headers (HSTS, `X-Frame-Options`,
etc.), which is why CSS and JS live in their own files instead of inline
`<style>`/`<script>` blocks — inline code can't be exempted from that policy
without weakening it.

## Features

- **Join the Villa** — a 6-step wizard (Basics → Height → Interests →
  Vibe & Style → Personality & Values → Last Thing) instead of one long
  form, with Back/Next navigation and a step counter. Covers: guy/girl
  identity + who they're interested in, grade + which grades they're open
  to, height (5'0" up to a 6'5"+ bucket) + optional height preference,
  interests, vibe, dream date, music, school activities/clubs, texting
  style, and an optional **"Your dream match"** field (describe your ideal
  person, shown before your name during the reveal). Every field here
  feeds the match score — nothing is purely decorative. Every chip
  category has an "Other" option that reveals a text field for something
  specific — a favorite song, a custom date idea — shown with a ⭐
  wherever traits are displayed.
- **Owner Panel** (passcode-gated, classroom-level gate only, reached via the
  small "Owner login" link at the bottom of the page) — roster management
  (including how many students have joined so far), manual entry, locking in
  specific couples, running the match, and CSV export.
- **Mystery Reveal** — shows each couple's dream-match description first,
  then flips to reveal names and shared traits, with prev/next controls
  for presenting to a class.

## Matching algorithm

Every eligible pair is scored on **normalized similarity** per category
(shared count divided by the smaller person's pick count, so a category
with a long checkbox list never outscores a smaller one just by chance),
plus bonuses for matching grade, a mutually-satisfied height preference,
and matching texting style. Locked-in couples (the owner's manual picks)
always take priority and are never touched by the rest of this.

Rather than stopping at a greedy pass (highest-scoring pair first, repeat),
which is only ever an approximation and can lock in a bad global result to
grab one great pair, the matcher runs a **local-search refinement** on top:
it repeatedly looks for any swap between two couples (or between a leftover
single and one half of a couple) that raises total compatibility, and takes
it, until a full pass finds no more improving swap. This reliably finds a
much better overall pairing than plain greedy — verified with a
constructed worst-case scenario where greedy's single best pair blocked two
good pairs; the refinement pass found and fixed it.

## Deploying

Import this repo into Vercel (vercel.com/new), framework preset "Other." `main`
is the only branch — no branch configuration required. Before it'll work,
you need to: connect a Postgres database (Storage tab → Neon), run
`db/schema.sql` against it once, and set the `OWNER_PASSCODE` and
`SESSION_SECRET` environment variables described above.
