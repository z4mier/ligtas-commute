// apps/mobile/screens/MapTracking.js
import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Keyboard, Modal,
  TextInput as RNTextInput, Platform, Animated, Easing
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_URL } from "../constants/config";
import { WebView } from "react-native-webview";
import { useNavigation } from "@react-navigation/native";
import { addRatingSubmitted, addIncidentSubmitted } from "../lib/notify";

/* ---------- theme ---------- */
const C = {
  brand: "#0B132B",
  text: "#111827",
  sub: "#6B7280",
  hint: "#9CA3AF",
  white: "#FFFFFF",
  card: "#FFFFFF",
  page: "#FFFFFF",
  border: "#E5E7EB",
  blueTrail: "#60A5FA",
  darkGlass: "rgba(17,24,39,0.92)",
  tealDot: "#10B981",
  destPin: "#E11D48",
  blue: "#2563EB",
};

/* DEV – show Sim button */
const SHOW_SIM = true;

/* Street View (via JS API inside WebView) */
const GMAPS_JS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_JS_KEY || "";

/* ---------- Background tracking task ---------- */
const BG_TASK = "LC_TRACK_TASK";
let BG_TASK_DEFINED = false;
try {
  if (!BG_TASK_DEFINED) {
    TaskManager.defineTask(BG_TASK, ({ error }) => {
      if (error) return;
    });
    BG_TASK_DEFINED = true;
  }
} catch {}

async function startBackgroundTracking() {
  try {
    const bgPerm = await Location.getBackgroundPermissionsAsync();
    if (bgPerm.status !== "granted") {
      const req = await Location.requestBackgroundPermissionsAsync();
      if (req.status !== "granted") return;
    }
    const started = await Location.hasStartedLocationUpdatesAsync(BG_TASK);
    if (!started) {
      await Location.startLocationUpdatesAsync(BG_TASK, {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 1500,
        distanceInterval: 3,
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false,
        foregroundService: {
          notificationTitle: "LigtasCommute",
          notificationBody: "Navigation tracking in progress",
        },
      });
    }
  } catch {}
}
async function stopBackgroundTracking() {
  try {
    const started = await Location.hasStartedLocationUpdatesAsync(BG_TASK);
    if (started) await Location.stopLocationUpdatesAsync(BG_TASK);
  } catch {}
}

