import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import env from "../config/env.js";
import { ROLES } from "../config/permissions.js";

const BCRYPT_ROUNDS = env.isTest ? 4 : 12;
const MAX_SESSIONS = 10;

const activitySchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    logins: { type: Number, default: 0 },
    totalTimeSpent: { type: Number, default: 0 }, // seconds
  },
  { _id: false }
);

// One entry per signed-in device. The refresh token carries the `jti`; if a
// token is presented whose jti isn't here any more, it was already rotated
// (or revoked), which is how refresh-token reuse is detected.
const sessionSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true },
    // The jti this one replaced, accepted for a few seconds so two tabs
    // refreshing at the same moment don't look like token theft.
    previousJti: { type: String },
    rotatedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String, maxlength: 300 },
    ip: { type: String, maxlength: 64 },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-z0-9_.]+$/, "Username can only contain letters, numbers, dots and underscores"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    course: { type: String, required: true, trim: true, maxlength: 100 },
    college: { type: String, required: true, trim: true, maxlength: 150 },
    avatarUrl: { type: String },

    role: { type: String, enum: Object.values(ROLES), default: ROLES.USER, index: true },
    isBlocked: { type: Boolean, default: false },
    createdBySuperAdmin: { type: Boolean, default: false },

    // Bumped on logout-everywhere / password change: every access token minted
    // before the bump stops working immediately.
    tokenVersion: { type: Number, default: 0, select: false },
    sessions: { type: [sessionSchema], default: [], select: false },
    passwordChangedAt: { type: Date },
    passwordReset: {
      tokenHash: { type: String, select: false },
      expiresAt: { type: Date, select: false },
    },

    twoFactor: {
      enabled: { type: Boolean, default: false },
      enabledAt: { type: Date },
      secret: { type: String, select: false }, // AES-256-GCM encrypted
      pendingSecret: { type: String, select: false },
      recoveryCodes: { type: [String], default: undefined, select: false }, // sha256 hashes
      lastUsedStep: { type: Number, select: false }, // blocks replaying a code inside its 30s window
    },

    lastLogin: { type: Date },
    sessionStart: { type: Date },
    activityLog: { type: [activitySchema], default: [] },
    location: {
      latitude: { type: Number, default: null, min: -90, max: 90 },
      longitude: { type: Number, default: null, min: -180, max: 180 },
    },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform(_doc, ret) {
        delete ret.password;
        delete ret.sessions;
        delete ret.tokenVersion;
        delete ret.passwordReset;
        if (ret.twoFactor) {
          ret.twoFactor = { enabled: Boolean(ret.twoFactor.enabled), enabledAt: ret.twoFactor.enabledAt };
        }
        return ret;
      },
    },
  }
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
  if (!this.isNew) this.passwordChangedAt = new Date();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) {
    throw new Error("Password hash not loaded; query the user with .select('+password')");
  }
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.addSession = function addSession(session) {
  const now = Date.now();
  const active = (this.sessions || []).filter((s) => s.expiresAt.getTime() > now);
  active.push(session);
  this.sessions = active.slice(-MAX_SESSIONS);
};

userSchema.methods.recordLogin = function recordLogin() {
  const today = new Date().toISOString().slice(0, 10);
  const entry = this.activityLog.find((log) => log.date.toISOString().slice(0, 10) === today);
  if (entry) entry.logins += 1;
  else this.activityLog.push({ date: new Date(), logins: 1, totalTimeSpent: 0 });
  this.lastLogin = new Date();
  this.sessionStart = new Date();
};

userSchema.methods.recordLogout = function recordLogout() {
  if (!this.sessionStart) return;
  const end = new Date();
  const start = this.sessionStart;
  const addTime = (day, seconds) => {
    const entry = this.activityLog.find((log) => log.date.toISOString().slice(0, 10) === day);
    if (entry) entry.totalTimeSpent += seconds;
    else this.activityLog.push({ date: new Date(day), logins: 0, totalTimeSpent: seconds });
  };

  const startDay = start.toISOString().slice(0, 10);
  const endDay = end.toISOString().slice(0, 10);
  if (startDay === endDay) {
    addTime(startDay, (end - start) / 1000);
  } else {
    const endOfStartDay = new Date(`${startDay}T23:59:59.999Z`);
    addTime(startDay, (endOfStartDay - start) / 1000);
    addTime(endDay, (end - new Date(`${endDay}T00:00:00.000Z`)) / 1000);
  }
  this.sessionStart = null;
};

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
