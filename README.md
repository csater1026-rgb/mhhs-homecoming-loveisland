# MHHS Mystery Homecoming — Love Island Date Matcher

A Love Island-style mystery homecoming date matcher for MHHS. Students enter their
preferences, a teacher runs the matching, and results are revealed mystery-style.

Single self-contained page (`index.html`) — all HTML/CSS/JS inline, no dependencies,
no build step, no server. Data lives entirely in the browser's `localStorage`.

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
  nav tab or the small "Owner login" link at the bottom of the page) — roster
  management (including how many students have joined so far), manual entry,
  bulk import (for transcribing paper forms), locking in specific couples,
  running the match, and CSV export.
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

Import this repo into Vercel (vercel.com/new), framework preset "Other," no
build step needed. `main` is the only branch — no branch configuration required.
