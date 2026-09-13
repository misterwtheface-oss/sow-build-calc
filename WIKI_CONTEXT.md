# Symphony of War — Wiki / Context Tree

LLM-oriented context for a future session. Explains the game enough to reason about the data,
and documents the datamine pipeline so data can be refreshed without re-deriving it.

## Game basics
Symphony of War: The Nephilim Saga is a **squad-based tactical RPG** (RPG Maker VX Ace / Ruby on
mkxp-z). You command an army of **squads**; each squad is up to 15 units on a **3×5 formation
grid** with a **leader** whose Leadership stat sets the squad's capacity. Units belong to a
**class** and advance up a **class upgrade tree** (Tier 1 → Tier 4) by filling a mastery bar
(CXP), meeting a stat gate, paying resources, and unlocking the tech tier. This calculator models
squad assembly + the class tree.

## Key mechanics (for the calculator)
- **Formation grid**: positions 0–14 = 3 rows × 5 cols (row = pos/5, col = pos%5). Leader = pos 0.
  Positional combat effects (P1): row bypass (dmg ×0.8^rows-in-front), cover (×0.8, from
  classgroups), block (aggro ×0/×0.5), phalanx (+adjacent-ally Armor/Weapon Power).
- **Capacity**: squad size = `max(30, leader Leadership)`; per-unit cost ≈ 10 (−loyalty −relationship;
  dragons 15, risen 8). Leadership grows only via LXP, not normal level-ups.
- **Class upgrade tree** (85 nodes): upgrade needs source **mastery full** (`cxp_limit`: T1 500 /
  T2 3000 / T3 4500; dragon line separate), the target's **stat gate** (`param_req`; only
  Attack(2)/Magic(4)/Skill(6) gate anything), a **resource cost**, and a **tech-tier unlock**.
  **Class-down is free.** Filling a T3/rider mastery bar allows **gold-plating** (+0.15 growth mult).
- **Stats**: two stacked components — the shared **base class-table growth** (many physical classes
  share one curve) + **tier-scaled `param_add`** (the real differentiator; `def`/`armor` both hit
  Armor). Effective stat then runs a 12-step assembly (`0924`) with level variance, affinity bias,
  "homegrown" bonus, softcaps, equipment. **P0 uses only table-curve + flat param_add** — the full
  assembly is P1.
- **8 params are repurposed**: MMP→Morale, MDF→Leadership, LUK→Weapon Power. (Extract open question:
  param 7 label "Reputation" in System.terms vs "Weapon Power" in combat code — we use Weapon Power.)
- **Affinities** (6: fire/earth/lightning/water/dark/light): bias stat GROWTH per level + loyalty/XP
  + a small weather/day-night combat bonus. **Elemental damage matchup is DISABLED.** Affinity is a
  per-unit axis, changeable in-game; heroes start with a fixed one. Icon order: fire=1, earth=2,
  lightning=3, water=4, dark=5, light=6.
- **Named heroes** author their config via note-tags in the actor DB: `<affinity X>`,
  `<classtree noclasschange | customtree NAME>`, `<gender f>`, `<trait add innate X>`. Some heroes
  use **special classes not in the 85-node tree** (Diana/Beatrix/Zanatus etc.) — flagged, kept with
  `startClass: null` (no stat table until we pull their class from `Classes.json`, a P1 item).

## Data sources & datamine access
- **Datamine workspace**: `../_sow_extract/` — NOT shipped (gitignored). Entry: `_sow_extract/CONTEXT_MAP.md`.
- **Shipped source subset** (committed here under `data/`):
  - `data/classtree.json` ← `_sow_extract/data/classtree.json` (85 nodes; from `tools/parse_classtree.py`,
    which reads `CLASSTREE_ASSOC` in `0279_ClassTrees.rb` + the `@params` Tables in `Classes.json`).
  - `data/Actors.json` ← `_sow_extract/data/Actors.json` (RMVXA actor DB; note-tags parsed here for the roster).
- **How to (re)generate**:
  1. In `_sow_extract`: `py tools/parse_classtree.py` (refreshes `classtree.json`/`.csv`);
     `py tools/decode_data.py` (refreshes `data/*.json`).
  2. `cp ../_sow_extract/data/classtree.json ../_sow_extract/data/Actors.json data/`
  3. Re-copy the asset subset (see below), then `node build-data.mjs`.
- **Asset subset** (copied into `assets/`, from `_sow_extract/raw/Graphics/System/`):
  - `assets/classcards/classcard_*.png` — per-class card art (naming: `classcard_<symbol w/o underscores>`;
    gendered story-classes fall back to `classcard_t{tier}_{f|m}`).
  - `assets/portraits/info_*.png` — hero portraits (`info_<nickname|name>`; Protagonist → `info_hero{m|f}`).
  - `assets/stat/stat_*.png`, `assets/affinity/affinity_1..6.png`, `assets/ui/` (formation + leader art).

## What ships vs. gitignored
- **SHIPPED**: `data/classtree.json`, `data/Actors.json`, `assets/**` (the copied subset), `data.js`,
  and all app code (`index.html`, `styles.css`, `app.js`, `build-data.mjs`, `tools/serve.mjs`).
- **GITIGNORED**: the entire `../_sow_extract/` workspace (raw archive unpack, decoded scripts, full
  Graphics export, per-subsystem procedural docs). If the SPA doesn't load it at runtime, it stays out.

## Data model reference
`window.SOW_DATA = { classes[], heroes[], traits[], affinities[], statMeta[], paramLabel{}, cxpLimits{} }`.
Field-by-field shapes are in `SPEC_PLAN.md → Data model`. Canonical stat keys (verbatim from the
class table): `HP, Attack, Magic, Skill, Armor, WeaponPower, Leadership, Morale`. `param_add` note-tag
keys map: `mhp→HP, atk→Attack, mat→Magic, def→Armor, armor→Armor, weapon_power→WeaponPower, skl→Skill`
(unmapped keys like `agi` shown raw in the class detail, not folded into the 8-stat table).
