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
`<animation basename>` and resolved by `tools/slice_sprites.py` (own-token plain → own-token `_huge`
→ classdown → archetype → default; dragons/mounts included). Sprites & the empty-tile markers anchor
at the tile CENTRE (`SIZED_CENTERS[1]`) + `--sprite-lift` so the model sits inside its cell. **Heroes
use their UNIQUE battle art** (frame-0 of the personal animation atlas), flipped per-hero to face the
enemy like the class sprites. Verified in headless Chrome (desktop + 390px mobile).

**Selector + sprite pass shipped & deployed (2026-09-14, session 4, commit `2d4c0d7`).** Roster is
**generic-class-first, grouped by Tier high→low**, with **Heroes above Tier 4**; only ONE hero per
squad (roster hidden when another slot holds a hero). Selector offers **only obtainable units** — party
heroes (game relationship cast) + classes buildable from a recruit base (BFS over `classup`); NPC/boss
heroes and hero/boss-exclusive classes are dropped. **Depth-3 promotions (Dark Mage/Necromancer) show
as Tier 4** via `displayTier`. Search auto-focus removed. Class sprite mis-resolution fixed (double
`.png.png` indexing, own-`_huge`-before-fallback, canvas trim, Centurion→halberdiergeneral).

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
- [ ] Save / load / share squads (schema-versioned localStorage). (Squad already persists to
      `sowbc.squad`; this is the shareable/multi-slot version.)
### Later (P2)
- [ ] Terrain backdrop picker: swap the battlefield battleback (grassland default) among the game's
      other themes — forest / desert / plains / snow / fort / cave / factory / hell — all in the same
      layered skybox+backdrop+ground format in `Graphics/Battlebacks1`; composite each via slice_sprites.py.
- [ ] Damage simulator (12 presets, 3-trial hit, crit/glancing).
- [ ] **Affinity × Gender build recommender** — surface the optimization matrix from
      `_sow_extract/code/procedural/15_affinity_gender_optimization.md`: per affinity+gender, the
      best T3 class paths, keyed off **effective/scaling stat** (not just promotion gate). Needs the
      not-yet-built machine-readable `data/affinity_gender_paths.json` export.
- [ ] Loyalty / relationship capacity discounts; LXP→Leadership planner.
- [ ] Equipment channel (Weapons/Armors/Items) + conflict tags.
- [ ] Resource-budget planner; collection/ownership.
### Done
- [x] Skeleton scaffolded, P0 flow runnable (2026-09-12).
- [x] Formation battle grid + cover/block/row-bypass engine (session 2/2b).
- [x] Class-upgrade focus navigator + gender lens (session 3).
- [x] Selector overhaul: generic-class-first by Tier, heroes above Tier 4, one-hero limit,
      obtainable-only filtering, depth-3→Tier 4, no auto-focus (session 4).
- [x] Sprites: hero-unique battle art (per-hero flip), tile-centred models, class
      sprite-resolution fixes (double-ext / own-_huge / trim / Centurion alias) (session 4).

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
  DEPLOYED to live Pages (commit 0651661).