/* ---------- utils ---------- */
function decodePolyline(str) {
  let index = 0, lat = 0, lng = 0, coordinates = [];
  while (index < str.length) {
    let b, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1; lat += dlat;
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1; lng += dlng;
    coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return coordinates;
}
const haversine = (a, b) => {
  const R = 6371e3;
  const φ1 = (a.latitude * Math.PI) / 180;
  const φ2 = (b.latitude * Math.PI) / 180;
  const dφ = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dλ = ((b.longitude - a.longitude) * Math.PI) / 180;
  const x = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const cleanPlaceName = (s) => {
  if (!s) return "";
  let t = s
    .replace(/[+]/g, " ")
    .replace(/^[\s+–—-]+/, "")
    .replace(/\b\d+[A-Za-z-]*\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/^,|,$/g, "")
    .trim();
  return t;
};
function bearingTo(a, b) {
  const φ1 = (a.latitude * Math.PI) / 180;
  const φ2 = (b.latitude * Math.PI) / 180;
  const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  let θ = (Math.atan2(y, x) * 180) / Math.PI;
  if (θ < 0) θ += 360;
  return θ;
}

/* Street View HTML for WebView */
function streetViewHTML(apiKey) {
  return `
<!doctype html>
<html>
<head>
<meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no, width=device-width">
<style>
html,body,#p{height:100%;margin:0}
#hud{position:absolute;left:12px;bottom:12px;right:12px;display:flex;gap:8px;justify-content:space-between;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.chip{background:rgba(0,0,0,.5);padding:8px 10px;border-radius:10px;font-weight:700}
</style>
<script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=quarterly"></script>
</head>
<body>
<div id="p"></div>
<div id="hud"><div id="pos" class="chip">Locating…</div><div id="dir" class="chip">Heading: —°</div></div>
<script>
let pano=null;
function init(lat,lng,heading){
  const sv=new google.maps.StreetViewService();
  const loc={lat,lng};
  const create=(position)=>{
    pano=new google.maps.StreetViewPanorama(document.getElementById('p'),{
      position, pov:{heading:heading||0,pitch:0}, zoom:1,
      motionTracking:false,motionTrackingControl:false,addressControl:false,
      linksControl:true,panControl:false,fullscreenControl:false,enableCloseButton:false
    });
    document.getElementById('pos').textContent=position.lat.toFixed(5)+", "+position.lng.toFixed(5);
    document.getElementById('dir').textContent="Heading: "+Math.round(heading||0)+"°";
  };
  sv.getPanorama({location:loc,radius:100,source:'outdoor'},(data,status)=>{
    if(status==='OK'&&data&&data.location&&data.location.latLng){
      const p=data.location.latLng; create({lat:p.lat(),lng:p.lng()});
    }else create(loc);
  });
}
function update(lat,lng,heading){
  if(!pano){init(lat,lng,heading);return;}
  const pos={lat,lng}; pano.setPosition(pos);
  if(typeof heading==='number'&&!Number.isNaN(heading)){const pov=pano.getPov(); pov.heading=heading; pano.setPov(pov);}
  document.getElementById('pos').textContent=pos.lat.toFixed(5)+", "+pos.lng.toFixed(5);
  document.getElementById('dir').textContent="Heading: "+Math.round(heading||0)+"°";
}
document.addEventListener('message',e=>{try{const m=JSON.parse(e.data||'{}');if(m.type==='init')init(m.lat,m.lng,m.heading||0);if(m.type==='update')update(m.lat,m.lng,m.heading||0);}catch(e){}});
</script>
</body>
</html>`;
}

/* ---------- screen ---------- */
export default function MapTracking({ route }) {
  const insets = useSafeAreaInsets();
  const driver = route?.params?.driver || null;
  const navigation = useNavigation();

  const mapRef = useRef(null);
  const watchRef = useRef(null);

  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [recents, setRecents] = useState([]);

  const [origin, setOrigin] = useState(null);
  const [originText, setOriginText] = useState("Getting location…");
  const [dest, setDest] = useState(null);

  const [devicePos, setDevicePos] = useState(null);
  const [heading, setHeading] = useState(0);
  const [routeCoords, setRouteCoords] = useState([]);
  const [eta, setEta] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [navMode, setNavMode] = useState(false);
  const [steps, setSteps] = useState([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState("");

  // Speed (km/h)
  const [speedKmh, setSpeedKmh] = useState(null);

  // Trip stats
  const [tripStartAt, setTripStartAt] = useState(null);
  const [tripDistance, setTripDistance] = useState(0);
  const [lastPoint, setLastPoint] = useState(null);
  const [lastUpdateAt, setLastUpdateAt] = useState(null);

  // Arrived & rating
  const [arrivedSheet, setArrivedSheet] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [rateDriver, setRateDriver] = useState(0);
  const [rateVehicle, setRateVehicle] = useState(0);
  const [rateNotes, setRateNotes] = useState("");
  const [thanksOpen, setThanksOpen] = useState(false);

  // After success modal route
  const [afterThanks, setAfterThanks] = useState("stay");

  // Report (MULTI-SELECT)
  const CATEGORY_OPTIONS = ["Reckless Driving","Overloading","Overcharging","Harassment","Other"];
  const [reportCats, setReportCats] = useState([]);
  const [reportNotes, setReportNotes] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  // NOTIF wiring
  const [lastAction, setLastAction] = useState(null);        // "rating" | "incident" | null
  const [lastReportCats, setLastReportCats] = useState([]);  // snapshot of categories

  // Sim
  const [simulating, setSimulating] = useState(false);
  const simRef = useRef(false);
  useEffect(() => { simRef.current = simulating; }, [simulating]);

  // Street View
  const [showStreet, setShowStreet] = useState(false);
  const webRef = useRef(null);
  const streetHTML = streetViewHTML(GMAPS_JS_KEY);
  const sendToStreet = (payload) => { try { webRef.current?.postMessage(JSON.stringify(payload)); } catch {} };

  /* ---------- ANIM: pulsing dot (nav on) ---------- */
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (navMode) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(0);
    }
  }, [navMode, pulse]);

  const pulseStyle = {
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
  };

  /* ---------- camera helpers ---------- */
  const lastCameraAt = useRef(0);
  const lastCamCenter = useRef(null);
  function animateCameraFollow(center, hdg = 0, zoom = 18.2) {
    const now = Date.now();
    if (now - lastCameraAt.current < 600) return;
    const movedEnough =
      !lastCamCenter.current || haversine(lastCamCenter.current, center) > 6;
    const headingDiff =
      typeof hdg === "number" && typeof animateCameraFollow._h === "number"
        ? Math.abs(hdg - animateCameraFollow._h)
        : 999;
    if (!movedEnough && headingDiff < 10) return;

    mapRef.current?.animateCamera(
      { center, heading: Number.isFinite(hdg) ? hdg : 0, pitch: 65, zoom },
      { duration: 450 }
    );
    lastCamCenter.current = center;
    animateCameraFollow._h = hdg;
    lastCameraAt.current = now;
  }
  animateCameraFollow._h = 0;

  const animateTo = (coord, opts = { latitudeDelta: 0.04, longitudeDelta: 0.04 }) => {
    if (!coord) return;
    setTimeout(() => mapRef.current?.animateToRegion({ ...coord, ...opts }, 500), 60);
  };

  /* ---------- geo helpers ---------- */
  const reverseGeocode = async (coord) => {
    try {
      const list = await Location.reverseGeocodeAsync(coord);
      if (!list?.length) return null;
      const a = list[0];
      return [a.name, a.street, a.subregion, a.city].filter(Boolean).join(", ");
    } catch { return null; }
  };

  /* ---------- init ---------- */
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setError("Location permission denied."); setOriginText("Permission required"); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const cur = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setDevicePos(cur);
      setHeading(pos.coords.heading ?? 0);
      const label = (await reverseGeocode(cur)) || "Current location";
      setOrigin({ ...cur, name: label });
      setOriginText(label);
      animateTo(cur);
    })();
  }, []);

  /* ---------- autocomplete ---------- */
  useEffect(() => {
    if (!showSuggest) return;
    if (search.trim().length < 2) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        setFetching(true);
        const r = await fetch(`${API_URL}/maps/autocomplete?q=${encodeURIComponent(search)}`);
        const j = await r.json();
        if (j?.status && j.status !== "OK") setError(j?.error_message || j?.status);
        setSuggestions(j?.predictions || []);
      } catch { setError("Autocomplete failed."); }
      finally { setFetching(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [search, showSuggest]);

  const fetchPlace = async (place) => {
    try {
      const r = await fetch(`${API_URL}/maps/place?id=${encodeURIComponent(place.place_id)}`);
      const j = await r.json();
      const l = j?.location;
      if (!l) return null;
      return { latitude: l.lat, longitude: l.lng, name: j?.name || place.description };
    } catch { setError("Failed to fetch location details."); return null; }
  };

  const fitRoute = (o, d, coords) => {
    if (!o || !d) return;
    const pts = coords?.length ? coords : [o, d];
    mapRef.current?.fitToCoordinates(pts, {
      edgePadding: { top: 160, right: 60, bottom: 260, left: 60 },
      animated: true,
    });
  };

  /* Throttled directions */
  const lastDirectionsAt = useRef(0);
  const fetchDirections = async (o, d, force = false) => {
    const now = Date.now();
    if (!force && now - lastDirectionsAt.current < 5000) return;
    lastDirectionsAt.current = now;

    try {
      const r = await fetch(
        `${API_URL}/maps/directions?origin=${o.latitude},${o.longitude}&destination=${d.latitude},${d.longitude}&mode=driving`
      );
      const data = await r.json();
      if (data?.status && data.status !== "OK") {
        setError(data?.error_message || data?.status);
        setRouteCoords([]); setEta(null); setSteps([]); setStepIdx(0);
        return;
      }
      const route0 = data?.routes?.[0];
      const leg0 = route0?.legs?.[0];
      const encoded = route0?.overview_polyline?.points;
      const coords = encoded ? decodePolyline(encoded) : [];
      setRouteCoords(coords);
      setEta({ durationText: leg0?.duration?.text || "—", distanceText: leg0?.distance?.text || "—" });

      const rawSteps = leg0?.steps || [];
      const simple = rawSteps.map((s) => ({
        start_location: s.start_location ? { latitude: s.start_location.lat, longitude: s.start_location.lng } : null,
        end_location: s.end_location ? { latitude: s.end_location.lat, longitude: s.end_location.lng } : null,
        distanceText: s.distance?.text || "",
        html: s.html_instructions || "",
        maneuver: s.maneuver || "",
        road: s?.name || s?.summary || "",
      }));
      setSteps(simple);
      setStepIdx(0);

      if (!navMode) fitRoute(o, d, coords);
    } catch { setError("Directions failed."); }
  };

  /* ---------- navigation ---------- */
  const startNavigation = async () => {
    if (!dest) return;

    let startFrom = devicePos;
    if (!startFrom) {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      startFrom = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setDevicePos(startFrom);
      setHeading(pos.coords.heading ?? 0);
    }
    const label = (await reverseGeocode(startFrom)) || "Current location";
    setOrigin({ ...startFrom, name: label });
    setOriginText(label);

    animateCameraFollow(startFrom, heading, 18.2);

    await fetchDirections(startFrom, dest, true);
    setNavMode(true);
    setTripStartAt(Date.now());
    setTripDistance(0);
    setLastPoint(startFrom);
    setLastUpdateAt(Date.now());
    setSpeedKmh(null);

    startBackgroundTracking().catch(() => {});

    if (GMAPS_JS_KEY) {
      setShowStreet(true);
      setTimeout(() => {
        const hdgToDest = dest ? bearingTo(startFrom, dest) : (heading || 0);
        sendToStreet({ type: "init", lat: startFrom.latitude, lng: startFrom.longitude, heading: hdgToDest });
      }, 300);
    }

    if (watchRef.current) watchRef.current.remove?.();
    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 1400, distanceInterval: 3 },
      async (pos) => {
        const cur = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        const hdg = typeof pos.coords.heading === "number" ? pos.coords.heading : heading ?? 0;

        let s = pos.coords.speed;
        const now = Date.now();
        if ((!Number.isFinite(s) || s === null) && lastPoint && lastUpdateAt) {
          const dt = (now - lastUpdateAt) / 1000;
          if (dt > 0) s = haversine(lastPoint, cur) / dt; // m/s
        }
        const kmh = Number.isFinite(s) && s !== null ? Math.max(0, Math.round(s * 3.6)) : null;
        setSpeedKmh(kmh);
        setLastUpdateAt(now);

        setDevicePos(cur);
        setHeading(hdg);
        setOrigin((prev) => ({ ...(prev || {}), ...cur }));
        setBreadcrumbs((p) => [...p.slice(-120), cur]);

        if (lastPoint) setTripDistance((d) => d + haversine(lastPoint, cur));
        setLastPoint(cur);

        const stopped = kmh !== null ? kmh < 2 : false;
        animateCameraFollow(cur, hdg, stopped ? 18.0 : 18.2);

        fetchDirections(cur, dest);

        if (showStreet && dest) {
          const hdgToDest = bearingTo(cur, dest);
          sendToStreet({ type: "update", lat: cur.latitude, lng: cur.longitude, heading: hdgToDest });
        }

        const d = haversine(cur, dest);
        if (d < 50) endNavigation(true);
      }
    );
  };

  const endNavigation = (arrived = false) => {
    setNavMode(false);
    if (watchRef.current) watchRef.current.remove?.();
    watchRef.current = null;
    stopBackgroundTracking().catch(() => {});
    if (arrived) {
      setArrivedSheet(true);
    }
    setShowStreet(false);
  };

  /* reset everything and go dashboard */
  const resetTrackingState = () => {
    try { watchRef.current?.remove?.(); } catch {}
    watchRef.current = null;
    stopBackgroundTracking().catch(() => {});
    setNavMode(false);
    setShowStreet(false);
    setReportOpen(false);
    setSimulating(false);
    setDest(null);
    setRouteCoords([]);
    setEta(null);
    setSteps([]);
    setStepIdx(0);
  };
  const goDashboard = () => {
    resetTrackingState();
    navigation.reset({ index: 0, routes: [{ name: "CommuterDashboard" }] });
  };

  const recenterToUser = async () => {
    let cur = devicePos;
    if (!cur) {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      cur = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setDevicePos(cur);
      setHeading(pos.coords.heading ?? heading ?? 0);
    }
    const label = (await reverseGeocode(cur)) || "Current location";
    setOrigin({ ...cur, name: label });
    setOriginText(label);
    if (navMode) animateCameraFollow(cur, heading, 18.2);
    else animateTo(cur);

    if (showStreet && dest) {
      const hdgToDest = bearingTo(cur, dest);
      sendToStreet({ type: "update", lat: cur.latitude, lng: cur.longitude, heading: hdgToDest });
    }
  };

  useEffect(() => () => { if (watchRef.current) watchRef.current.remove?.(); }, []);

  const onLongPress = (e) => {
    const coord = e.nativeEvent.coordinate;
    const pinned = { ...coord, name: "Pinned destination" };
    setDest(pinned);
    setSearch(pinned.name);
    setShowSuggest(false);
    fetchDirections(origin || devicePos || pinned, pinned, true);
  };

  const onSelectSuggestion = async (item) => {
    setSuggestions([]); setShowSuggest(false);
    setSearch(item.description); Keyboard.dismiss();
    const chosen = await fetchPlace(item);
    if (!chosen) return;
    setDest(chosen);
    setRecents((prev) => {
      const next = [item, ...prev.filter((x) => x.place_id !== item.place_id)];
      return next.slice(0, 6);
    });
    animateTo(chosen, { latitudeDelta: 0.06, longitudeDelta: 0.06 });
    if (origin) await fetchDirections(origin, chosen, true);
  };

  const clearDestination = () => {
    setDest(null); setSearch(""); setSuggestions([]); setShowSuggest(false);
    setRouteCoords([]); setEta(null); setSteps([]); setStepIdx(0);
    setNavMode(false);
    if (watchRef.current) { watchRef.current.remove?.(); watchRef.current = null; }
    setShowStreet(false);
    stopBackgroundTracking().catch(() => {});
  };

  const openSuggest = () => { setShowSuggest(true); if (search.trim().length < 2) setSuggestions([]); };

  const nextStep = steps[stepIdx] || null;
  const bannerText = (() => {
    if (!nextStep) return null;
    const m = nextStep.maneuver || "";
    const title = m.includes("left") ? "Turn left" : m.includes("right") ? "Turn right" : m.includes("straight") ? "Go straight" : m.includes("roundabout") ? "At roundabout" : "Continue";
    return `${title} • ${nextStep.distanceText || ""}`;
  })();

  const routeTitle = (() => {
    const a = cleanPlaceName(origin?.name || originText);
    const b = cleanPlaceName(dest?.name);
    if (!a || !b) return null;
    if (a.toLowerCase() === b.toLowerCase()) return "Your route";
    const pickShort = (t) => {
      const parts = t.split(",").map((x) => x.trim()).filter(Boolean);
      return parts.length > 1 ? parts[0] : t;
    };
    return `${pickShort(a)} → ${pickShort(b)}`;
  })();

  const durationMins = tripStartAt ? Math.max(0, Math.round((Date.now() - tripStartAt) / 60000)) : 0;
  const distanceKm = (tripDistance / 1000).toFixed(1);
  const avgSpeed = durationMins > 0 ? Math.round((tripDistance / 1000) / (durationMins / 60)) : 0;

  /* ---------- DEV simulate ---------- */
  async function simulateAlongRoute() {
    if (!dest) return;
    let coords = routeCoords;
    const start = origin || devicePos;
    if ((!coords || !coords.length) && start) {
      coords = [
        start,
        { latitude: start.latitude + (dest.latitude - start.latitude) * 0.33, longitude: start.longitude + (dest.longitude - start.longitude) * 0.33 },
        { latitude: start.latitude + (dest.latitude - start.latitude) * 0.66, longitude: start.longitude + (dest.longitude - start.longitude) * 0.66 },
        dest,
      ];
      setRouteCoords(coords);
    }
    if (!navMode) {
      setNavMode(true);
      setTripStartAt(Date.now());
      setTripDistance(0);
      setLastPoint(start ?? coords[0]);
      startBackgroundTracking().catch(() => {});
    }
    setSimulating(true); simRef.current = true;
    for (let i = 0; i < coords.length; i++) {
      if (!simRef.current) break;
      const cur = coords[i];
      setDevicePos(cur);
      setBreadcrumbs((p) => [...p.slice(-120), cur]);
      if (lastPoint) setTripDistance((d) => d + haversine(lastPoint, cur));
      setLastPoint(cur);
      setSpeedKmh(20);
      animateCameraFollow(cur, heading, 18.2);
      if (showStreet && dest) sendToStreet({ type: "update", lat: cur.latitude, lng: cur.longitude, heading: bearingTo(cur, dest) });
      await delay(700);
    }
    setSimulating(false); simRef.current = false; endNavigation(true);
  }

  /* ---------- rating / incident submits ---------- */
  const submitRating = async () => {
    try {
      await fetch(`${API_URL}/ratings/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: driver?.id || null,
          driverName: driver?.name || "Unknown",
          vehicleRating: rateVehicle,
          driverRating: rateDriver,
          notes: rateNotes,
          route: routeTitle,
          dest,
          startedAt: tripStartAt,
          endedAt: Date.now(),
          distanceMeters: tripDistance,
        }),
      }).catch(() => {});
    } finally {
      setRateOpen(false);
      setRateDriver(0); setRateVehicle(0); setRateNotes("");
      setLastAction("rating");
      setAfterThanks("dashboard");
      setThanksOpen(true);
    }
  };

  const submitIncident = async () => {
    if (!reportCats.length) { setError("Choose at least one category."); return; }
    try {
      const payload = {
        category: reportCats.join(", "),
        categories: reportCats,
        notes: reportNotes,
        time: new Date().toISOString(),
        coords: devicePos,
        bus: driver?.plate || driver?.busNo || null,
        driver: driver?.name || null,
        route: routeTitle,
        destination: dest?.name || null,
      };
      await fetch(`${API_URL}/incidents/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } finally {
      setReportOpen(false);
      setLastAction("incident");
      setLastReportCats(reportCats);
      setReportCats([]); setReportNotes("");
      setAfterThanks("stay");
      setThanksOpen(true);
    }
  };

  /* ---------- render ---------- */
  return (
    <SafeAreaView style={[s.safe, { paddingTop: insets.top }]}>
      {/* Direction banner */}
      {navMode && bannerText && (
        <View style={[s.banner, { top: 10 + insets.top }]}>
          <MaterialCommunityIcons
            name={
              (nextStep?.maneuver || "").includes("left")
                ? "arrow-left"
                : (nextStep?.maneuver || "").includes("right")
                ? "arrow-right"
                : "arrow-up"
            }
            size={22}
            color={C.white}
            style={{ marginRight: 6 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>{bannerText}</Text>
            {!!nextStep?.road && <Text style={s.bannerSub}>{nextStep.road}</Text>}
          </View>
        </View>
      )}

      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={false}
        showsCompass={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        zoomControlEnabled={false}
        onLongPress={onLongPress}
        initialRegion={{
          latitude: origin?.latitude || 10.3157,
          longitude: origin?.longitude || 123.8854,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
      >
        {/* Destination */}
        {dest && <Marker coordinate={dest} title={dest.name || "Destination"} />}

        {/* Your location */}
        {devicePos && (
          <Marker coordinate={devicePos} title="You" description={originText}>
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              {navMode && (
                <Animated.View style={[s.pulse, pulseStyle]} />
              )}
              <View style={s.blueDot}/>
            </View>
          </Marker>
        )}

        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={6} strokeColor={C.brand} />
        )}
        {breadcrumbs.length > 1 && (
          <Polyline coordinates={breadcrumbs} strokeWidth={3} strokeColor={C.blueTrail} />
        )}
      </MapView>

      {/* DEV Sim */}
      {SHOW_SIM && dest && (
        <TouchableOpacity
          onPress={() => {
            if (simulating) { setSimulating(false); simRef.current = false; return; }
            simulateAlongRoute();
          }}
          style={[s.simBtn, { top: (navMode ? 110 : 160) + insets.top, right: 16 }]}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons name={simulating ? "pause-circle" : "play-circle"} size={20} color={C.brand} />
          <Text style={{ color: C.text, fontWeight: "700" }}>{simulating ? "Stop" : "Sim"}</Text>
        </TouchableOpacity>
      )}

      {/* Search card (pre-nav) */}
      {!navMode && (
        <View style={[s.searchWrap, { top: 10 + insets.top }]}>
          <View style={s.searchCard}>
            <View style={s.timeline}>
              <View style={s.circleOuter}><View style={s.circleInner} /></View>
              <View style={s.line} />
              <View style={[s.circleOuter, { borderColor: C.destPin }]}><View style={[s.circleInnerSmall, { backgroundColor: C.destPin }]} /></View>
            </View>

            <View style={{ flex: 1 }}>
              <View style={s.row}>
                <Text style={s.rowLabel}>Pickup point</Text>
                <Text numberOfLines={1} style={s.rowValue}>{originText}</Text>
              </View>
              <View style={s.rowDivider} />
              <View style={s.row}>
                <Text style={s.rowLabel}>Where to go?</Text>
                <View style={s.inputWrap}>
                  <TextInput
                    style={s.input}
                    placeholder="Search destination"
                    placeholderTextColor={C.hint}
                    value={search}
                    onChangeText={setSearch}
                    onFocus={openSuggest}
                    returnKeyType="search"
                  />
                  {(search.length > 0 || dest) && (
                    <TouchableOpacity onPress={clearDestination} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <MaterialCommunityIcons name="close-circle" size={18} color={C.hint} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {showSuggest && (
                <View style={s.suggestBox}>
                  {search.trim().length < 2 && recents.length > 0 ? (
                    <View>
                      <View style={s.suggestHdr}><Text style={s.suggestHdrTxt}>Recent</Text></View>
                      {recents.map((r) => (
                        <TouchableOpacity key={r.place_id} style={s.suggestRow} onPress={() => onSelectSuggestion(r)}>
                          <MaterialCommunityIcons name="history" size={18} color={C.text} />
                          <Text numberOfLines={2} style={s.suggestText}>{r.description}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <FlatList
                      keyboardShouldPersistTaps="handled"
                      data={suggestions}
                      keyExtractor={(it) => String(it.place_id)}
                      renderItem={({ item }) => (
                        <TouchableOpacity style={s.suggestRow} onPress={() => onSelectSuggestion(item)}>
                          <MaterialCommunityIcons name="map-marker-outline" size={18} color={C.text} />
                          <Text numberOfLines={2} style={s.suggestText}>{item.description}</Text>
                        </TouchableOpacity>
                      )}
                      ListEmptyComponent={
                        fetching ? (
                          <View style={{ padding: 12, alignItems: "center" }}><ActivityIndicator size="small" /></View>
                        ) : (
                          <View style={{ padding: 12 }}><Text style={{ color: C.sub, textAlign: "center" }}>No results</Text></View>
                        )
                      }
                    />
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Bottom sheet (pre-nav) */}
      {!navMode && dest && routeCoords.length > 0 && eta && (
        <View style={[s.sheetWrap, { paddingBottom: 12 + insets.bottom }]}>
          <View style={s.sheetCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.routeTitle} numberOfLines={1}>{routeTitle || "Your route"}</Text>
              <Text style={s.sheetEta}>{eta.durationText} • {eta.distanceText}</Text>
              {!!(driver?.name || driver?.routeName) && (
                <View style={s.sheetLine}>
                  <MaterialCommunityIcons name="car-clock" size={16} color={C.sub} />
                  <Text numberOfLines={1} style={s.sheetSub}>
                    {driver?.routeName ? `Taken by ${driver?.name || "driver"} • ${driver.routeName}` : `Taken by ${driver?.name}`}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={s.startPill} onPress={startNavigation} activeOpacity={0.9}>
              <MaterialCommunityIcons name="navigation-variant" size={20} color={C.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bottom during nav (ETA only) */}
      {navMode && (
        <View style={[s.bottomBar, { paddingBottom: 12 + insets.bottom }]}>
          <View style={s.navBottom}>
            <View style={{ flex: 1 }}>
              <Text style={s.arriveEtaTitle}>Arrive in</Text>
              <Text style={s.arriveEtaValue}>{eta?.durationText || "—"} • {eta?.distanceText || "—"}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Crosshairs (recenter) */}
      <TouchableOpacity
        style={[s.locFab, { bottom: (navMode ? 170 : 148) + insets.bottom }]}
        onPress={recenterToUser}
        activeOpacity={0.9}
      >
        <MaterialCommunityIcons name="crosshairs-gps" size={22} color={C.brand} />
      </TouchableOpacity>

      {/* Report icon – only AFTER Start */}
      {navMode && (
        <TouchableOpacity
          style={[s.reportFab, { bottom: 96 + insets.bottom }]}
          onPress={() => setReportOpen(true)}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons name="alarm-light" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Speed bubble – only AFTER Start */}
      {navMode && (
        <View style={[s.speedBubble, { bottom: 96 + insets.bottom }]}>
          <Text style={s.speedValue}>
            {speedKmh === null ? "--" : String(speedKmh)}
          </Text>
          <Text style={s.speedUnit}>km/h</Text>
        </View>
      )}

      {/* Arrived sheet */}
      {arrivedSheet && (
        <View style={[s.arrivedWrap, { paddingBottom: 16 + insets.bottom }]}>
          <View style={s.arrivedCard}>
            <View style={s.arrivedPin}>
              <MaterialCommunityIcons name="map-marker" size={18} color="#fff" />
            </View>

            <Text style={s.arrivedTitle}>Destination Reached</Text>
            <Text style={s.arrivedPlace} numberOfLines={2}>
              {cleanPlaceName(dest?.name) || "Destination"}
            </Text>

            <View style={s.statsRow}>
              <View style={s.statBox}>
                <MaterialCommunityIcons name="clock-outline" size={18} color={C.sub} />
                <Text style={s.statVal}>{durationMins} mins</Text>
                <Text style={s.statLbl}>Duration</Text>
              </View>
              <View style={s.statBox}>
                <MaterialCommunityIcons name="map-marker-distance" size={18} color={C.sub} />
                <Text style={s.statVal}>{distanceKm} km</Text>
                <Text style={s.statLbl}>Distance</Text>
              </View>
              <View style={s.statBox}>
                <MaterialCommunityIcons name="speedometer" size={18} color={C.sub} />
                <Text style={s.statVal}>{avgSpeed} km/h</Text>
                <Text style={s.statLbl}>Avg Speed</Text>
              </View>
            </View>

            <View style={s.arrivedActions}>
              <TouchableOpacity
                style={s.primaryBtn}
                onPress={() => { setArrivedSheet(false); setRateOpen(true); }}
                activeOpacity={0.9}
              >
                <Text style={s.primaryBtnTxt}>Rate Ride</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.secondaryBtn}
                onPress={() => { setArrivedSheet(false); goDashboard(); }}
                activeOpacity={0.9}
              >
                <Text style={s.secondaryBtnTxt}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Rate modal */}
      <Modal transparent visible={rateOpen} animationType="fade" onRequestClose={() => { setRateOpen(false); goDashboard(); }}>
        <View style={s.modalOverlay}>
          <View style={s.rateCard}>
            <View style={s.rateHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MaterialCommunityIcons name="star" size={22} color="#F59E0B" />
                <Text style={s.rateTitle}>Rate Your Ride</Text>
              </View>
              <TouchableOpacity onPress={() => { setRateOpen(false); goDashboard(); }}>
                <MaterialCommunityIcons name="close" size={20} color={C.text} />
              </TouchableOpacity>
            </View>

            <View style={s.driverChip}>
              <View style={s.driverAvatar}><MaterialCommunityIcons name="account" size={16} color="#fff" /></View>
              <Text style={s.driverName} numberOfLines={1}>{driver?.name ? driver.name : "Your driver"}</Text>
              {!!driver?.routeName && (<Text style={s.driverRoute} numberOfLines={1}>• {driver.routeName}</Text>)}
            </View>

            <Text style={s.rateQ}>How was your driver?</Text>
            <StarStrip value={rateDriver} onChange={setRateDriver} />
            <LabelStrip />

            <Text style={[s.rateQ, { marginTop: 12 }]}>How was the vehicle?</Text>
            <StarStrip value={rateVehicle} onChange={setRateVehicle} />
            <LabelStrip />

            <Text style={[s.rateQ, { marginTop: 12 }]}>Additional comments (optional)</Text>
            <RNTextInput
              multiline numberOfLines={4}
              placeholder="Please provide details about the experience..."
              placeholderTextColor={C.hint}
              value={rateNotes} onChangeText={setRateNotes}
              style={s.notes}
            />

            <TouchableOpacity
              style={[s.submitBtn, { opacity: rateDriver > 0 ? 1 : 0.6 }]}
              disabled={rateDriver === 0}
              onPress={submitRating}
            >
              <Text style={s.submitTxt}>Submit Rating</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Report sheet (MULTI-SELECT) */}
      <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => setReportOpen(false)}>
        <View style={s.sheetOverlay}>
          <View style={s.reportSheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Report Incident</Text>
              <TouchableOpacity onPress={() => setReportOpen(false)}>
                <MaterialCommunityIcons name="close" size={20} color={C.text} />
              </TouchableOpacity>
            </View>

            <Text style={s.sheetLabel}>Quick categories</Text>
            <View style={s.catWrap}>
              {CATEGORY_OPTIONS.map((cat) => {
                const active = reportCats.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[s.catChip, active && s.catChipActive]}
                    onPress={() =>
                      setReportCats((prev) =>
                        prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
                      )
                    }
                  >
                    <Text style={[s.catTxt, active && s.catTxtActive]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[s.sheetLabel, { marginTop: 10 }]}>Notes (optional)</Text>
            <RNTextInput
              multiline numberOfLines={4}
              placeholder="Describe what happened…"
              placeholderTextColor={C.hint}
              value={reportNotes} onChangeText={setReportNotes}
              style={s.notes}
            />

            <View style={{ height: 6 }} />

            <TouchableOpacity
              style={[s.submitBtn, { opacity: reportCats.length ? 1 : 0.6 }]}
              disabled={!reportCats.length}
              onPress={submitIncident}
            >
              <Text style={s.submitTxt}>Submit Report</Text>
            </TouchableOpacity>

            <View style={s.attachInfo}>
              <MaterialCommunityIcons name="information-outline" size={16} color={C.sub} />
              <Text style={s.attachTxt}>Time, GPS, bus/driver and route will be attached automatically.</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Street View */}
      <Modal visible={showStreet} animationType="slide" onRequestClose={() => setShowStreet(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
          <View style={{ position: "absolute", zIndex: 10, top: 8 + insets.top, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(0,0,0,0.45)", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 }}>
              <MaterialCommunityIcons name="street-view" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "800" }} numberOfLines={1}>
                {cleanPlaceName(dest?.name) || "Street View"}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowStreet(false)} style={{ backgroundColor: "rgba(0,0,0,0.45)", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 }}>
              <MaterialCommunityIcons name="chevron-down" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {GMAPS_JS_KEY ? (
            <WebView
              ref={webRef}
              originWhitelist={["*"]}
              source={{ html: streetHTML }}
              javaScriptEnabled
              allowFileAccess
              allowUniversalAccessFromFileURLs
              onMessage={() => {}}
              androidLayerType={Platform.OS === "android" ? "hardware" : "none"}
              style={{ flex: 1, backgroundColor: "#000" }}
            />
          ) : (
            <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <Text style={{ color: "#fff", textAlign: "center" }}>Set EXPO_PUBLIC_GOOGLE_MAPS_JS_KEY to enable Street View.</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Success toast (rating/report) */}
      <Modal
        visible={thanksOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setThanksOpen(false);
          if (afterThanks === "dashboard") goDashboard();
        }}
      >
        <View style={s.thanksOverlay}>
          <View style={s.thanksCard}>
            <View style={s.checkCircle}><MaterialCommunityIcons name="check" size={26} color="#fff" /></View>
            <Text style={s.thanksTitle}>{afterThanks === "dashboard" ? "Thanks for your rating!" : "Report sent"}</Text>
            <Text style={s.thanksMsg}>
              {afterThanks === "dashboard"
                ? "Your rating has been submitted."
                : "Your report has been submitted. Stay safe."}
            </Text>
            <TouchableOpacity
              style={s.okBtn}
              onPress={async () => {
                try {
                  if (lastAction === "rating") {
                    await addRatingSubmitted({ driverName: driver?.name });
                  } else if (lastAction === "incident") {
                    await addIncidentSubmitted({ categories: lastReportCats });
                  }
                } finally {
                  setThanksOpen(false);
                  if (afterThanks === "dashboard") goDashboard();
                }
              }}
            >
              <Text style={s.okTxt}>{afterThanks === "dashboard" ? "Done" : "Continue"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {!!error && (
        <View style={[s.errToast, { bottom: 72 + insets.bottom }]}>
          <Text style={s.errTxt}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ---------- components ---------- */
function StarStrip({ value, onChange }) {
  const items = [1, 2, 3, 4, 5];
  return (
    <View style={s.starStrip}>
      {items.map((i) => (
        <TouchableOpacity key={i} onPress={() => onChange(i)} style={s.starCell}>
          <MaterialCommunityIcons
            name={value >= i ? "star" : "star-outline"}
            size={26}
            color={value >= i ? "#FFD700" : "#C4C4C4"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}
function LabelStrip() {
  const labels = ["Very Poor", "Poor", "Average", "Good", "Excellent"];
  return (
    <View style={s.labelStrip}>
      {labels.map((t) => (<Text key={t} style={s.starLabel}>{t}</Text>))}
    </View>
  );
}

/* ---------- styles ---------- */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.page },

  /* pulsing user dot */
  pulse: {
    position: "absolute",
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.blue,
  },
  blueDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: C.blue, borderWidth: 2, borderColor: "#fff",
  },

  /* Search */
  searchWrap: { position: "absolute", left: 12, right: 12, zIndex: 20 },
  searchCard: {
    flexDirection: "row",
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    padding: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  timeline: { width: 28, alignItems: "center", paddingTop: 6 },
  circleOuter: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: C.tealDot,
    alignItems: "center", justifyContent: "center", backgroundColor: "#ECFDF5",
  },
  circleInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.tealDot },
  circleInnerSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.destPin },
  line: { width: 2, flex: 1, backgroundColor: C.border, marginVertical: 6, borderRadius: 999 },

  row: { paddingHorizontal: 8, paddingVertical: 6 },
  rowLabel: { color: C.sub, fontWeight: "600", fontSize: 12, marginBottom: 2 },
  rowValue: { color: C.text, fontWeight: "600" },
  rowDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 8 },

  inputWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, color: C.text, paddingVertical: 0, minHeight: 20 },

  suggestBox: {
    marginTop: 8, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    backgroundColor: C.white, maxHeight: 260, overflow: "hidden", zIndex: 25, elevation: 8,
  },
  suggestHdr: {
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#F9FAFB",
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  suggestHdrTxt: { color: C.sub, fontWeight: "700", fontSize: 12 },
  suggestRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  suggestText: { color: C.text, flex: 1 },

  /* Bottom sheet */
  sheetWrap: { position: "absolute", left: 12, right: 12, bottom: 12, zIndex: 10 },
  sheetCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.card, borderWidth: 1.25, borderColor: C.border,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  routeTitle: { color: C.text, fontWeight: "800" },
  sheetEta: { color: C.text, marginTop: 2, fontWeight: "700" },
  sheetLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  sheetSub: { color: C.sub, flex: 1 },

  /* Start button */
  startPill: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: C.brand,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },

  /* Nav bottom */
  bottomBar: { position: "absolute", left: 12, right: 12, bottom: 12, zIndex: 10 },
  navBottom: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  arriveEtaTitle: { color: C.sub, fontSize: 12 },
  arriveEtaValue: { color: C.text, fontWeight: "800" },

  /* Turn banner */
  banner: {
    position: "absolute", left: 12, right: 12, backgroundColor: C.darkGlass,
    borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, zIndex: 25,
  },
  bannerTitle: { color: C.white, fontWeight: "800", fontSize: 14 },
  bannerSub: { color: "#D1D5DB", fontSize: 12 },

  /* Sim button */
  simBtn: {
    position: "absolute", right: 16,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, elevation: 3,
  },

  /* FABs */
  locFab: {
    position: "absolute", right: 16, width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center", elevation: 3, zIndex: 15,
  },
  reportFab: {
    position: "absolute", right: 16, width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.brand,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6, zIndex: 15,
  },

  /* Speed bubble (bottom-left) */
  speedBubble: {
    position: "absolute", left: 16,
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6, zIndex: 15,
  },
  speedValue: { fontSize: 18, fontWeight: "800", color: C.text, marginBottom: 2 },
  speedUnit: { fontSize: 12, fontWeight: "700", color: C.sub },

  /* Arrived sheet */
  arrivedWrap: { position: "absolute", left: 12, right: 12, bottom: 12, zIndex: 20 },
  arrivedCard: {
    backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 16, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  arrivedPin: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.brand,
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  arrivedTitle: { color: C.text, fontWeight: "800", fontSize: 18 },
  arrivedPlace: { color: C.sub, textAlign: "center", marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 14, marginTop: 14 },
  statBox: {
    width: 96, alignItems: "center", borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingVertical: 10, backgroundColor: "#FAFAFA",
  },
  statVal: { color: C.text, fontWeight: "800", marginTop: 4 },
  statLbl: { color: C.sub, fontSize: 12 },

  arrivedActions: {
    width: "100%", flexDirection: "row", gap: 10, marginTop: 16,
  },
  primaryBtn: {
    flex: 1, backgroundColor: C.brand, borderRadius: 12, paddingVertical: 12, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  primaryBtnTxt: { color: "#fff", fontWeight: "800" },
  secondaryBtn: {
    flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingVertical: 12, alignItems: "center",
    borderWidth: 1, borderColor: C.border,
  },
  secondaryBtnTxt: { color: C.text, fontWeight: "800" },

  /* Rate modal */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  rateCard: { width: "88%", backgroundColor: "#fff", borderRadius: 14, padding: 16, borderColor: C.border, borderWidth: 1 },
  rateHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  rateTitle: { color: C.text, fontWeight: "800", fontSize: 16 },
  rateQ: { color: C.text, fontWeight: "600", marginTop: 4 },
  starStrip: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  starCell: { width: "20%", alignItems: "center" },
  labelStrip: { flexDirection: "row", justifyContent: "space-between", marginTop: 2, marginBottom: 6 },
  starLabel: { color: C.sub, fontSize: 11, width: "20%", textAlign: "center" },
  notes: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, marginTop: 6, minHeight: 80, textAlignVertical: "top", color: C.text },
  submitBtn: { marginTop: 14, backgroundColor: C.brand, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  submitTxt: { color: "#fff", fontWeight: "700" },
  driverChip: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, marginBottom: 8, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 10, backgroundColor: "#F9FAFB" },
  driverAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" },
  driverName: { color: C.text, fontWeight: "700" },
  driverRoute: { color: C.sub, fontWeight: "600" },

  /* Report sheet */
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  reportSheet: { backgroundColor: "#fff", padding: 16, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderColor: C.border, borderWidth: 1 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  sheetTitle: { fontWeight: "800", fontSize: 16, color: C.text },
  sheetLabel: { color: C.sub, fontWeight: "700", marginTop: 6 },
  catWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  catChip: { borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#F9FAFB" },
  catChipActive: { backgroundColor: C.brand, borderColor: C.brand },
  catTxt: { color: C.text, fontWeight: "600" },
  catTxtActive: { color: "#fff" },
  attachInfo: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  attachTxt: { color: C.sub, flex: 1, fontSize: 12 },

  /* Success modal */
  thanksOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" },
  thanksCard: { width: "82%", backgroundColor: "#fff", paddingVertical: 22, paddingHorizontal: 18, borderRadius: 14, alignItems: "center" },
  checkCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#0EA5E9", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  thanksTitle: { fontSize: 18, fontWeight: "800", color: C.text },
  thanksMsg: { textAlign: "center", color: C.text, marginTop: 4, fontWeight: "600" },
  okBtn: { marginTop: 16, backgroundColor: "#0EA5E9", paddingVertical: 10, paddingHorizontal: 28, borderRadius: 999 },
  okTxt: { color: "#fff", fontWeight: "800" },

  /* Error toast */
  errToast: { position: "absolute", left: 12, right: 12, backgroundColor: "#FEE2E2", borderColor: "#FCA5A5", borderWidth: 1, borderRadius: 10, padding: 10 },
  errTxt: { color: "#991B1B", textAlign: "center" },
});
