/*
  build-data.mjs — compiles the Symphony of War datamine subset into data.js
  as `window.SOW_DATA = {...}`, running data-hygiene guardrails first.

  Source (shipped subset, committed under data/):
    data/classtree.json   — 85 class nodes (from _sow_extract, parse_classtree.py)
    data/Actors.json       — RMVXA actor DB (note-tags parsed for the hero roster)

  Usage:  node build-data.mjs           (warnings allowed)
          node build-data.mjs --strict  (warnings promoted to errors)

  Guardrail philosophy (see references/data-hygiene-guardrails.md): resolve every
  cross-reference (classup/classdown symbols, hero->class join, trait refs) and every
  asset path BEFORE writing data.js. Errors leave the last good data.js untouched.

  To refresh from the extract: re-run parse_classtree.py in _sow_extract, then
  `cp ../_sow_extract/data/{classtree,Actors}.json data/` and re-copy the asset subset.
  See WIKI_CONTEXT.md for the full source->ship mapping.
*/
import fs from "node:fs";
import path from "node:path";

// --- config ---
const ACRONYM = "SOW"; // -> window.SOW_DATA
const DATA_DIR = "data";
const ASSETS_DIR = "assets";
const OUT = "data.js";
// --------------

const STRICT = process.argv.includes("--strict");
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);
// icon paths in the data are root-relative and already include "assets/"; resolve them as-is.
const has = (rootRelPath) => fs.existsSync(rootRelPath);

// ── reference tables (all code-certain from the extract) ──
// param_req uses raw engine param ids; only Attack(2)/Magic(4)/Skill(6) gate any class.
const PARAM_LABEL = { 0: "HP", 2: "Attack", 4: "Magic", 6: "Skill" };
// The 6 affinities and their in-game icon filenames (0247_Affinity Minisetup.rb).
const AFFINITIES = [
  { id: "fire",      name: "Fire",      icon: "assets/affinity/affinity_1.png", color: "#d0492a" },
  { id: "earth",     name: "Earth",     icon: "assets/affinity/affinity_2.png", color: "#6a8f3c" },
  { id: "lightning", name: "Lightning", icon: "assets/affinity/affinity_3.png", color: "#e0b93a" },
  { id: "water",     name: "Water",     icon: "assets/affinity/affinity_4.png", color: "#3a78c0" },
  { id: "dark",      name: "Dark",      icon: "assets/affinity/affinity_5.png", color: "#7a4aa0" },
  { id: "light",     name: "Light",     icon: "assets/affinity/affinity_6.png", color: "#e6d68a" },
];
const affinityIds = new Set(AFFINITIES.map((a) => a.id));

// The formation grid, verbatim from 0241_UnitGrid.rb. The game draws the squad on
// sowgrid.png (431×95), a right-skewed 3-rank parallelogram (front rank = high x, on
// the right / enemy-facing; the 5 columns step down the slant at 16px half-tiles).
// GRID.origins[position] is the per-tile foot-origin (bottom-center) for a normal-size
// unit (SIZED_ORIGINS[1]); position = slot index (leader = 0). Sprites anchor there.
const GRID = {
  width: 431,
  height: 95,
  origins: [
    [376, 12], [368, 29], [361, 44], [351, 61], [343, 78], // front rank (row 0)
    [283, 12], [266, 29], [248, 44], [232, 61], [215, 78], // middle rank (row 1)
    [185, 12], [164, 29], [141, 44], [119, 61], [94, 78],  // back rank (row 2)
  ],
};

// Stat display metadata. Keys match classtree stat objects verbatim. Caps are the
// engine's hard clamps (02_stats_scaling.md); combat softcaps are NG+-gated and not
// applied to this base-table view.
const STAT_META = [
  { key: "HP",          label: "HP",          icon: "assets/stat/stat_hp.png" },
  { key: "Attack",      label: "Attack",      icon: "assets/stat/stat_str.png" },
  { key: "Magic",       label: "Magic",       icon: "assets/stat/stat_mag.png" },
  { key: "Skill",       label: "Skill",       icon: "assets/stat/stat_skl.png" },
  { key: "Armor",       label: "Armor",       icon: "assets/stat/stat_armor.png" },
  { key: "WeaponPower", label: "Weapon Pwr",  icon: "assets/stat/stat_weapon.png", cap: 500 },
  { key: "Leadership",  label: "Leadership",  icon: "assets/stat/stat_ldr.png",    cap: 255 },
  { key: "Morale",      label: "Morale",      icon: "assets/stat/stat_power.png" },
];

