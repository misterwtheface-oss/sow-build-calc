# Symphony of War — Squad Build Calculator — Spec Plan

## Purpose
A theorycraft sandbox for **Symphony of War** players: assemble a squad on the game's 3×5
formation grid, place named heroes, set each unit's class / level / affinity, and read live
squad totals + capacity — while exploring the full class upgrade tree (what a class upgrades
into, what it costs, what stats it gates on) to plan progression before committing in-game.

## Data model
Compiled by `build-data.mjs` from the sibling `_sow_extract` datamine into `window.SOW_DATA`.

- **class** (85 nodes) — `id`(symbol), `name`, `classId`, `tier` (1–4), `archetype`, `moveset`,
  `combatRange`, `cxpLimit` (mastery CXP to advance), `capacityCost`, `classup[]` / `classdown[]`
  (symbols → the upgrade graph edges), `paramReq{}` (stat gate: param id → min), `resourceCost{}`,
  `paramAdd{}` (flat class bonus note-tags), `statsL1/L20/L50{}`, `growth{}`, `description`,
  `traits[]` (derived), `icon` (class card).
- **hero** (21 roster) — `id`, `name`, `nickname`, `startClass` (symbol | null for off-tree
  special classes), `startClassId`, `level`, `affinity`, `gender`, `locked` (noclasschange),
  `customTree`, `innateTraits[]`, `portrait`.
- **trait** (association channel) — `id`, `kind` (`archetype` | `role`), `name`, `color`, `blurb`.
  Archetypes (heavy_infantry, magician, support, …) + cross-archetype roles (mounted, ranged,
  caster) derived from real fields (archetype, combatRange, resource_cost, stats). Colours live on
  the record; banners theme via `--aff-color` / `--aff-text`.
- **affinity** (6) — fire/earth/lightning/water/dark/light, each with icon + colour. A **separate
  per-unit axis** from traits (it biases growth + loyalty/XP), never merged into the trait channel.
- **squad state** — 15 slots (3 rows × 5 cols), slot 0 = leader. Each unit = `{ heroId, classId,
  level, affinity, homegrown }`. Persisted to `localStorage` under `sowbc.squad`.

### Relationships
- A class **upgrades into** its `classup` classes and **reverts to** its `classdown` classes —
  this is the navigable upgrade graph. Entering a class needs: source mastery full (`cxpLimit`),
  the target's `paramReq` stat gate, its `resourceCost`, and a tech-tree tier unlock.
- A hero **starts as** `startClass` and (unless `locked`) can be re-classed along tree edges.
- Squad **capacity** = `max(30, leader Leadership)`; each unit costs ≈ `capacityCost / 10`.

## Architecture
- Stack: vanilla HTML/CSS/JS; data compiled to `window.SOW_DATA` in `data.js`.
- Data flow: `data/{classtree,Actors}.json` → `build-data.mjs` (+ hygiene guardrails) → `data.js` → `app.js`.
- Persistence: `localStorage` under `sowbc.*`.
- UI: build-first (formation grid is the home screen); selection in `#overlay-root`; class tree /
  trait detail in `#detail-overlay-root` (stacked above). Statically sized, scroll-preserving.

## Feature plan (prioritized)
### P0 — baseline (this session; runnable + testable)
- [x] 3×5 formation grid home screen, leader slot marked, localStorage persistence.
- [x] Roster selector overlay (21 heroes, searchable, statically sized, scroll-preserving).
- [x] Per-unit editor: level slider, affinity picker, class via the tree, remove.
- [x] Squad summary: capacity bar (leader Leadership) + aggregate power stat grid.
- [x] Class upgrade-tree detail: reqs / cost / mastery / param_add / stat curve + navigable
      classup/classdown chips; "assign class to unit" when editing.
- [x] Trait × unit cross-reference matrix (archetype + role coverage).
- [x] Data-hygiene guardrails in `build-data.mjs` (dangling upgrade targets, trait refs, assets, dup ids).

### P1 — core value (next sessions)
- [ ] **High-fidelity effective-stat engine**: the 12-step assembly (`0924`) — level variance,
      affinity growth bias, "homegrown" bonus, tier-scaled `param_add` (×0.8^tierRank), softcaps
      (Str/Armor/Mag 30 NG+-gated, WP 500, LDR 255), equipment. Replaces the P0 table-curve metric.
- [ ] **Formation combat effects**: row bypass (×0.8^rows), cover (classgroups), block/aggro,
      phalanx adjacency bonus — surfaced on the grid.
- [ ] **Full tier graph view** of all 85 nodes (T1→T4) with the current unit's path highlighted.
- [ ] Class-change **legality** (only along edges, mastery/req/tech gates enforced) vs. free sandbox toggle.
- [ ] Save / load / share squads (schema-versioned).

### P2 — nice-to-have
- [ ] **Damage simulator**: 12 formula presets, 3-trial hit roll, crit ×1.5 / glancing ×0.4.
- [ ] Loyalty / relationship capacity discounts; LXP→Leadership growth planner.
- [ ] Resource-budget planner across a full army; collection/ownership.
- [ ] Equipment (Weapons/Armors/Items) as an extra contribution channel + conflict tags.

## Open questions
- Effective-stat parity: encode `0924` assembly exactly; reconcile `param_add` tier-scaling.
- `capacityCost / 10` heuristic for per-unit cost — confirm against `08_formation.md` constants
  (dragons 15, risen 8, loyalty/relationship discounts).
- Off-tree hero classes (Diana/Beatrix/Zanatus etc., class_id ∉ tree) — pull their stats from
  `Classes.json` directly so they get a stat table too.
- Param 7 label "Reputation" vs "Weapon Power" (extract open question) — labels currently use WP.
