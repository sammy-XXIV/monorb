// The Chog Chronicle (client): read a Chog's history; holders sign finished chapters into it.
import { ARENA_URL } from "./config.js";

export const getChronicle = async token => (await fetch(`${ARENA_URL}/chog/${token}`)).json();
export const getJSON = async path => (await fetch(ARENA_URL + path)).json();   // /board, /world, /daily
const hex = s => "0x" + Array.from(new TextEncoder().encode(s), b => b.toString(16).padStart(2, "0")).join("");
export const sign = (wallet, message) => window.ethereum.request({ method: "personal_sign", params: [hex(message), wallet] });
export const holderMessage = (token, code, seat, wallet) => `Monorb Chronicle\nI hold Chog #${token}\nroom ${code}\nseat ${seat}\nwallet ${wallet.toLowerCase()}`;
export async function writeChapter(token, chapter, wallet) {
  const sig = await sign(wallet, `Monorb Chronicle\nChog #${token} finished chapter ${chapter}\nwallet ${wallet.toLowerCase()}`);
  const r = await (await fetch(`${ARENA_URL}/chog/${token}/story`, { method: "POST", body: JSON.stringify({ chapter, wallet, sig }) })).json();
  if (r.error) throw new Error(r.error); return r;
}
const ago = at => { const m = Math.round((Date.now() - at) / 60000); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };
export function chronicleHtml(r) {
  if (!r || (!r.wins && !r.losses && !r.chapters.length)) return `<b>📜 Chronicle</b> — empty. This Chog's story starts with you.`;
  const line = h => h.kind === "daily" ? `🔥 Daily quest done (streak ${h.streak})` : h.kind === "story" ? `Finished chapter ${h.chapter}` : `${h.won ? "Beat" : "Lost to"} Chog #${h.vs.join(", #")}${h.staked ? (h.won ? " · captured their Chog" : " · Chog was captured") : ""}`;
  return `<b>📜 Chronicle</b> · ${r.wins}W ${r.losses}L${r.captured ? ` · captured ${r.captured}` : ""}${r.lostInStake ? ` · lost in stakes ${r.lostInStake}` : ""}`
    + (r.chapters.length ? ` · chapters ${r.chapters.join(", ")}` : "")
    + `<div style="margin-top:4px;font-size:12px">${r.history.slice(0, 3).map(h => `• ${line(h)} <span style="opacity:.6">${ago(h.at)}</span>`).join("<br>")}</div>`;
}
// today's quest + this Chog's progress and streak
export function dailyHtml(q, r) {
  const d = r && r.daily && r.daily.day === q.day ? r.daily : { progress: 0, done: false }, streak = r && r.streak ? r.streak.count : 0;
  return `🔥 <b>Daily:</b> ${q.text} — ${d.done ? "done ✓" : `${d.progress}/${q.goal}`}${streak ? ` · streak ${streak}` : ""}`;
}
export const worldHtml = w => `🌳 <b>Elder Tree</b> restored by everyone: ${w.percent}%<div style="height:8px;border:2px solid #000;border-radius:6px;background:#1a1230;margin-top:3px"><div style="height:100%;width:${w.percent}%;background:linear-gradient(90deg,#7bd36a,#ffd23a);border-radius:4px"></div></div>`;
export function boardHtml(board, mine) {
  if (!board.length) return `<p class="muted">No champions yet. Win an arena match as a holder to claim the top spot.</p>`;
  return `<table style="width:100%;font-size:14px;border-collapse:collapse">` + board.slice(0, 20).map((r, i) =>
    `<tr style="${r.token === mine ? "color:#ffd36a;font-weight:700" : ""}"><td>${i + 1}.</td><td>Chog #${r.token}</td><td>${r.wins}W ${r.losses}L</td><td>${r.captured ? "⚔ " + r.captured : ""}</td><td>${r.chapters.length ? "📖 " + r.chapters.length : ""}</td><td>${r.streak ? "🔥" + r.streak : ""}</td></tr>`).join("") + `</table>`;
}
