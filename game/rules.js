// What a Chog's traits do in the game (looks are handled in chog.js).
const HITS = { Common: 3, Uncommon: 4, Rare: 5, Epic: 6, Legendary: 7 };

export function rulesFor(t = {}) {
  const eyes = (t.Eyes || "").toLowerCase();
  return {
    maxHits: HITS[t.Tier] ?? 3,
    revive: !!t.Aura && t.Aura !== "Clean",
    ability: /laser|glass|visor|vr/.test(eyes) ? "beam" : t.Head ? "dash" : "shield",
    secret: t.Form === "Skull" || t.Base === "Radioactive" || t.Base === "1:1",
    side: t.Side === "Left" ? "L" : "R",
  };
}
