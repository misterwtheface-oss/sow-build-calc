#!/usr/bin/env python3
"""
slice_sprites.py — copy the game's BATTLE sprites + formation grid art for the SoW
build calculator, so the formation view mirrors the game's own battle presentation.

Battle sprites (NOT the small map sprites): single-pose, player-blue unit art from
Graphics/Animations, exported as `00single_<size><token>_blue[_huge].png`. The game
keys them to a class via the `<animation basename>` note-tag (0469_ANIMATIONS). A unit's
battle sprite follows its CLASS, so we resolve one sprite per class (heroes then inherit
their class's sprite in-app; off-tree hero classes resolve via class_id below).

Resolution priority for a class (first hit wins), all team _blue:
  1. exact token (symbol / <animation basename> / alias), non-"huge"
  2. classdown chain (nearest ancestor with a sprite), non-"huge"
  3. archetype-representative sprite, non-"huge"
  4. exact token "_huge" variant
  5. default 'soldier'
Prefix "1" = normal unit, "2" = large (dragons/mounts) — both accepted; the "_huge"
export is a big-canvas variant, deprioritised so normal-size units win.

Sources (sibling datamine, gitignored):
  ../_sow_extract/raw/Graphics/Animations/00single_*_blue*.png   (battle sprites)
  ../_sow_extract/raw/Graphics/System/sowgrid*.png               (formation grid)
Local (shipped subset, committed):
  data/Actors.json      — roster heroes (character sheet, class_id)
  data/Classes.json     — <animation basename> per class_id (incl. off-tree hero classes)
  data/classtree.json   — 85 class nodes (symbol/class_id/classdown/archetype)

Outputs (committed, lean subset):
  assets/sprites/class_<symbol>.png   — one battle sprite per classtree class
  assets/sprites/hero_<actorId>.png   — roster hero's class battle sprite (covers off-tree)
  assets/grid/sowgrid*.png

Idempotent. Requires Pillow.
"""
import json, os, re, sys, shutil
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
EXTRACT = os.path.join(ROOT, "..", "_sow_extract")
ANIM = os.path.join(EXTRACT, "raw", "Graphics", "Animations")
SYSTEM = os.path.join(EXTRACT, "raw", "Graphics", "System")
SPRITES_OUT = os.path.join(ROOT, "assets", "sprites")
GRID_OUT = os.path.join(ROOT, "assets", "grid")

# symbol / <animation basename> → file token, for the renamed exports
ALIAS = {
    "firemage": "magefire", "icemage": "mageice", "lightningmage": "magelit",
    "gunner": "rifleman", "siegecannon": "artillery", "cannon": "artillery",
    "fieldcannon": "fieldcannon", "swordmaster2": "swordmaster",
    "bluedragon": "bluedragon", "silverdragon": "silverdragon", "reddragon": "reddragon",
}
# archetype → a representative token that has a battle sprite
ARCHETYPE_TOKEN = {
    "heavy_infantry": "fighter", "light_infantry": "soldier", "archery": "archer",
    "heavy_cavalry": "cavalier", "light_cavalry": "cavalier", "support": "priestess",
    "magician": "apprentice", "firearms": "rifleman", "dragon": "bluedragon",
}
# off-tree hero classes (class_id) → token, for named heroes not in the class tree
HERO_CLASS_TOKEN = {
    66: "paladin", 67: "samurai", 69: "sorceress", 70: "assassin",
    71: "zelos1", 73: "swordmaster", 80: "darkmage",
}

def load_json(rel, base=None):
    with open(os.path.join(base or os.path.join(ROOT, "data"), rel), encoding="utf-8") as f:
        return json.load(f)

def get(d, k):
    return d.get(k, d.get("@" + k))

# ── index available battle-sprite files: token → {plain: path, huge: path} ──
def build_index():
    idx = {}
    if not os.path.isdir(ANIM):
        sys.exit(f"extract not found: {ANIM} (is _sow_extract present?)")
    for f in os.listdir(ANIM):
        m = re.match(r"00single_[12](.+?)_blue(_huge)?\.png$", f)
        if not m:
            continue
        token, is_huge = m.group(1).lower(), bool(m.group(2))
        slot = idx.setdefault(token, {})
        key = "huge" if is_huge else "plain"
        slot.setdefault(key, os.path.join(ANIM, f))  # first match wins (stable)
    return idx

def copy_sprite(src, dst):
    """Copy a battle sprite, horizontally flipped so the player squad faces the enemy."""
    Image.open(src).convert("RGBA").transpose(Image.FLIP_LEFT_RIGHT).save(dst)

def plain(idx, token):
    s = idx.get(token)
    return s.get("plain") if s else None

def huge(idx, token):
    s = idx.get(token)
    return s.get("huge") if s else None

