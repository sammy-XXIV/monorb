// Daily arena quest: one per UTC day for everyone, checked by the server (it ran the fights). Completing on consecutive days builds a streak.
export const QUESTS = [
  { id: "win1", text: "Win an arena match", stat: "matchWins", goal: 1 },
  { id: "ko2", text: "Knock 2 Chogs off the platform with spins", stat: "kos", goal: 2 },
  { id: "flawless", text: "Win a match without falling once", stat: "flawless", goal: 1 },
  { id: "rounds5", text: "Win 5 rounds", stat: "roundsWon", goal: 5 },
  { id: "play3", text: "Play 3 arena matches", stat: "matches", goal: 3 },
];
export const dayKey = ms => new Date(ms).toISOString().slice(0, 10);
export function questFor(day) { let h = 7; for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0; return QUESTS[h % QUESTS.length]; }
export const matchStats = p => ({ matches: 1, matchWins: p.won ? 1 : 0, kos: p.kos | 0, flawless: p.won && !p.falls ? 1 : 0, roundsWon: p.roundsWon | 0 });

// returns { rec, completed } (rec is a new object)
export function applyDaily(rec, stats, now = Date.now(), quest = questFor(dayKey(now))) {
  const r = structuredClone(rec), day = dayKey(now);
  r.streak ??= { count: 0, lastDay: null };
  if (!r.daily || r.daily.day !== day) r.daily = { day, quest: quest.id, text: quest.text, goal: quest.goal, progress: 0, done: false };
  if (r.daily.done) return { rec: r, completed: false };
  r.daily.progress = Math.min(quest.goal, r.daily.progress + (stats[quest.stat] || 0));
  if (r.daily.progress < quest.goal) return { rec: r, completed: false };
  r.daily.done = true;
  r.streak = { count: r.streak.lastDay === dayKey(now - 864e5) ? r.streak.count + 1 : 1, lastDay: day };
  return { rec: r, completed: true };
}
