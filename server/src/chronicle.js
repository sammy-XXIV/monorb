// The Chog Chronicle: a per-token history that travels with the NFT. Pure, so it can be tested; storage lives in the Chronicle Durable Object.
export const HISTORY = 30;
export const emptyRecord = token => ({ token, wins: 0, losses: 0, captured: 0, lostInStake: 0, chogWon: "0", chapters: [], history: [] });

// ev: { kind: "arena", won, vs: [tokens], staked, matchId? } | { kind: "story", chapter }
export function applyEvent(rec, ev, at = Date.now()) {
  const r = structuredClone(rec);
  if (ev.kind === "arena") {
    if (ev.won) r.wins++; else r.losses++;
    const pot = ev.pot ? BigInt(ev.pot) : 0n;   // $CHOG pot (wei each); 0 = Chog-for-Chog stake
    if (ev.staked && !pot) { if (ev.won) r.captured += ev.vs.length; else r.lostInStake++; }
    if (pot && ev.won) r.chogWon = String(BigInt(r.chogWon || "0") + pot);   // net gain: the opponent's stake
    r.history.unshift({ at, kind: "arena", won: !!ev.won, vs: ev.vs.slice(0, 3), staked: !!ev.staked, ...(ev.matchId ? { matchId: String(ev.matchId) } : {}), ...(pot ? { pot: String(pot) } : {}) });
  } else if (ev.kind === "story") {
    const n = ev.chapter | 0; if (n < 1 || n > 10 || r.chapters.includes(n)) return r;   // each chapter once
    r.chapters.push(n); r.chapters.sort((a, b) => a - b);
    r.history.unshift({ at, kind: "story", chapter: n });
  } else return r;
  r.history.length = Math.min(r.history.length, HISTORY);
  return r;
}

// the texts a holder signs (bound to the token, the wallet and what is being claimed)
export const verifyMessage = (token, code, seat, wallet) => `Monorb Chronicle\nI hold Chog #${token}\nroom ${code}\nseat ${seat}\nwallet ${wallet.toLowerCase()}`;
export const storyMessage = (token, chapter, wallet) => `Monorb Chronicle\nChog #${token} finished chapter ${chapter}\nwallet ${wallet.toLowerCase()}`;

// ---- leaderboard: top Chogs by arena wins (then captures, then chapters) ----
export const BOARD_SIZE = 50;
const score = r => [r.wins, r.captured, r.chapters.length, -r.losses];
const better = (a, b) => { const x = score(a), y = score(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return y[i] - x[i]; return a.token - b.token; };
export function updateBoard(board, rec) {
  const row = { token: rec.token, wins: rec.wins, losses: rec.losses, captured: rec.captured, chapters: rec.chapters, streak: rec.streak ? rec.streak.count : 0 };
  return board.filter(b => b.token !== rec.token).concat(row.wins || row.chapters.length ? [row] : []).sort(better).slice(0, BOARD_SIZE);
}

// ---- shared progress: everyone's play restores the Great Elder Tree ----
export const WORLD_GOAL = 1500;   // hackathon-sized: ~100 matches + chapters restore the tree
export const WORLD_POINTS = { arena: 3, story: 20, daily: 10 };
export const worldPercent = points => Math.min(100, Math.floor(points / WORLD_GOAL * 100));
