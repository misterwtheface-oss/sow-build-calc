# Symphony of War — Squad Build Calculator — Progress

## Current state
**P0 skeleton scaffolded and runnable (2026-09-12).** Build-first 3×5 formation grid; roster
selector overlay (21 named heroes, searchable); per-unit editor (level slider, affinity picker,
class-via-tree, remove); squad summary (capacity bar from leader Leadership + aggregate power grid);
navigable class upgrade-tree detail (reqs / cost / mastery / param_add / stat curve + classup/
classdown chips + "assign class to unit"); trait × unit cross-reference matrix. Data compiled from
the `_sow_extract` datamine via `build-data.mjs` with hygiene guardrails. Real game UI art wired in
(class cards, hero portraits, stat/affinity icons, formation/leader art); palette sampled from the
game's own windowskin/title art. Stats are the raw class-table curve + flat `param_add` — a
first-pass sandbox metric, NOT the full effective-stat engine (that's the top P1 item).

## Backlog
### In progress
- (none — P0 complete)
### Next up (P1)
- [ ] High-fidelity effective-stat engine: encode the 12-step assembly (`0924`) — level variance,
      affinity growth bias, homegrown bonus, tier-scaled param_add (×0.8^tierRank), softcaps, equipment.
- [ ] Pull off-tree hero classes (Diana/Beatrix/Zanatus etc.) from `Classes.json` so they get stats.
- [ ] Formation combat effects (row bypass / cover / block / phalanx) surfaced on the grid.
- [ ] Full 85-node tier graph view with the unit's path highlighted.
- [ ] Class-change legality (edges + mastery/req/tech gates) vs. free-sandbox toggle.
- [ ] Save / load / share squads (schema-versioned localStorage).
### Later (P2)
- [ ] Damage simulator (12 presets, 3-trial hit, crit/glancing).
- [ ] Loyalty / relationship capacity discounts; LXP→Leadership planner.
- [ ] Equipment channel (Weapons/Armors/Items) + conflict tags.
- [ ] Resource-budget planner; collection/ownership.
### Done
- [x] Skeleton scaffolded, P0 flow runnable (2026-09-12).

## Known issues / warnings
- **Data is a raw extract, unverified.** Treat all numbers as extracted-not-golden until hand-checked.
- `build-data.mjs` emits **10 non-fatal warnings** (understood, parked here):
  - 8 heroes on off-tree special classes (Diana 66, Stefan 70, Raskuja 73, Lysander 67, Beatrix 69,
    Hand of Zanatus 71, Zanatus 80, Zanatus Hand 81) → kept with `startClass: null`, no stat table
    yet. Fix via the "pull off-tree classes from Classes.json" P1 item.
  - 2 missing portraits (Zanatus, Zanatus Hand) → fall back to class-card / initial art.
- Per-unit capacity cost uses a `capacityCost / 10` heuristic — reconcile with `08_formation.md`.
- `param_add` applied at full value in P0 (no ×0.8^tierRank assembly scaling yet).
- Duplicate class names in the tree (Captain/Cleric/Strider ×2 gendered) are distinct symbols; fine.

## Session log
- 2026-09-12: Scaffolded the project via build-calc-planner. Chose named-hero roster (21 heroes
  parsed from Actors.json note-tags), palette sampled from real game UI art, per-class detail for
  the upgrade tree. Wrote build-data.mjs (+ guardrails), index.html, styles.css, app.js, serve.mjs,
  and planning artifacts. Build clean (errors 0). git init + initial commit.
