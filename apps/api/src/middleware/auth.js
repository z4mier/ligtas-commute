import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export const requireAdmin = (req, res, next) =>
  // keep your original check, add fallback to req.userRole (set by requireAuth)
  (req.user?.role === "ADMIN" || req.userRole === "ADMIN")
    ? next()
    : res.status(403).json({ error: "Forbidden (admin only)" });

export function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // keep your originals
    req.userId = payload.sub;
    req.userRole = payload.role;
    // add a unified object, without removing the above
    req.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
    };
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