// Archetype → trait record. Archetype is a real field on every class node; it is the
// primary association channel that the cross-reference matrix surfaces (squad composition).
const ARCHETYPE_TRAITS = {
  heavy_infantry: { name: "Heavy Infantry", color: "#8a5a3c", blurb: "Front-line bruisers; the widest upgrade options and natural cover providers." },
  light_infantry: { name: "Light Infantry", color: "#6a8f5c", blurb: "Agile foot units trading armor for Skill and mobility." },
  archery:        { name: "Archery",        color: "#7a9a3c", blurb: "Ranged bow units that strike from the back rows." },
  heavy_cavalry:  { name: "Heavy Cavalry",  color: "#a0663a", blurb: "Mounted shock troops with high HP and charge power." },
  light_cavalry:  { name: "Light Cavalry",  color: "#c0913a", blurb: "Fast mounted skirmishers and mounted archers." },
  support:        { name: "Support",        color: "#4a90c0", blurb: "Healers and buffers built around Magic and Weapon Power." },
  magician:       { name: "Magician",       color: "#7a4aa0", blurb: "Glass-cannon casters; huge Magic, negligible Armor." },
  firearms:       { name: "Firearms",       color: "#8a6a2a", blurb: "Gunners and cannons — massive Weapon Power, short range." },
  dragon:         { name: "Dragon",         color: "#b0453a", blurb: "The Drakeling→Dragon Rider line; separate mastery curve." },
};
// Cross-archetype role traits, derived from real fields (combatRange, resource_cost, stats).
const ROLE_TRAITS = {
  mounted: { name: "Mounted",  color: "#b5843a", blurb: "Requires a horse or is a cavalry line." },
  ranged:  { name: "Ranged",   color: "#5f9a55", blurb: "Reaches enemies two or more tiles away." },
  caster:  { name: "Caster",   color: "#6f57b0", blurb: "Leans on the Magic stat as its damage source." },
};

