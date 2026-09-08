# MHHS Mystery Homecoming — Love Island Date Matcher

A Love Island-style mystery homecoming date matcher for MHHS. Students enter their
preferences, a teacher runs the matching, and results are revealed mystery-style.

Single self-contained page (`index.html`) — all HTML/CSS/JS inline, no dependencies,
no build step, no server. Data lives entirely in the browser's `localStorage`.

## Features

- **Join the Villa** — student preference form: guy/girl identity + who
  they're interested in, grade + which grades they're open to, height (5'0"
  up to a 6'5"+ bucket) + optional height preference, interests, vibe, dream
  date, music, school activities/clubs, optional zodiac sign, and an
  optional "mystery clue" bio.
- **Swipe** — Tinder-style mode: students swipe yes/no on anonymized mystery
  profiles; a couple only forms if both sides swiped yes on each other.
- **Owner Panel** (passcode-gated, classroom-level gate only) — roster
  management, manual entry, bulk import (for transcribing paper forms), locking
  in specific couples, choosing between the two matching modes, and CSV export.
- **Mystery Reveal** — shows each couple's bio clue first, then flips to reveal
  names and shared traits, with prev/next controls for presenting to a class.

## Deploying

Import this repo into Vercel (vercel.com/new), framework preset "Other," no
build step needed. `main` is the only branch — no branch configuration required.