def resolve_class(sym, animbn, archetype, classdown, ct_by_sym, idx, seen=None):
    """Resolve a classtree class to a battle-sprite path via the documented priority."""
    seen = seen or set()
    # 1. exact token (symbol, animation basename, alias), non-huge
    for cand in (sym, animbn, ALIAS.get(sym), ALIAS.get(animbn)):
        if cand and plain(idx, cand):
            return plain(idx, cand)
    # 2. classdown chain
    down = (classdown or [None])[0] if isinstance(classdown, list) else classdown
    if down and down not in seen and down in ct_by_sym:
        seen.add(down)
        d = ct_by_sym[down]
        r = resolve_class(d["symbol"], d.get("animbn"), d.get("archetype"), d.get("classdown"), ct_by_sym, idx, seen)
        if r:
            return r
    # 3. archetype representative
    rep = ARCHETYPE_TOKEN.get(archetype)
    if rep and plain(idx, rep):
        return plain(idx, rep)
    # 4. exact token, huge variant
    for cand in (sym, animbn, ALIAS.get(sym), ALIAS.get(animbn)):
        if cand and huge(idx, cand):
            return huge(idx, cand)
    # 5. default
    return plain(idx, "soldier")

def main():
    idx = build_index()
    classes_ct = load_json("classtree.json")["classes"]
    classes_ct = classes_ct if isinstance(classes_ct, list) else list(classes_ct.values())
    classes_db = load_json("Classes.json", base=os.path.join(EXTRACT, "data"))  # not shipped; from extract
    classes_db = classes_db if isinstance(classes_db, list) else list(classes_db.values())
    actors = [a for a in load_json("Actors.json") if a]

    # class_id → <animation basename>
    animbn_by_id = {}
    for c in classes_db:
        if not c:
            continue
        m = re.search(r"<animation\s+basename\s+([^>\s]+)", str(get(c, "note") or ""), re.I)
        if m:
            animbn_by_id[get(c, "id")] = m.group(1).lower()

    # enrich classtree nodes for the resolver
    for c in classes_ct:
        c["animbn"] = animbn_by_id.get(c["class_id"])
    ct_by_sym = {c["symbol"]: c for c in classes_ct}
    ct_by_id = {c["class_id"]: c for c in classes_ct}

    os.makedirs(SPRITES_OUT, exist_ok=True)
    for f in os.listdir(SPRITES_OUT):
        os.remove(os.path.join(SPRITES_OUT, f))

    # 1) one battle sprite per classtree class
    n_cls = 0
    for c in classes_ct:
        src = resolve_class(c["symbol"], c.get("animbn"), c.get("archetype"), c.get("classdown"), ct_by_sym, idx)
        if src:
            copy_sprite(src, os.path.join(SPRITES_OUT, f"class_{c['symbol']}.png"))
            n_cls += 1

    # 2) roster hero → their class's battle sprite (off-tree classes resolve by class_id)
    n_hero = 0
    seen_names = set()
    for a in actors:
        if not re.search(r"<affinity\s+\w+>", str(get(a, "note") or ""), re.I):
            continue
        name = get(a, "name")
        if name in seen_names:
            continue
        seen_names.add(name)
        cid = get(a, "class_id")
        src = None
        if cid in ct_by_id:                       # in-tree: reuse the class sprite
            c = ct_by_id[cid]
            src = resolve_class(c["symbol"], c.get("animbn"), c.get("archetype"), c.get("classdown"), ct_by_sym, idx)
        else:                                      # off-tree hero class
            tok = HERO_CLASS_TOKEN.get(cid) or animbn_by_id.get(cid)
            src = (plain(idx, tok) or huge(idx, tok)) if tok else None
            if not src:
                src = plain(idx, "soldier")
        if src:
            copy_sprite(src, os.path.join(SPRITES_OUT, f"hero_{get(a, 'id')}.png"))
            n_hero += 1

    # 3) grid art
    for g in ("sowgrid.png", "sowgridbase.png", "sowgridfilled.png"):
        s = os.path.join(SYSTEM, g)
        if os.path.exists(s):
            os.makedirs(GRID_OUT, exist_ok=True)
            shutil.copyfile(s, os.path.join(GRID_OUT, g))

    # 4) battlefield backdrop: composite the grassland battleback (skybox + backdrop + ground)
    # from Graphics/Battlebacks1, the same layers the game stacks behind a squad clash.
    BB = os.path.join(EXTRACT, "raw", "Graphics", "Battlebacks1")
    layers = ["grassland_skybox.png", "grassland_backdrop.png", "grassland_ground.png"]
    imgs = [Image.open(os.path.join(BB, l)).convert("RGBA") for l in layers if os.path.exists(os.path.join(BB, l))]
    if imgs:
        w = max(i.width for i in imgs); h = max(i.height for i in imgs)
        base = Image.new("RGBA", (w, h), (0, 0, 0, 255))
        for im in imgs:
            if im.size != (w, h):
                im = im.resize((w, h))
            base.alpha_composite(im)
        os.makedirs(GRID_OUT, exist_ok=True)
        base.convert("RGB").save(os.path.join(GRID_OUT, "battleback.png"))

    print(f"battle sprites: {n_cls}/{len(classes_ct)} classes, {n_hero} heroes -> {SPRITES_OUT}")
    print(f"grid: copied to {GRID_OUT}")

if __name__ == "__main__":
    main()
