import { z } from "zod";

const PHONE_RE = /^\d{11}$/;                     // exactly 11 digits
const EMAIL_COM_RE = /^[^\s@]+@[^\s@]+\.com$/i;  // must end with .com
const DL_RE = /^[A-Z]\d{2}-\d{2}-\d{6}$/;        // e.g., B87-93-671484

/* ---------------- Admin ---------------- */
export const RegisterAdminSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().regex(EMAIL_COM_RE, "Email must be a valid .com address"),
  phone: z.string().regex(PHONE_RE, "Phone must be exactly 11 digits"),
  address: z.string().optional(),
  birthdate: z.string().optional(), // ISO date string (optional)
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/* ---------------- Driver ---------------- */
export const RegisterDriverSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  // Optional but if present must be .com
  email: z
    .string()
    .regex(EMAIL_COM_RE, "Email must be a valid .com address")
    .optional()
    .nullable(),
  phone: z.string().regex(PHONE_RE, "Phone must be exactly 11 digits"),
  address: z.string().optional().nullable(),
  birthdate: z.string().optional().nullable(), // ISO date if sent

  // Uppercase first, then enforce B87-93-671484 pattern
  driverLicense: z.preprocess(
    (v) => (typeof v === "string" ? v.toUpperCase() : v),
    z.string().regex(DL_RE, "Driver License must be like B87-93-671484")
  ),

  route: z.string().optional().nullable(),
  vehicleType: z.enum(["AIRCON", "NON_AIRCON"]).default("NON_AIRCON"),
  busNumber: z.string().optional().nullable(),
  plateNumber: z.string().optional().nullable(),
});

/* ---------------- Auth ---------------- */
export const LoginSchema = z.object({
  emailOrPhone: z.string().min(3),
  password: z.string().min(6),
});

/* ---------------- Driver status ---------------- */
export const UpdateDriverStatusSchema = z.object({
  status: z.enum(["ACTIVE", "DEACTIVATED"]),
});

/* ---------------- Feedback ---------------- */
export const CreateFeedbackSchema = z.object({
  driverId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

/* ---------------- Reports ---------------- */
export const CreateReportSchema = z.object({
  driverId: z.number().int().positive(),
  type: z.enum([
    "RECKLESS_DRIVING",
    "OVERLOADING",
    "VEHICLE_BREAKDOWN",
    "EMERGENCY",
    "OTHER",
  ]),
  note: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const UpdateReportStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"]),
});