- 2026-09-13: **Datamine spec added (feeds calc, not yet wired):**
  `_sow_extract/code/procedural/15_affinity_gender_optimization.md` — affinity×gender → best T3
  class paths. Full 32-T3 assignment matrix + a **gate-stat ≠ effective-stat** layer (match affinity
  to the damage preset's scaling stat): WP classes (xbow/firearms/cannon) are affinity-agnostic for
  damage; `dragon_damage` scales Str+Mag (dark best for all dragons); Paladin/Valkyrie use Str-attack
  + Mag-heal (dark); earth = survivability-only (anvils = Sentinel♂/Paladin♀). Backlog item added
  under P2 (build recommender) — pending a machine-readable `affinity_gender_paths.json` export.
- 2026-09-12 (session 2d): **Planner declutter** — moved the composition-coverage (trait×unit) table
  behind a header **"Composition ▸"** overlay (`openXref`, detail-overlay pattern); removed the grid
  orientation labels (Front/Back), the on-grid leader badge + cover shield 🛡, and the formation legend.
  Cover still conveyed by the subtle glow + hover "who shields whom" + tooltips.
  DEPLOYED to live Pages (commit 7b7e11c).
- 2026-09-13: **Extract-side visual reference added (feeds calc; not the SPA):**
  `_sow_extract/stat_affinity_guide.html` (+ `tools/build_stat_affinity_guide.py`, idempotent). Per the
  56 player-buildable classes: **promotion gate** (`param_req`), **combat scaling stat** (damage preset,
  often ≠ the gate — `15 §3c`), and a six-tile **affinity-fit row** (Great/Good/Neutral/Avoid + gold ★
  on the doc-verified standout). Affinity-fit model = growth-bias signs (`STAT_CONTEXT §3a`) scored vs
  each class's gate + scaling stats; `Avoid` only for a malus on a **damage** stat, gate-only maluses
  stay Neutral-caution. **Combat levers are evidence-based, not archetype-guessed:** `Skill focus` =
  Strength attacker that *also* gates on Skill **or** has `agi param_add ≥15` (Skill = secondary
  hit/evasion/crit ×1.5 layer, shown `2°`); `Triple Shot` = archery fires-3× multi-hit; `WP-scaled` =
  affinity-agnostic offense. Key correction baked in: **Skill *gate* ≠ Skill *scaling*** — Blue Dragon
  gates Skl40 but scales Str+Mag (not Skill-focused); Atk-gated bows (Warbow/**Raider**/Horsebow) are
  pure-Strength attackers (Raider = mounted Warbow), so earth is Neutral not Avoid for them. Also
  clarified this session (from the decompile) that **Weapon Power** = engine param 7 (LUK slot; UI
  "Reputation" vestigial), a class/gear property read straight off the class table with no
  variance/affinity/homegrown growth, feeding `luk_scaled` on every weapon preset — the mechanical basis
  for the WP-scaled = affinity-agnostic rule. **Candidate to fold into the P2 build recommender** (this
  guide's per-class gate/scaling/affinity model overlaps the not-yet-built `affinity_gender_paths.json`).
- 2026-09-13 (session 3): **Class-upgrade overlay → focus navigator + gender lens.** Rebuilt
  `classDetailInner` from a vertical detail page into a 3-column explorer: **◀ Demote to** (classdown)
  / center card / **Promote to ▶** (classup), each neighbour a clickable class node with its **battle
  sprite** (`assets/sprites/class_<id>.png`, classcard fallback), tier, entry `param_req` + resource
  cost, and a ♂/♀/⚥ availability badge; center card keeps the stat curve, traits, param_add, mastery.
  Preserves nav-class navigation + the editing "Assign to unit" flow. Added a **gender lens** (All/♂/♀)
  that filters demote/promote by reachability and notes hidden cross-gender bases (the class-history
  rule, `_sow_extract` doc 15 §2a). **Baked `gavail` into the data pipeline** — `build-data.mjs` now
  tags every class shared/m/f/any by classup-reachability from the gendered bases (23 male / 12 female
  / 11 shared / 39 off-recruit-tree); `app.js` reads the field (client calc kept as fallback). Lens is
  **auto-set from the edited unit**: heroes **lock** to `hero.gender` (no toggle); generics **default**
  from the class's `gavail` but stay toggleable. Styled with the existing palette vars; mobile-first
  (stacks <720px). Verified via headless render (hero-lock + generic-default both correct).
- 2026-09-14 (session 4): **Selector reorg + hero-unique sprites + tile-centred models (5 asks).**
  (1) Roster selector is now **generic-CLASS-first, grouped by Tier, highest→lowest** (T4→T1) — every
  class is a directly-pickable card (`pick-class` sets a generic unit of that class; the single "Generic
  unit ＋" card + its dead CSS/`pick-generic` handler are gone). (2) **Dropped the search-box auto-focus**
  (it stole focus / popped the mobile keyboard). (3) **Sprites & the empty "+" markers now sit centred
  IN their tile**, not floating above it: added `GRID.centers` (`SIZED_CENTERS[1]` from
  `0241_UnitGrid.rb`) to `build-data.mjs`; `pctPos` anchors at the tile centre while depth still orders
  by the foot-origin y; `.grid-slot` centres content via `translate(-50%,-50%)` (foot-drop removed) and
  `.grid-tag` is absolutely positioned so it never shifts the sprite. (4) **Heroes use their UNIQUE
  battle art** — `slice_sprites.py` now lifts frame 0 of each hero's personal animation atlas
  (`HERO_ATLAS`: `<charaaffix>` variants Jules/Sybil/Barnabas/Abigayle/Jaromir/Ragavi + own-name
  Diana/Stefan/Lysander/Beatrix/Zelos/Narima/Raskuja/Zanatus + protagonist `1hero[f]` + Antares/Cadet
  Barnabas); e.g. Jules = archer body, black hair, no helmet. 19/21 regenerated (Kuroda/Edelia keep the
  class sprite — no unique art). (5) **Heroes sit ABOVE Tier 4 but only one hero per squad** — the
  Heroes section is hidden when another slot already holds a hero (`otherHeroActive`). All five verified
  via headless Chrome (formation centring, tier-grouped selector, hero-filter, unique sprites). Data
  hygiene: 0 errors.
- 2026-09-14 (session 4, follow-up): **Sprite orientation + a touch more centring.** (a) Hero sprites
  now face the same way as the class/generic sprites. `copy_sprite` flips class art, so most hero
  atlases (which share the authored orientation — Sybil/Abigayle silhouette-match the raw priestess
  source at IoU 1.000, Ragavi = 1.000 vs its class sprite) are flipped too. A few OWN-ART atlases were
  authored mirrored and are exempted in `HERO_NOFLIP = {13,17,22,90,91}` (Diana — confirmed vs her exact
  Paladin class; Raskuja & Zanatus/variants — confirmed vs matching quadruped/dragon sources). Decisions
  were made by silhouette-IoU, not eyeballing (absolute L/R reads proved unreliable). (b) Added
  `--sprite-lift: 5cqh` to `.formation-stage` so every model/marker sits a little higher — dead-centre
  in its tile. Verified in-app: all 21 heroes + generics face one direction and sit centred.
- 2026-09-14 (session 4, follow-up 2): **Obtainable-only selector + depth-based Tier 4 + more lift.**
  (1) `--sprite-lift` raised 5cqh → **12cqh** (models were still low). (2) **Selector now offers only
  obtainable units.** `build-data.mjs` BFS's promotion depth from the recruit bases (Fighter/Bowman/
  Militia/Medic/**Drakeling**) over classup; a class not reachable = hero/boss/merc-exclusive and gets
  `obtainable:false` (drops 31: Donar line, Risen, Captain/Lord/Strider/Cleric/Infiltrator/Savior,
  Titan/Exemplar/Blademaster/Warcat/Behemoth/Queen of Dragons). Heroes get `obtainable` from the game's
  relationship cast (0225 party set); drops the 6 NPC/boss actors (Zanatus×3, General Ragavi, Captain
  Antares, Cadet Barnabas) → 15 heroes, 54 classes. (3) **Depth-3 classes shown as Tier 4:** each class
  gets `displayTier = depth + 1` (== tier for all but the deep-T3 Dark Mage & Necromancer, reached at
  the 3rd promotion → now grouped in Tier 4 with the Dragon Riders). Selector groups + filters on the
  new fields. Verified in-app (Heroes = 15, Tier 4 = 3 riders + Dark Mage + Necromancer).
- 2026-09-14 (session 4, follow-up 3): **Fixed class battle-sprite mis-resolution.** Several classes
  wrongly borrowed another class's sprite. Two compounding game-file quirks + one resolver ordering bug
  in `slice_sprites.py`: (1) a stray **double `.png.png`** extension on `00single_1necromancer_blue` and
  `00single_1halberdiergeneral_blue` made the index regex skip them (Necromancer fell back to a mage) —
  regex now accepts the optional second `.png`; (2) classes whose ONLY export is the big-canvas
  `_huge` variant (Champion/Knight/Zweihander/Hussar/Scout/Valkyrie/Behemoth/Warcat) were out-ranked by
  the classdown/archetype fallback → all collapsed to the Soldier sprite; `resolve_class` now tries the
  class's own `_huge` art **before** any fallback; (3) `copy_sprite` now trims to the bounding box so
  those `_huge` canvases display at the right size; (4) Centurion has no sprite under its own name, so
  aliased to the matching orphan `halberdiergeneral`. Audited via sprite-hash dedup: no OBTAINABLE class
  shares art anymore; remaining duplicate groups are non-obtainable hero/boss classes (off-selector) or
  intended aliases (dragon riders→dragon, swordmaster2→swordmaster). Verified in-app.
