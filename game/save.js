// Progress per Chog, in localStorage (or anything with getItem/setItem). Never throws.
const fresh = () => ({ chapter: 1, done: [], flags: {}, badges: [] });

export const saveKey = (contract, tokenId) => `monadverse:${String(contract).toLowerCase()}:${tokenId}`;

export function loadSave(storage, key) {
  try {
    const d = JSON.parse(storage.getItem(key));
    return d && typeof d === "object" ? { ...fresh(), ...d } : fresh();
  } catch { return fresh(); }
}

export function writeSave(storage, key, data) {
  try { storage.setItem(key, JSON.stringify(data)); } catch { /* private window / quota: play on without saving */ }
}