// ── load source data ──
function readJSON(rel) {
  const p = path.join(DATA_DIR, rel);
  if (!fs.existsSync(p)) { console.error(`Missing ${p}. See WIKI_CONTEXT.md.`); process.exit(1); }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
const ctRaw = readJSON("classtree.json");
const classNodes = ctRaw.classes && !Array.isArray(ctRaw.classes)
  ? Object.values(ctRaw.classes) : (ctRaw.classes || []);
const cxpLimits = ctRaw.cxp_limits || {};
const actorsRaw = readJSON("Actors.json");
const actors = (Array.isArray(actorsRaw) ? actorsRaw : Object.values(actorsRaw)).filter(Boolean);

// Per-class cover/block ability (keyed by engine class_id), precomputed from the extract:
// archetype sets (0264 LIGHT/HEAVY_COVER/BLOCK_ARCHETYPES) OR explicit <classgroup lightcover/
// heavycover/lightblock/heavyblock> tags. {cl,ch,bl,bh} = can cover/block light/heavy.
const classGroups = readJSON("classgroups.json");
const abilitiesFor = (classId) => {
  const g = classGroups[String(classId)] || {};
  return { cover: { light: !!g.cl, heavy: !!g.ch }, block: { light: !!g.bl, heavy: !!g.bh } };
};

// Resolve a class's card art. Most classes have classcard_<symbol w/o underscores>.png;
// the gendered story-classes (captain_f, lord_m, …) reuse the game's generic tier cards
// (classcard_t{1..3}_{f|m}.png), which is exactly what the game does for them.
function classCard(c) {
  const specific = `assets/classcards/classcard_${c.symbol.replace(/_/g, "")}.png`;
  if (has(specific)) return specific;
  const gm = /_(f|m)$/.exec(c.symbol);
  if (gm && c.tier >= 1 && c.tier <= 3) {
    const gen = `assets/classcards/classcard_t${c.tier}_${gm[1]}.png`;
    if (has(gen)) return gen;
  }
  return null;
}

// Resolve a class's grid sprite (assets/sprites/class_<symbol>.png). Only the ~21
// name-matched base-class templates get a sliced sprite; every other class walks
// classdown to the nearest ancestor that has one, then falls back to an
// archetype-representative sprite so every class shows a thematically-fitting unit.
// Requires classBySymbol populated.
const ARCHETYPE_SPRITE = {
  heavy_infantry: "fighter", light_infantry: "soldier", archery: "archer",
  heavy_cavalry: "cavalier", light_cavalry: "cavalier", support: "priestess",
  magician: "apprentice", firearms: "crossbowman", dragon: "bluedragon",
};
function classSprite(c) {
  const seen = new Set();
  let cur = c;
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    const p = `assets/sprites/class_${cur.id}.png`;
    if (has(p)) return p;
    const down = Array.isArray(cur.classdown) ? cur.classdown[0] : cur.classdown;
    cur = down ? classBySymbol.get(down) : null;
  }
  // fall back to the archetype's representative sprite (which itself resolves via a template)
  const rep = ARCHETYPE_SPRITE[c.archetype];
  if (rep) {
    const repClass = classBySymbol.get(rep);
    if (repClass) {
      const rp = `assets/sprites/class_${rep}.png`;
      if (has(rp)) return rp;
      return classSprite(repClass); // rep resolves via classdown to a real sprite
    }
  }
  return `assets/sprites/class_soldier.png`; // final default (soldier template always exists)
}

function combatMax(cr) { const m = /:(\d+)/.exec(String(cr || "")); return m ? Number(m[1]) : 0; }

// derive the trait id list for a class from its real fields
function deriveTraits(c) {
  const t = [];
  if (ARCHETYPE_TRAITS[c.archetype]) t.push(c.archetype);
  const mounted = (c.resource_cost && "horse" in c.resource_cost) || /cavalry/.test(c.archetype || "");
  if (mounted) t.push("mounted");
  if (combatMax(c.combatrange) >= 2) t.push("ranged");
  const casterMag = (c.stats_L1 && Number(c.stats_L1.Magic) >= 20) || c.archetype === "magician";
  if (casterMag && c.archetype !== "support") t.push("caster");
  return t;
}

// ── build class records ──
const classBySymbol = new Map();
const classById = new Map();
const usedArchetypes = new Set();
const usedRoles = new Set();

const classes = classNodes.map((c) => {
  const traits = deriveTraits(c);
  traits.forEach((t) => (ARCHETYPE_TRAITS[t] ? usedArchetypes : usedRoles).add(t));
  const card = classCard(c);
  const rec = {
    id: c.symbol,
    name: c.name,
    classId: c.class_id,
    tier: c.tier,
    archetype: c.archetype || "",
    moveset: c.moveset_type || "",
    combatRange: c.combatrange || "",
    cxpLimit: c.cxp_limit || 0,
    capacityCost: Number(c.capacitycost) || 0,
    canClassUp: !!c.can_classup,
    classup: c.classup || [],
    classdown: c.classdown || [],
    paramReq: c.param_req || {},
    resourceCost: c.resource_cost || {},
    paramAdd: c.param_add || {},
    statsL1: c.stats_L1 || {},
    statsL20: c.stats_L20 || {},
    statsL50: c.stats_L50 || {},
    growth: c.growth_per_level_1to50 || {},
    description: c.description || "",
    traits,
    ...abilitiesFor(c.class_id),
    icon: has(card) ? card : null,
  };
  if (classBySymbol.has(rec.id)) err(`duplicate class symbol "${rec.id}"`);
  classBySymbol.set(rec.id, rec);
  classById.set(rec.classId, rec);
  if (!rec.icon) warn(`class "${rec.id}" has no class card (${card})`);
  return rec;
});

