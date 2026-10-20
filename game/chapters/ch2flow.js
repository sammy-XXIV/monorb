// Chapter 2 "Back to the Past": win over the future heroes. Moyaki (spices for his brew), Mouch (a speed race through rings),
// Salmonad (his map, blown up the waterfall cliffs). Then everyone gathers at the campfire.
export const NEED = { spice: 3, ring: 5, map: 1 };
const ITEM = { moyaki: "spice", mouch: "ring", salmonad: "map" };

export function createFlow2() {
  const f = {
    phase: "explore", heroes: { moyaki: "idle", mouch: "idle", salmonad: "idle" }, got: { spice: 0, ring: 0, map: 0 },
    ready: id => f.got[ITEM[id]] >= NEED[ITEM[id]],
    // returns the dialogue key to play
    talk(id) {
      const s = f.heroes[id];
      if (s === "done") return `${id}_after`;
      if (f.ready(id)) { f.heroes[id] = "done"; f.check(); return s === "idle" ? `${id}_done_early` : `${id}_done`; }
      if (s === "idle") { f.heroes[id] = "task"; return `${id}_ask`; }
      return `${id}_wait`;
    },
    item(kind) { f.got[kind] = Math.min(NEED[kind], f.got[kind] + 1); },
    reset(kind) { if (f.got[kind] < NEED[kind]) f.got[kind] = 0; },   // race timed out: rings start over (a finished race stays finished)
    check() { if (f.phase === "explore" && Object.values(f.heroes).every(s => s === "done")) f.phase = "gather"; },
    fire() { if (f.phase === "gather") f.phase = "complete"; },
    doneCount: () => Object.values(f.heroes).filter(s => s === "done").length,
    objective() {
      if (f.phase === "gather") return "Everyone's in! Meet at the campfire";
      if (f.phase === "complete") return "Together at last";
      const tasks = [["moyaki", "Spices for Moyaki", "spice"], ["mouch", "Beat Mouch through the rings", "ring"], ["salmonad", "Salmonad's map, up the falls", "map"]]
        .filter(([id]) => f.heroes[id] === "task").map(([, t, k]) => NEED[k] > 1 ? `${t} ${f.got[k]}/${NEED[k]}` : t);
      return tasks.length ? tasks.join(" · ") : `Find the heroes (${f.doneCount()}/3) — camp, glade, falls`;
    },
  };
  return f;
}
