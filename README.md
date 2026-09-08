# MHHS Mystery Homecoming — Love Island Date Matcher

A Love Island-style mystery homecoming date matcher for MHHS. Students enter their
preferences, a teacher runs the matching, and results are revealed mystery-style.

Single self-contained page (`index.html`) — all HTML/CSS/JS inline, no dependencies,
no build step, no server. Data lives entirely in the browser's `localStorage`.

## Features

- **Join the Villa** — a 6-step wizard (Basics → Height → Interests →
  Vibe & Style → Personality & Values → Mystery Clue) instead of one long
  form, with Back/Next navigation and a step counter. Covers: guy/girl
  identity + who they're interested in, grade + which grades they're open
  to, height (5'0" up to a 6'5"+ bucket) + optional height preference,
  interests, vibe, dream date, music, school activities/clubs, optional
  zodiac sign, a **Personality & Values** step (social battery, texting
  style, love language, what matters most on a date — all of which factor
  into the match score, not just decoration), and an optional "mystery
  clue" bio. Every chip category has an "Other" option that reveals a text
  field for something specific — a favorite song, a custom date idea —
  shown with a ⭐ wherever traits are displayed.
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
