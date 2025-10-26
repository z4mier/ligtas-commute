// apps/mobile/locationTask.js
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { API_URL } from "./screens/../constants/config"; // adjust if your paths differ

// Exported constant so screens can refer to the same task name
export const LC_LOCATION_TASK = "LC_LOCATION_TASK";

/**
 * Background location task (runs while app is backgrounded or user left the Map screen).
 * You can enrich this to buffer/flush, detect arrival, etc.
 */
TaskManager.defineTask(LC_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.log("LC_LOCATION_TASK error:", error);
    return;
  }
  const { locations } = data || {};
  if (!locations?.length) return;

  const fix = locations[0];
  try {
    // Optional: send breadcrumb to your backend
    await fetch(`${API_URL}/tracking/ping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: fix.coords.latitude,
        lng: fix.coords.longitude,
        speed: fix.coords.speed,
        heading: fix.coords.heading,
        at: fix.timestamp,
      }),
    });
  } catch {
    // swallow network errors; background task must not crash
  }
});
