import request from "supertest";
import { describe, expect, it } from "vitest";
import createApp from "../../app.js";
import User from "../../models/user.js";
import { generateTotpCode } from "../../utils/twoFactor.js";
import { PASSWORD, bearer, createUser, login } from "../helpers.js";
import { useTestDatabase } from "../setup/db.js";

useTestDatabase();
const app = createApp();

const STEP = 30_000;

/** Enables 2FA for a fresh user and returns everything a test needs. */
const userWithTwoFactor = async () => {
  const user = await createUser();
  const { token } = await login(app, user);

  const setup = await request(app).post("/api/auth/2fa/setup").set(bearer(token));
  expect(setup.status).toBe(200);
  const { secret } = setup.body;

  const enable = await request(app)
    .post("/api/auth/2fa/enable")
    .set(bearer(token))
    .send({ code: generateTotpCode(secret) });
  expect(enable.status).toBe(200);

  return { user, token, secret, recoveryCodes: enable.body.recoveryCodes };
};

const startLogin = async (user) => {
  const res = await request(app).post("/api/auth/login").send({ identifier: user.email, password: PASSWORD });
  expect(res.status).toBe(200);
  expect(res.body.requiresTwoFactor).toBe(true);
  expect(res.body.accessToken).toBeUndefined();
  return res.body.twoFactorToken;
};

describe("two-factor setup", () => {
  it("returns a QR code and otpauth URL, but doesn't enable 2FA until confirmed", async () => {
    const user = await createUser();
    const { token } = await login(app, user);

    const res = await request(app).post("/api/auth/2fa/setup").set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.qrCode).toMatch(/^data:image\/png;base64,/);
    expect(res.body.otpauthUrl).toContain("otpauth://totp/ClassConnect");

    const status = await request(app).get("/api/auth/2fa").set(bearer(token));
    expect(status.body.enabled).toBe(false);
  });

  it("stores the secret encrypted, never in plain text", async () => {
    const { user, secret } = await userWithTwoFactor();
    const stored = await User.findById(user._id).select("+twoFactor.secret +twoFactor.recoveryCodes");
    expect(stored.twoFactor.enabled).toBe(true);
    expect(stored.twoFactor.secret).not.toContain(secret);
    expect(stored.twoFactor.recoveryCodes).toHaveLength(8);
    expect(stored.twoFactor.recoveryCodes[0]).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects a wrong confirmation code", async () => {
    const user = await createUser();
    const { token } = await login(app, user);
    await request(app).post("/api/auth/2fa/setup").set(bearer(token));
    const res = await request(app).post("/api/auth/2fa/enable").set(bearer(token)).send({ code: "000000" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_2FA_CODE");
  });

  it("can't be enabled twice", async () => {
    const { token } = await userWithTwoFactor();
    const res = await request(app).post("/api/auth/2fa/setup").set(bearer(token));
    expect(res.status).toBe(409);
  });
});

describe("signing in with 2FA", () => {
  it("requires a second step and accepts a valid authenticator code", async () => {
    const { user, secret } = await userWithTwoFactor();
    const twoFactorToken = await startLogin(user);

    const res = await request(app)
      .post("/api/auth/login/2fa")
      .send({ twoFactorToken, code: generateTotpCode(secret, Date.now() + STEP) });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  it("rejects a wrong code and a replayed code", async () => {
    const { user, secret } = await userWithTwoFactor();

    const wrong = await request(app)
      .post("/api/auth/login/2fa")
      .send({ twoFactorToken: await startLogin(user), code: "123456" });
    expect(wrong.status).toBe(401);

    const code = generateTotpCode(secret, Date.now() + STEP);
    const first = await request(app).post("/api/auth/login/2fa").send({ twoFactorToken: await startLogin(user), code });
    expect(first.status).toBe(200);
    const replay = await request(app).post("/api/auth/login/2fa").send({ twoFactorToken: await startLogin(user), code });
    expect(replay.status).toBe(401);
    expect(replay.body.code).toBe("TWO_FACTOR_CODE_REUSED");
  });

  it("accepts each recovery code exactly once", async () => {
    const { user, recoveryCodes } = await userWithTwoFactor();

    const first = await request(app)
      .post("/api/auth/login/2fa")
      .send({ twoFactorToken: await startLogin(user), code: recoveryCodes[0] });
    expect(first.status).toBe(200);
    expect(first.body.recoveryCodesRemaining).toBe(7);

    const again = await request(app)
      .post("/api/auth/login/2fa")
      .send({ twoFactorToken: await startLogin(user), code: recoveryCodes[0] });
    expect(again.status).toBe(401);
  });

  it("does not accept the challenge token as an access token", async () => {
    const { user } = await userWithTwoFactor();
    const twoFactorToken = await startLogin(user);
    const res = await request(app).get("/api/auth/me").set(bearer(twoFactorToken));
    expect(res.status).toBe(401);
  });
});

describe("turning 2FA off", () => {
  it("needs both the password and a code", async () => {
    const { token, secret } = await userWithTwoFactor();
    const code = generateTotpCode(secret, Date.now() + STEP);

    const badPassword = await request(app).post("/api/auth/2fa/disable").set(bearer(token)).send({ password: "Wr0ngpass", code });
    expect(badPassword.status).toBe(401);

    const ok = await request(app).post("/api/auth/2fa/disable").set(bearer(token)).send({ password: PASSWORD, code });
    expect(ok.status).toBe(200);
    expect((await request(app).get("/api/auth/2fa").set(bearer(token))).body.enabled).toBe(false);
  });

  it("goes back to single-step sign-in afterwards", async () => {
    const { user, token, secret } = await userWithTwoFactor();
    await request(app)
      .post("/api/auth/2fa/disable")
      .set(bearer(token))
      .send({ password: PASSWORD, code: generateTotpCode(secret, Date.now() + STEP) });

    const res = await request(app).post("/api/auth/login").send({ identifier: user.email, password: PASSWORD });
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.requiresTwoFactor).toBeUndefined();

    const stored = await User.findById(user._id).select("+twoFactor.secret +twoFactor.recoveryCodes");
    expect(stored.twoFactor.secret).toBeUndefined();
    expect(stored.twoFactor.recoveryCodes).toBeUndefined();
  });
});
