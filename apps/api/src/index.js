import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

const sign = (u) =>
  jwt.sign({ sub: u.id, role: u.role, email: u.email }, JWT_SECRET, { expiresIn: "7d" });

function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
function requireAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN") return res.status(403).json({ message: "Admins only" });
  next();
}

app.get("/health", (_, res) => res.json({ ok: true }));

// ---------- AUTH ----------
app.post("/auth/login", async (req, res) => {
  try {
    const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
    const { email, password } = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.password) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    if (user.role === "COMMUTER" && !user.isVerified) {
      const masked = (user.verificationTarget || user.email || "")
        .toString()
        .replace(/.(?=.{4})/g, "•");
      return res.status(403).json({
        message: "Verification required",
        needsVerification: true,
        method: user.verificationMethod || (user.phone ? "phone" : "email"),
        target: masked,
      });
    }

    res.json({
      token: sign(user),
      role: user.role,
      mustChangePassword: user.mustChangePassword || false,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    console.error("login error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/auth/register", async (req, res) => {
  try {
    const schema = z.object({
      fullName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().min(6),
      password: z.string().min(6),
      role: z.enum(["COMMUTER", "DRIVER"]).optional(),
    });
    const { fullName, email, phone, password, role } = schema.parse(req.body);

    const dupe = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
      select: { id: true },
    });
    if (dupe) return res.status(409).json({ message: "Email or phone already registered" });

    const hash = await bcrypt.hash(password, 12);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        fullName,
        email: email.toLowerCase(),
        phone,
        password: hash,
        role: role ?? "COMMUTER",
        isVerified: false,
        status: "PENDING",
        verificationMethod: phone ? "phone" : "email",
        verificationTarget: phone || email.toLowerCase(),
        verificationCode: code,
        codeExpiresAt: expires,
        lastOtpSentAt: new Date(),
        commuterProfile: { create: { points: 0 } },
      },
    });

    console.log(`📩 OTP for ${user.email}: ${code}`);
    res.status(201).json({ message: "Account created. OTP logged to server terminal." });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    if (e?.code === "P2002") return res.status(409).json({ message: "Email or phone already registered" });
    console.error("register error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/auth/request-otp", async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const u = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!u) return res.status(404).json({ message: "User not found" });
    if (u.isVerified) return res.status(400).json({ message: "Already verified" });

    if (u.lastOtpSentAt && Date.now() - u.lastOtpSentAt.getTime() < 60_000)
      return res.status(429).json({ message: "Please wait before requesting another code" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await prisma.user.update({
      where: { email: u.email },
      data: { verificationCode: code, codeExpiresAt: new Date(Date.now() + 10 * 60 * 1000), lastOtpSentAt: new Date() },
    });

    console.log(`📩 [RESEND OTP] for ${u.email}: ${code}`);
    res.json({ message: "New OTP generated. Check your terminal log." });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    console.error("request-otp error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/auth/verify-otp", async (req, res) => {
  try {
    const { email, code } = z
      .object({ email: z.string().email(), code: z.string().length(6) })
      .parse(req.body);

    const u = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!u) return res.status(404).json({ message: "User not found" });
    if (u.isVerified) return res.status(400).json({ message: "Already verified" });
    if (!u.verificationCode || !u.codeExpiresAt) return res.status(400).json({ message: "No code found" });
    if (u.codeExpiresAt.getTime() < Date.now()) return res.status(400).json({ message: "Code expired" });
    if (code !== u.verificationCode) return res.status(400).json({ message: "Invalid code" });

    await prisma.user.update({
      where: { email: u.email },
      data: {
        isVerified: true,
        verificationCode: null,
        codeExpiresAt: null,
        verificationMethod: null,
        verificationTarget: null,
        status: "ACTIVE",
      },
    });

    res.json({ message: "Account verified successfully!" });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    console.error("verify-otp error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

// minimal "who am I" (kept)
app.get("/me", requireAuth, async (req, res) => {
  const me = await prisma.user.findUnique({
    where: { id: req.user.sub },
    select: { id: true, fullName: true, email: true, role: true, mustChangePassword: true },
  });
  res.json(me);
});

// ---------- FULL PROFILE ----------
app.get("/users/me", requireAuth, async (req, res) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        createdAt: true,
        commuterProfile: { select: { points: true } },
      },
    });
    if (!me) return res.status(404).json({ message: "User not found" });
    res.json({
      id: me.id,
      fullName: me.fullName || "",
      email: me.email || "",
      phone: me.phone || "",
      createdAt: me.createdAt,
      points: me.commuterProfile?.points ?? 0,
    });
  } catch (e) {
    console.error("GET /users/me error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

app.patch("/users/me", requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      fullName: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().min(3).optional(),
      points: z.number().int().min(0).max(100).optional(),
    });
    const input = schema.parse(req.body);

    const updates = {
      ...(input.fullName ? { fullName: input.fullName } : {}),
      ...(input.email ? { email: input.email.toLowerCase() } : {}),
      ...(input.phone ? { phone: input.phone } : {}),
    };

    const updated = await prisma.user.update({
      where: { id: req.user.sub },
      data: updates,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        createdAt: true,
        commuterProfile: { select: { points: true } },
      },
    });

    if (typeof input.points === "number") {
      await prisma.commuterProfile.updateMany({
        where: { userId: req.user.sub },
        data: { points: input.points },
      });
    }

    res.json({
      id: updated.id,
      fullName: updated.fullName || "",
      email: updated.email || "",
      phone: updated.phone || "",
      createdAt: updated.createdAt,
      points: updated.commuterProfile?.points ?? 0,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input" });
    if (e?.code === "P2002") return res.status(409).json({ message: "Email already in use" });
    console.error("PATCH /users/me error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

app.patch("/users/me/preferences", requireAuth, async (_req, res) => {
  res.json({ ok: true });
});

app.post("/users/me/redeem", requireAuth, async (req, res) => {
  try {
    await prisma.commuterProfile.updateMany({
      where: { userId: req.user.sub },
      data: { points: 0 },
    });
    res.json({ ok: true, points: 0 });
  } catch (e) {
    console.error("POST /users/me/redeem error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- start ----------
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => console.log(`🚀 API running on http://${HOST}:${PORT}`));
