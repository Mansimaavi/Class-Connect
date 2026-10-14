import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ quiet: true });

const DEV_SECRET = "dev-only-secret-change-me-dev-only-secret";

const booleanString = (fallback) =>
  z
    .enum(["true", "false"])
    .default(fallback)
    .transform((value) => value === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),

  MONGO_URI: z.string().optional(),

  // `SECRET` is the variable name the first version of the project used.
  JWT_ACCESS_SECRET: z.string().min(16).optional(),
  JWT_REFRESH_SECRET: z.string().min(16).optional(),
  SECRET: z.string().optional(),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  TWO_FACTOR_ENCRYPTION_KEY: z.string().min(16).optional(),

  CLIENT_URL: z.string().default("http://localhost:5173"),
  APP_URL: z.string().optional(),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),

  // "log" prints emails (e.g. sign-up codes) to the server log instead of sending them.
  EMAIL_DELIVERY: z.enum(["smtp", "log"]).optional(),
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().int().positive().default(587),
  MAIL_SECURE: booleanString("false"),
  MAIL_USER: z.string().optional(),
  MAIL_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  GEMINI_API_KEY: z.string().optional(),
  API_KEY4: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),

  MAX_UPLOAD_MB: z.coerce.number().positive().default(15),
});

// `KEY=` in a .env file means "not set", not "set to an empty string".
const provided = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ""));
const parsed = schema.safeParse(provided);

if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
  console.error(`Invalid environment configuration:\n${problems.join("\n")}`);
  process.exit(1);
}

const raw = parsed.data;
const isProduction = raw.NODE_ENV === "production";
const isTest = raw.NODE_ENV === "test";

const accessSecret = raw.JWT_ACCESS_SECRET || raw.SECRET || DEV_SECRET;
const refreshSecret = raw.JWT_REFRESH_SECRET || `${accessSecret}:refresh`;

if (isProduction) {
  const missing = [];
  if (!raw.MONGO_URI) missing.push("MONGO_URI");
  if (accessSecret === DEV_SECRET) missing.push("JWT_ACCESS_SECRET");
  if (!raw.JWT_REFRESH_SECRET) missing.push("JWT_REFRESH_SECRET");
  if (!raw.TWO_FACTOR_ENCRYPTION_KEY) missing.push("TWO_FACTOR_ENCRYPTION_KEY");
  if (missing.length) {
    console.error(`Missing required production settings: ${missing.join(", ")}`);
    process.exit(1);
  }
}

const clientOrigins = raw.CLIENT_URL.split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const env = Object.freeze({
  nodeEnv: raw.NODE_ENV,
  isProduction,
  isTest,
  port: raw.PORT,
  logLevel: raw.LOG_LEVEL || (isTest ? "silent" : isProduction ? "info" : "debug"),
  trustProxy: raw.TRUST_PROXY,

  mongoUri: raw.MONGO_URI,

  jwt: {
    accessSecret,
    refreshSecret,
    accessTtl: raw.ACCESS_TOKEN_TTL,
    refreshTtlDays: raw.REFRESH_TOKEN_TTL_DAYS,
    issuer: "classconnect",
    audience: "classconnect-app",
  },
  twoFactorKey: raw.TWO_FACTOR_ENCRYPTION_KEY || `${accessSecret}:2fa`,

  clientOrigins,
  appUrl: (raw.APP_URL || clientOrigins[0]).replace(/\/$/, ""),
  cookie: {
    secure: raw.COOKIE_SECURE ? raw.COOKIE_SECURE === "true" : isProduction,
    sameSite: raw.COOKIE_SAMESITE,
  },

  mail: {
    delivery: raw.EMAIL_DELIVERY || (raw.MAIL_HOST ? "smtp" : isProduction ? "smtp" : "log"),
    host: raw.MAIL_HOST,
    port: raw.MAIL_PORT,
    secure: raw.MAIL_SECURE,
    user: raw.MAIL_USER,
    pass: raw.MAIL_PASS,
    from: raw.MAIL_FROM || (raw.MAIL_USER ? `ClassConnect <${raw.MAIL_USER}>` : "ClassConnect <no-reply@classconnect.local>"),
  },

  cloudinary: {
    cloudName: raw.CLOUDINARY_CLOUD_NAME,
    apiKey: raw.CLOUDINARY_API_KEY,
    apiSecret: raw.CLOUDINARY_API_SECRET,
  },

  gemini: {
    apiKey: raw.GEMINI_API_KEY || raw.API_KEY4,
    model: raw.GEMINI_MODEL,
  },

  maxUploadBytes: Math.round(raw.MAX_UPLOAD_MB * 1024 * 1024),
});

export default env;
