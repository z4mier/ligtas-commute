// apps/mobile/state/tripStore.js
import { useSyncExternalStore } from "react";

/**
 * Tiny global store for current trip status (ETA, distance, destination).
 * No provider needed; any screen can read/update.
 */
let trip = {
  active: false,
  destName: null,
  etaText: null,
  distanceText: null,
};

const listeners = new Set();

function setTrip(next) {
  trip = { ...trip, ...next };
  listeners.forEach((l) => l());
}

export function startTrip({ destName, etaText, distanceText }) {
  setTrip({
    active: true,
    destName: destName || null,
    etaText: etaText || null,
    distanceText: distanceText || null,
  });
}

export function updateTrip({ etaText, distanceText, destName }) {
  setTrip({
    ...(etaText !== undefined ? { etaText } : {}),
    ...(distanceText !== undefined ? { distanceText } : {}),
    ...(destName !== undefined ? { destName } : {}),
  });
}

export function endTrip() {
  setTrip({ active: false, destName: null, etaText: null, distanceText: null });
}

export function useTrip() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => trip,
    () => trip
  );
}
