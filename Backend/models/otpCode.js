import mongoose from "mongoose";

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

// One-time codes for email verification. Only a hash of the code is stored,
// and MongoDB's TTL monitor removes expired documents on its own.
const otpCodeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    purpose: { type: String, enum: ["register"], default: "register" },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      expires: 0,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const OtpCode = mongoose.models.OtpCode || mongoose.model("OtpCode", otpCodeSchema);

export default OtpCode;
