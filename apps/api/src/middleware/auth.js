import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export function requireAuth(req, res, next) {
  try {
    const h = req.headers?.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload = jwt.verify(token, JWT_SECRET);

    // 🔑 Try several common id fields (sub, id, userId, etc.)
    const id =
      payload.sub ??
      payload.id ??
      payload.userId ??
      payload.user_id ??
      payload.uid ??
      null;

    const role = payload.role ?? payload.userRole ?? null;

    // Old style (backward compatibility)
    req.userId = id;
    req.userRole = role;

    // New style – what your commuter.trips.js is expecting
    req.user = {
      ...payload,
      id,
      role,
    };

    // Debug log (optional – remove later if you want)
    console.log("[auth] user =", req.user);

    next();
  } catch (e) {
    console.error("[auth] verify failed:", e.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
}