// second pass (classBySymbol now complete): resolve each class's grid sprite via
// its own template or the nearest classdown ancestor that has one.
let classSpriteCount = 0;
for (const c of classes) {
  c.sprite = classSprite(c);
  if (c.sprite) classSpriteCount++;
  else warn(`class "${c.id}" has no grid sprite (no template up the classdown chain)`);
}

// ── parse the hero roster from actor note-tags ──
function tag(note, re) { const m = re.exec(note || ""); return m ? m[1].trim() : null; }
function parseHero(a) {
  const note = String(a.note || "");
  let aff = tag(note, /<affinity\s+(\w+)>/i);
  if (!aff) return null; // only note-tagged story/recruit heroes make the roster
  aff = aff.toLowerCase();
  if (aff === "darkness") aff = "dark";
  const locked = /<classtree\s+noclasschange>/i.test(note);
  const customTree = tag(note, /<classtree\s+customtree\s+(\w+)>/i);
  const gender = tag(note, /<gender\s+(\w)>/i) || "";
  const innate = [];
  const reT = /<trait\s+add\s+innate\s+([^>]+)>/gi; let mm;
  while ((mm = reT.exec(note))) innate.push(mm[1].trim());
  // portrait candidate: info_<nickname|name>.png (game single-portrait art). The
  // Protagonist uses the gendered generic hero portrait (info_herom/info_herof).
  // Try the raw lowercased name and a space-free variant (the shipped portrait files are
  // renamed space-free so URLs stay clean, e.g. "Captain Antares" -> info_captainantares.png).
  const cands = [a.nickname, a.name].filter(Boolean).flatMap((s) => {
    const low = String(s).toLowerCase();
    return [`assets/portraits/info_${low.replace(/\s+/g, "")}.png`, `assets/portraits/info_${low}.png`];
  });
  if (/^hero$/i.test(a.nickname || "") || /protagonist/i.test(a.name || "")) {
    cands.push(`assets/portraits/info_hero${gender === "f" ? "f" : "m"}.png`);
  }
  const portrait = cands.find(has) || null;
  // battle sprite (assets/sprites/hero_<id>.png): the hero's class battle sprite, resolved
  // by tools/slice_sprites.py from Graphics/Animations (00single_*_blue). Heroes with no
  // resolvable sprite fall back to their class sprite in the app.
  const spritePath = `assets/sprites/hero_${a.id}.png`;
  const sprite = has(spritePath) ? spritePath : null;
  return {
    id: `hero_${a.id}`,
    actorId: a.id,
    name: a.name,
    nickname: a.nickname || "",
    startClassId: a.class_id,
    level: a.initial_level || 1,
    affinity: affinityIds.has(aff) ? aff : "fire",
    gender,
    locked,
    customTree: customTree || null,
    innateTraits: innate,
    portrait,
    sprite,
    ...abilitiesFor(a.class_id),
  };
}

const heroSeen = new Set();
const heroes = [];
for (const a of actors) {
  const h = parseHero(a);
  if (!h) continue;
  // collapse duplicate story appearances of the same name to the first (richest) entry
  if (heroSeen.has(h.name)) continue;
  heroSeen.add(h.name);
  // resolve the hero's starting class to a real node (heroes with off-tree special
  // classes — Medium/General/etc. — keep startClass null and are flagged, not dropped)
  const cls = classById.get(h.startClassId);
  if (cls) h.startClass = cls.id;
  else { h.startClass = null; warn(`hero "${h.name}" class_id ${h.startClassId} not in class tree (special/off-tree class)`); }
  if (!h.portrait) warn(`hero "${h.name}" has no portrait (info_${(h.nickname || h.name).toLowerCase()}.png)`);
  heroes.push(h);
}

// ── build the trait table (association channel) ──
const traits = [];
for (const id of [...usedArchetypes].sort()) traits.push({ id, kind: "archetype", ...ARCHETYPE_TRAITS[id], icon: null });
for (const id of [...usedRoles].sort()) traits.push({ id, kind: "role", ...ROLE_TRAITS[id], icon: null });
const traitIndex = new Map(traits.map((t) => [t.id, t]));

