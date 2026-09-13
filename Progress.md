# Symphony of War — Squad Build Calculator — Progress

## Current state
**LIVE: https://misterwtheface-oss.github.io/sow-build-calc/** (repo
`misterwtheface-oss/sow-build-calc`, GitHub Pages from `master`/root; Cloudflare Web
Analytics beacon active). Repo pruned lean — only the assets the app references are committed
(unused datamine art removed): class-cards/portraits/icons + the formation **battle sprites**
(`assets/sprites/`, 85 class + 21 hero) and **grid art** (`assets/grid/sowgrid*.png`).

**P0 skeleton scaffolded and runnable (2026-09-12).** Build-first formation home screen; roster
selector overlay (21 named heroes + generic units, searchable); per-unit editor (level slider, affinity
picker, class-via-tree, remove); squad summary (capacity bar from leader Leadership + aggregate power
grid); navigable class upgrade-tree detail (reqs / cost / mastery / param_add / stat curve + classup/
classdown chips + "assign class to unit"); trait × unit cross-reference matrix. Data compiled from
the `_sow_extract` datamine via `build-data.mjs` with hygiene guardrails. Palette sampled from the
game's own windowskin/title art. Stats are the raw class-table curve + flat `param_add` — a
first-pass sandbox metric, NOT the full effective-stat engine (that's the top P1 item).

**Formation view pivoted to the game's 3D-angled battle grid (2026-09-12, session 2).** The flat 3×5
CSS grid is replaced by a **`.formation-stage`**: the game's own `sowgrid.png` right-skewed
parallelogram with units placed at their exact per-tile foot-origins (from `0241_UnitGrid.rb`
`SIZED_ORIGINS[1]`, exported as `SOW_DATA.grid.origins`). Orientation is game-faithful — **front rank
on the right (facing the enemy), the 5 columns stepping down the slant at 16px half-tiles**, ranks
painted back-to-front for 3D overlap. Units render as **detailed BATTLE sprites** (not portraits, not
map sprites): the `00single_*_blue` player-team art from `Graphics/Animations`, keyed per-class via
`<animation basename>` and resolved by `tools/slice_sprites.py` (symbol/alias → classdown → archetype
→ default; dragons/mounts included). A slot shows the hero's class battle sprite, or a generic unit's
class sprite; empty tiles show a dashed marker. **Generic (unnamed) units** are now placeable via a
"Generic unit" card in the roster (class set through the upgrade tree). Verified in headless Chrome
(desktop + 390px mobile).

## Backlog
### In progress
- (none — P0 complete)
### Next up (P1)
- [ ] High-fidelity effective-stat engine: encode the 12-step assembly (`0924`) — level variance,
      affinity growth bias, homegrown bonus, tier-scaled param_add (×0.8^tierRank), softcaps, equipment.
- [ ] Pull off-tree hero classes (Diana/Beatrix/Zanatus etc.) from `Classes.json` so they get stats.
- [x] Formation cover / block / row-bypass surfaced on the grid (session 2b). TODO: phalanx
      adjacency bonus, wideguard/monarch/protectme/bodyguard trait modifiers, straight-shot cover.
- [ ] Full 85-node tier graph view with the unit's path highlighted.
- [ ] Class-change legality (edges + mastery/req/tech gates) vs. free-sandbox toggle.
- [ ] Save / load / share squads (schema-versioned localStorage).
### Later (P2)
- [ ] Terrain backdrop picker: swap the battlefield battleback (grassland default) among the game's
      other themes — forest / desert / plains / snow / fort / cave / factory / hell — all in the same
      layered skybox+backdrop+ground format in `Graphics/Battlebacks1`; composite each via slice_sprites.py.
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
- 2026-09-12 (session 2): **Hard pivot of the formation view** to mirror the game — replaced the flat
  grid with the 3D-angled `sowgrid.png` stage + exact `0241` tile origins (`SOW_DATA.grid`), swapped
  portraits for **battle sprites** (`00single_*_blue` from Graphics/Animations, keyed per class via
  `<animation basename>`), added `tools/slice_sprites.py` (battle-sprite + grid-art extraction with a
  symbol→classdown→archetype resolver, horizontally flipped to face the enemy) and **generic-unit
  placement**. `build-data.mjs` emits per-hero + per-class `sprite` + the `grid` origins table.
  NOTE: battle sprites are per-CLASS; the small `1mapsprites` sheets are map sprites, NOT used.
- 2026-09-12 (session 2b): **Corrected grid model + cover engine.** A rank is **6 rectangles**; a unit
  is **2 wide** (column 0-4 = left rectangle, occupies {c,c+1}), so units in a rank must be **≥2 cols
  apart → max 3/rank**, placeable at ANY non-overlapping position (adjacent tiles auto-hide). Replaced
  the earlier 3-wide/2-wide toggle with this free-placement rule (`canPlace`, `normalizeSquad`). Added a
  faithful **cover/block/row-bypass engine** (`0462`): a non-front unit is covered (dmg ×0.8) if a
  front ally is within |Δcol| ≤ 1 (light) / ≤ 2 (heavy); front rank uncoverable; heavy reaches all rows
  back. Abilities from archetype sets **or** explicit `<classgroup l*cover/*block>` tags → committed
  `data/classgroups.json`, folded into class/hero records by `build-data.mjs` (+ `SOW_DATA.combat`
  constants). UI: 🛡 badge on covered units, hover-to-highlight whom a unit shields, per-unit tooltip
  with cover/row/block/incoming-damage. Cover math asserted correct via DOM dump.
- 2026-09-12 (session 2c): **Battlefield backdrop** — the formation now renders on the game's own
  grassland battleback (skybox+hills+grass, composited from Graphics/Battlebacks1 by slice_sprites.py
  → `assets/grid/battleback.png`) instead of black. `.battlefield` wrapper frames it; the grid sits low
  on the grass with the magenta sowgrid softened (screen blend, .55 opacity). Verified desktop + mobile.
