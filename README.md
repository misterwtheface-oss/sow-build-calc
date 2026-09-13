# Symphony of War — Squad Build Calculator

A build-first, overlay-driven planner for **Symphony of War: The Nephilim Saga**. Assemble a
15-unit squad on a 3×5 formation grid, tune each unit's class / level / affinity, and analyse
the **85-node class upgrade tree** (requirements, resource costs, mastery, `param_add`, stat
curves) — a theorycraft sandbox instead of grinding experiments in-game.

Vanilla HTML/CSS/JS, no framework, no build server. Deployable as static files on GitHub Pages.

## Run it
```bash
node build-data.mjs          # compile the datamine subset -> data.js (window.SOW_DATA)
node tools/serve.mjs         # local + LAN preview at http://localhost:8080
```
Open `http://localhost:8080`. `data.js` is generated — never hand-edit it.

## Layout
```
index.html      single entry point (loads data.js then app.js)
styles.css      SoW palette (sampled from the game's own UI art), mobile-first
app.js          squad grid + roster selector + class upgrade-tree detail + xref matrix
build-data.mjs  compiles data/ -> data.js, runs data-hygiene guardrails
data/           shipped source subset (classtree.json, Actors.json) — copied from the extract
assets/         class cards, stat/affinity icons, hero portraits, formation art
tools/serve.mjs static preview server (start only while testing)
SPEC_PLAN.md    architecture + phased plan
WIKI_CONTEXT.md game/datamine context tree + source→ship mapping
Progress.md     cross-session backlog + status (read this first next session)
```

## Data provenance
All game data is a **raw datamine extract** (from the sibling `_sow_extract/` workspace) and is
**unverified** — treat numbers as extracted, not golden, until hand-checked. See `WIKI_CONTEXT.md`
for how to regenerate, and `Progress.md` for known gaps.

## Deploy (later)
Push to GitHub, enable Pages on the branch root. No build action needed (`data.js` is committed).
Add the Cloudflare Web Analytics beacon only at public release.