// ── guardrails: resolve every cross-reference ──
for (const c of classes) {
  for (const ref of [...c.classup, ...c.classdown]) {
    if (!classBySymbol.has(ref)) err(`class "${c.id}" -> upgrade target "${ref}" (no such class node)`);
  }
  for (const t of c.traits) {
    if (!traitIndex.has(t)) err(`class "${c.id}" -> trait "${t}" (no such trait record)`);
  }
  for (const k of Object.keys(c.paramReq)) {
    if (!(k in PARAM_LABEL)) warn(`class "${c.id}" param_req uses unmapped param id "${k}"`);
  }
  if (c.icon && !has(c.icon)) err(`class "${c.id}" -> ${c.icon} (missing asset)`);
  if (c.sprite && !has(c.sprite)) err(`class "${c.id}" -> ${c.sprite} (missing asset)`);
}
for (const a of AFFINITIES) if (!has(a.icon)) err(`affinity "${a.id}" -> ${a.icon} (missing asset)`);
for (const s of STAT_META) if (s.icon && !has(s.icon)) warn(`stat "${s.key}" -> ${s.icon} (missing asset)`);
for (const h of heroes) {
  if (h.portrait && !has(h.portrait)) err(`hero "${h.name}" -> ${h.portrait} (missing asset)`);
  if (h.sprite && !has(h.sprite)) err(`hero "${h.name}" -> ${h.sprite} (missing asset)`);
}
const heroSpriteCount = heroes.filter((h) => h.sprite).length;
for (const g of GRID.origins) if (g.length !== 2) err(`GRID.origins entry malformed: ${JSON.stringify(g)}`);
if (GRID.origins.length !== 15) err(`GRID.origins must have 15 entries, has ${GRID.origins.length}`);

// ── hygiene report ──
const assetCount = classes.filter((c) => c.icon).length + heroes.filter((h) => h.portrait).length
  + classSpriteCount + heroSpriteCount + AFFINITIES.length + STAT_META.length;
console.log("── Data hygiene report ──────────────────────────");
console.log(`✓ ${classes.length} classes, ${heroes.length} heroes, ${traits.length} traits, ~${assetCount} assets checked`);
console.log(`  sprites: ${heroSpriteCount}/${heroes.length} heroes, ${classSpriteCount}/${classes.length} classes have a grid sprite`);
if (errors.length) { console.log(`✗ ${errors.length} error(s):`); errors.forEach((e) => console.log(`    ${e}`)); }
if (warnings.length) { console.log(`⚠ ${warnings.length} warning(s):`); warnings.forEach((w) => console.log(`    ${w}`)); }
console.log("─".repeat(50));

const hardErrors = errors.length + (STRICT ? warnings.length : 0);
if (hardErrors) {
  console.error(`BUILD FAILED: ${hardErrors} error(s). ${OUT} left untouched.`);
  process.exit(1);
}

// ── write output ──
const data = {
  classes, heroes, traits,
  affinities: AFFINITIES,
  statMeta: STAT_META,
  paramLabel: PARAM_LABEL,
  cxpLimits,
  grid: GRID,
  // formation combat constants (0264/0462): cover/block column ranges + multipliers.
  // A rank is 6 rectangles; a unit is 2 wide at column 0-4, so |Δcol| is in half-tiles.
  combat: {
    coverMod: 0.8, rowMod: 0.8,          // damage ×0.8 if covered; ×0.8 per occupied rank in front
    coverCol: { light: 1, heavy: 2 },     // covered if a front ally is within this |Δcol|
    block: { fullLimit: 1, halfLimit: 2, fullMult: 0, halfMult: 0.5 }, // targeting-rate mults
    unitWidth: 2, rowRects: 6,            // a unit spans 2 of the row's 6 rectangles
  },
};
fs.writeFileSync(OUT, `window.${ACRONYM}_DATA = ${JSON.stringify(data)};\n`);
console.log(`Wrote ${OUT} (window.${ACRONYM}_DATA): ${classes.length} classes, ${heroes.length} heroes.`);
