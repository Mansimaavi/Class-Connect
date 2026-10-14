import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { decrypt, encrypt, randomNumericCode, safeEqual, sha256 } from "../../utils/crypto.js";
import {
  signAccessToken,
  signRefreshToken,
  signTwoFactorChallenge,
  verifyAccessToken,
  verifyRefreshToken,
  verifyTwoFactorChallenge,
} from "../../utils/tokens.js";
import {
  generateRecoveryCodes,
  generateTotpCode,
  generateTotpSecret,
  hashRecoveryCode,
  looksLikeRecoveryCode,
  verifyTotp,
} from "../../utils/twoFactor.js";

const fakeUser = { _id: "65f1c0ffee0000000000abcd", role: "user", tokenVersion: 3 };

describe("crypto helpers", () => {
  it("round-trips AES-GCM encryption with a fresh IV each time", () => {
    const first = encrypt("JBSWY3DPEHPK3PXP");
    const second = encrypt("JBSWY3DPEHPK3PXP");
    expect(first).not.toBe(second);
    expect(decrypt(first)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("refuses ciphertext that was tampered with", () => {
    const [iv, tag, data] = encrypt("secret").split(".");
    const flipped = Buffer.from(data, "base64");
    flipped[0] ^= 0xff;
    expect(() => decrypt([iv, tag, flipped.toString("base64")].join("."))).toThrow();
  });

  it("generates zero-padded numeric codes", () => {
    for (let i = 0; i < 50; i += 1) expect(randomNumericCode(6)).toMatch(/^\d{6}$/);
  });

  it("compares hashes in constant time", () => {
    expect(safeEqual(sha256("a"), sha256("a"))).toBe(true);
    expect(safeEqual(sha256("a"), sha256("b"))).toBe(false);
    expect(safeEqual("short", "longer")).toBe(false);
  });
});

describe("JWT helpers", () => {
  it("issues access tokens carrying role and token version", () => {
    const payload = verifyAccessToken(signAccessToken(fakeUser));
    expect(payload).toMatchObject({ sub: fakeUser._id, role: "user", tv: 3, typ: "access" });
  });

  it("does not accept one kind of token as another", () => {
    const { token: refresh } = signRefreshToken(fakeUser);
    const challenge = signTwoFactorChallenge(fakeUser);
    const access = signAccessToken(fakeUser);

    expect(() => verifyAccessToken(refresh)).toThrow();
    expect(() => verifyAccessToken(challenge)).toThrow();
    expect(() => verifyRefreshToken(access)).toThrow();
    expect(() => verifyTwoFactorChallenge(access)).toThrow();
    expect(verifyTwoFactorChallenge(challenge).sub).toBe(fakeUser._id);
  });

  it("gives refresh tokens a unique id", () => {
    const a = signRefreshToken(fakeUser);
    const b = signRefreshToken(fakeUser);
    expect(a.jti).not.toBe(b.jti);
    expect(verifyRefreshToken(a.token).jti).toBe(a.jti);
  });

  it("rejects expired and forged tokens", () => {
    const expired = jwt.sign({ typ: "access", tv: 0 }, process.env.JWT_ACCESS_SECRET, {
      subject: fakeUser._id,
      issuer: "classconnect",
      audience: "classconnect-app",
      expiresIn: -10,
    });
    expect(() => verifyAccessToken(expired)).toThrow(jwt.TokenExpiredError);

    const forged = jwt.sign({ typ: "access", tv: 0 }, "attacker-secret", {
      subject: fakeUser._id,
      issuer: "classconnect",
      audience: "classconnect-app",
    });
    expect(() => verifyAccessToken(forged)).toThrow(jwt.JsonWebTokenError);
  });
});

describe("TOTP helpers", () => {
  const secret = generateTotpSecret();

  it("accepts the current code and one step of clock drift", () => {
    const now = Date.now();
    expect(verifyTotp(secret, generateTotpCode(secret, now), now)).not.toBeNull();
    expect(verifyTotp(secret, generateTotpCode(secret, now - 30_000), now)).not.toBeNull();
    expect(verifyTotp(secret, generateTotpCode(secret, now - 120_000), now)).toBeNull();
  });

  it("returns increasing time-steps so used codes can be rejected", () => {
    const now = Date.now();
    const current = verifyTotp(secret, generateTotpCode(secret, now), now);
    const next = verifyTotp(secret, generateTotpCode(secret, now + 30_000), now);
    expect(next).toBe(current + 1);
  });

  it("rejects malformed input", () => {
    expect(verifyTotp(secret, "12345")).toBeNull();
    expect(verifyTotp(secret, "abcdef")).toBeNull();
    expect(verifyTotp(secret, undefined)).toBeNull();
  });

  it("creates recovery codes that are matched case-insensitively", () => {
    const { codes, hashes } = generateRecoveryCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    expect(looksLikeRecoveryCode(codes[0])).toBe(true);
    expect(hashRecoveryCode(codes[0].toLowerCase())).toBe(hashes[0]);
    expect(hashRecoveryCode(codes[0].replace("-", " "))).toBe(hashes[0]);
  });
});
