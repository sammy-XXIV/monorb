// Chapter 1 story flow: intro talk -> find 3 Time Shards -> back to the Doctor -> escape chase -> portal.
export function createFlow() {
  const f = {
    phase: "intro", shards: new Set(),
    talked() {
      if (f.phase === "intro") f.phase = f.shards.size === 3 ? "return" : "explore";
      else if (f.phase === "return") f.phase = "chase";
    },
    shard(id) { if (f.phase !== "intro" && f.phase !== "explore") return; f.shards.add(id); if (f.shards.size === 3 && f.phase === "explore") f.phase = "return"; },   // pickups before the Doctor talk count too
    portal() { if (f.phase === "chase") f.phase = "complete"; },
    objective() {
      return { intro: "Talk to the Doctor", explore: `Find the Time Shards (${f.shards.size}/3) — swamp, graveyard, ruins`,
               return: "Bring the shards back to the Doctor", chase: "RUN to the time portal!", complete: "Escaped" }[f.phase];
    },
  };
  return f;
}
