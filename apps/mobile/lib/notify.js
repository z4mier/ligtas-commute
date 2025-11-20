// apps/mobile/lib/notify.js
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_PREFIX = "lc_notifications_v1:";

const subscribers = new Set();

async function getStorageKey() {
  const token = await AsyncStorage.getItem("token");
  return `${KEY_PREFIX}${token || "anon"}`;
}

async function readRaw() {
  try {
    const key = await getStorageKey();
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data;
  } catch (e) {
    console.log("[notify] readRaw error", e);
    return [];
  }
}

async function writeRaw(list) {
  try {
    const key = await getStorageKey();
    await AsyncStorage.setItem(key, JSON.stringify(list));
    // inform listeners (CommuterDashboard)
    subscribers.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.log("[notify] subscriber error", e);
      }
    });
  } catch (e) {
    console.log("[notify] writeRaw error", e);
  }
}

export async function load() {
  return readRaw();
}

export function onChange(cb) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

export async function markAllRead() {
  const list = await readRaw();
  const updated = list.map((n) => ({ ...n, read: true }));
  await writeRaw(updated);
  return updated;
}

/**
 * Helper to push a new notification object
 */
async function baseAddNotification(partial) {
  const list = await readRaw();
  const now = Date.now();

  const item = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    body: "",
    type: "generic",
    read: false,
    timestamp: now,
    ...partial,
  };

  // keep latest 50 only
  const updated = [item, ...list].slice(0, 50);
  await writeRaw(updated);
  return item;
}

/* ------------------------------------------------------------------ */
/* SPECIFIC NOTIFICATIONS                                              */
/* ------------------------------------------------------------------ */

// For rating submitted from TripDetails
export async function addRatingSubmitted({ trip, rating }) {
  const dest = trip?.destLabel || "your stop";
  const title = "Thanks for your rating";
  const body = `You rated your trip to ${dest} as ${rating} ★.`;

  return baseAddNotification({
    type: "rating_submitted",
    title,
    body,
    rideId: trip?.id ?? null,
  });
}

// For incident report submitted from TripDetails
export async function addIncidentSubmitted({ trip }) {
  const dest = trip?.destLabel || "your stop";
  const title = "Issue reported";
  const body = `Your report for the trip to ${dest} has been received.`;

  return baseAddNotification({
    type: "incident_submitted",
    title,
    body,
    rideId: trip?.id ?? null,
  });
}
