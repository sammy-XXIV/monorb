// Bonk Arena connection: join a room, send inputs, receive lobby updates and server snapshots.
import { ARENA_URL } from "./config.js";

export async function newRoomCode() { return (await (await fetch(ARENA_URL + "/new")).json()).code; }

export function joinRoom(code, hello, on) {
  const ws = new WebSocket(ARENA_URL.replace(/^http/, "ws") + "/room/" + code);
  ws.onopen = () => ws.send(JSON.stringify({ t: "hello", ...hello }));
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } on(m); };
  ws.onclose = () => on({ t: "closed" });
  const send = m => ws.readyState === 1 && ws.send(JSON.stringify(m));
  return { send, close: () => ws.close() };
}
