// apps/mobile/lib/notify.js
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "lc_notifications_v1";
let listeners = [];

/* -------- core helpers -------- */
async function load() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    // normalize + newest first
    const list = (Array.isArray(arr) ? arr : [])
      .map(n => ({
        id: n.id ?? String(n.timestamp ?? Date.now()),
        title: n.title ?? "",
        body: n.body ?? "",
        timestamp: typeof n.timestamp === "number" ? n.timestamp : Date.parse(n.timestamp) || Date.now(),
        read: !!n.read,
        type: n.type ?? "info",
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
    return list;
  } catch {
    return [];
  }
}

async function save(list) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

function emitChange() {
  for (const cb of listeners) {
    try { cb(); } catch {}
  }
}

export function onChange(cb) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter(x => x !== cb);
  };
}

/* -------- public API -------- */
export async function add({ title, body = "", type = "info", timestamp }) {
  const list = await load();
  const item = {
    id: String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8),
    title: title || "Notification",
    body,
    type,
    read: false,
    timestamp: typeof timestamp === "number" ? timestamp : Date.now(),
  };
  const next = [item, ...list];
  await save(next);
  emitChange();
  return next;
}

export async function markAllRead() {
  const list = await load();
  const next = list.map(n => ({ ...n, read: true }));
  await save(next);
  emitChange();
  return next;
}

export async function clearAll() {
  await save([]);
  emitChange();
  return [];
}

/* -------- convenience creators used by MapTracking -------- */
export async function addRatingSubmitted({ driverName }) {
  return add({
    type: "rating",
    title: "Thanks for your rating!",
    body: driverName ? `Your rating for ${driverName} was submitted.` : "Your ride rating was submitted.",
  });
}

export async function addIncidentSubmitted({ categories = [] }) {
  const cats = Array.isArray(categories) ? categories.filter(Boolean) : [];
  const label = cats.length ? cats.join(", ") : "incident";
  return add({
    type: "incident",
    title: "Incident reported",
    body: `We received your report${cats.length ? ` (${label})` : ""}.`,
  });
}

/* expose load for screens */
export { load };
