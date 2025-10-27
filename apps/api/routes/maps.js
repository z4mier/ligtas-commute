// apps/api/routes/maps.js
import express from "express";
import crypto from "crypto";

const router = express.Router();

const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_KEY;          
const GOOGLE_DIRECTIONS_KEY = process.env.GOOGLE_DIRECTIONS_KEY || GOOGLE_PLACES_KEY;

async function safeFetchJson(url) {
  const r = await fetch(url);
  const text = await r.text();
  try { return { status: r.status, json: JSON.parse(text) }; }
  catch { return { status: 502, json: { message: "Upstream non-JSON", upstream: text.slice(0, 200) } }; }
}

const newSessionToken = () => crypto.randomUUID?.() || crypto.randomBytes(16).toString("hex");

router.get("/autocomplete", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ status: "OK", predictions: [] });

    const lat = req.query.lat;
    const lng = req.query.lng;
    const radius = Number(req.query.radius || 25000); 
    const bias = (lat && lng) ? `&locationbias=circle:${radius}@${lat},${lng}` : "";
    const sessiontoken = newSessionToken();

    const url =
      `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
      `?input=${encodeURIComponent(q)}` +
      `&components=country:PH` +
      `&types=geocode|establishment` +   
      `&language=en` +
      `&sessiontoken=${sessiontoken}` +
      `${bias}` +
      `&key=${GOOGLE_PLACES_KEY}`;

    const { status, json } = await safeFetchJson(url);
    return res.status(status).json({
      status: json?.status,
      predictions: (json?.predictions || []).map(p => ({
        id: p.place_id,
        place_id: p.place_id,
        description: p.description,
      })),
    });
  } catch (e) {
    console.error("[/maps/autocomplete]", e);
    res.status(500).json({ status: "ERROR", message: "Autocomplete failed" });
  }
});

router.get("/place", async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ status: "INVALID_REQUEST", message: "Missing place id" });

    const url =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${encodeURIComponent(id)}` +
      `&fields=geometry/location,name,formatted_address,place_id` +
      `&language=en` +
      `&key=${GOOGLE_PLACES_KEY}`;

    const { status, json } = await safeFetchJson(url);
    const loc = json?.result?.geometry?.location;
    return res.status(status).json({
      status: json?.status,
      name: json?.result?.name || "",
      address: json?.result?.formatted_address || "",
      place_id: json?.result?.place_id || "",
      location: loc ? { lat: loc.lat, lng: loc.lng } : null,
    });
  } catch (e) {
    console.error("[/maps/place]", e);
    res.status(500).json({ status: "ERROR", message: "Place details failed" });
  }
});

router.get("/directions", async (req, res) => {
  try {
    const { origin, destination, mode = "driving" } = req.query;
    if (!origin || !destination) {
      return res.status(400).json({ status: "INVALID_REQUEST", message: "Missing origin/destination" });
    }
    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${encodeURIComponent(origin)}` +
      `&destination=${encodeURIComponent(destination)}` +
      `&mode=${encodeURIComponent(mode)}` +
      `&language=en` +
      `&key=${GOOGLE_DIRECTIONS_KEY}`;

    const { status, json } = await safeFetchJson(url);
    res.status(status).json(json);
  } catch (e) {
    console.error("[/maps/directions]", e);
    res.status(500).json({ status: "ERROR", message: "Directions failed" });
  }
});

export default router;
