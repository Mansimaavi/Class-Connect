import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import createApp from "../../app.js";
import OtpCode from "../../models/otpCode.js";
import User from "../../models/user.js";
import { sha256 } from "../../utils/crypto.js";
import { PASSWORD, bearer, cookieValue, createOtp, createUser, login, refreshCookieFrom } from "../helpers.js";
import { useTestDatabase } from "../setup/db.js";

useTestDatabase();
const app = createApp();

const registration = (overrides = {}) => ({
  name: "Mansi",
  username: "Mansi_01",
  email: "Mansi@Example.com",
  password: "Str0ngPass",
  course: "B.Tech",
  college: "MNNIT",
  otp: "123456",
  ...overrides,
});

describe("sign-up", () => {
  it("sends a verification code and stores only its hash", async () => {
    const res = await request(app).post("/api/auth/send-otp").send({ email: "new@example.com" });
    expect(res.status).toBe(200);

    const otp = await OtpCode.findOne({ email: "new@example.com" });
    expect(otp).not.toBeNull();
    expect(otp.codeHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("refuses to send a code to an email that's already registered", async () => {
    const user = await createUser();
    const res = await request(app).post("/api/auth/send-otp").send({ email: user.email });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("EMAIL_TAKEN");
  });

  it("registers with a valid code, normalising email and username", async () => {
    await createOtp("mansi@example.com");
    const res = await request(app).post("/api/auth/register").send(registration());

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: "mansi@example.com", username: "mansi_01", role: "user" });
    expect(res.body.user.password).toBeUndefined();

    const stored = await User.findOne({ email: "mansi@example.com" }).select("+password");
    expect(stored.password).not.toBe("Str0ngPass");
    expect(await stored.comparePassword("Str0ngPass")).toBe(true);
    expect(await OtpCode.countDocuments({ email: "mansi@example.com" })).toBe(0);
  });

  it("rejects a wrong code and counts the attempt", async () => {
    await createOtp("mansi@example.com");
    const res = await request(app).post("/api/auth/register").send(registration({ otp: "000000" }));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("OTP_INVALID");
    expect((await OtpCode.findOne({ email: "mansi@example.com" })).attempts).toBe(1);
  });

  it("locks the code after too many wrong attempts", async () => {
    await createOtp("mansi@example.com");
    for (let i = 0; i < 5; i += 1) {
      await request(app).post("/api/auth/register").send(registration({ otp: "000000" }));
    }
    const res = await request(app).post("/api/auth/register").send(registration());
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("OTP_TOO_MANY_ATTEMPTS");
  });

  it("rejects a username that's taken", async () => {
    await createUser({ username: "mansi_01" });
    await createOtp("mansi@example.com");
    const res = await request(app).post("/api/auth/register").send(registration());
    expect(res.status).toBe(409);
    expect(res.body.details[0].field).toBe("username");
  });

  it("validates every field and reports all problems", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "nope", password: "short" });
    expect(res.status).toBe(400);
    const fields = res.body.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(["name", "username", "email", "password", "course", "college", "otp"]));
  });
});

describe("sign-in", () => {
  it("accepts email or username and returns an access token plus refresh cookie", async () => {
    const user = await createUser({ username: "priya" });

    const byEmail = await request(app).post("/api/auth/login").send({ identifier: user.email, password: PASSWORD });
    expect(byEmail.status).toBe(200);
    expect(byEmail.body.accessToken).toBeTruthy();
    expect(byEmail.body.permissions).toContain("classroom:create");

    const cookie = refreshCookieFrom(byEmail);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/api\/auth/);

    const byUsername = await request(app).post("/api/auth/login").send({ identifier: "PRIYA", password: PASSWORD });
    expect(byUsername.status).toBe(200);
  });

  it("still accepts the old { email, password } body", async () => {
    const user = await createUser();
    const res = await request(app).post("/api/auth/login").send({ email: user.email, password: PASSWORD });
    expect(res.status).toBe(200);
  });

  it("gives the same error for an unknown account and a wrong password", async () => {
    const user = await createUser();
    const wrong = await request(app).post("/api/auth/login").send({ identifier: user.email, password: "Wr0ngpass" });
    const unknown = await request(app).post("/api/auth/login").send({ identifier: "ghost@example.com", password: PASSWORD });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.code).toBe("INVALID_CREDENTIALS");
    expect(unknown.body.message).toBe(wrong.body.message);
  });

  it("blocks sign-in for blocked accounts", async () => {
    const user = await createUser({ isBlocked: true });
    const res = await request(app).post("/api/auth/login").send({ identifier: user.email, password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("ACCOUNT_BLOCKED");
  });

  it("records the login in the activity log", async () => {
    const user = await createUser();
    await login(app, user);
    const stored = await User.findById(user._id);
    expect(stored.activityLog[0].logins).toBe(1);
    expect(stored.lastLogin).toBeTruthy();
  });
});

describe("access tokens", () => {
  it("authorises /me with a bearer token", async () => {
    const user = await createUser();
    const { token } = await login(app, user);
    const res = await request(app).get("/api/auth/me").set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.user._id).toBe(user._id.toString());
    expect(res.body.user.sessions).toBeUndefined();
  });

  it("rejects missing, malformed and expired tokens with distinct codes", async () => {
    const user = await createUser();
    expect((await request(app).get("/api/auth/me")).body.code).toBe("NO_TOKEN");
    expect((await request(app).get("/api/auth/me").set(bearer("garbage"))).body.code).toBe("INVALID_TOKEN");

    const expired = jwt.sign({ typ: "access", tv: 0, role: "user" }, process.env.JWT_ACCESS_SECRET, {
      subject: user._id.toString(),
      issuer: "classconnect",
      audience: "classconnect-app",
      expiresIn: -1,
    });
    const res = await request(app).get("/api/auth/me").set(bearer(expired));
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_EXPIRED");
  });
});

describe("refresh tokens", () => {
  it("rotates the refresh cookie on every refresh", async () => {
    const user = await createUser();
    const { cookie } = await login(app, user);

    const res = await request(app).post("/api/auth/refresh").set("Cookie", cookieValue(cookie));
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    const rotated = refreshCookieFrom(res);
    expect(cookieValue(rotated)).not.toBe(cookieValue(cookie));
  });

  it("tolerates two tabs refreshing with the same cookie at the same moment", async () => {
    const user = await createUser();
    const { cookie } = await login(app, user);
    const [a, b] = await Promise.all([
      request(app).post("/api/auth/refresh").set("Cookie", cookieValue(cookie)),
      request(app).post("/api/auth/refresh").set("Cookie", cookieValue(cookie)),
    ]);
    expect([a.status, b.status]).toEqual([200, 200]);
    // only one of them rotated the cookie
    expect([refreshCookieFrom(a), refreshCookieFrom(b)].filter(Boolean)).toHaveLength(1);
  });

  it("treats reuse of an old refresh token as theft and revokes every session", async () => {
    const user = await createUser();
    const { cookie: original, token } = await login(app, user);
    const first = await request(app).post("/api/auth/refresh").set("Cookie", cookieValue(original));
    const second = await request(app).post("/api/auth/refresh").set("Cookie", cookieValue(refreshCookieFrom(first)));
    const rotated = refreshCookieFrom(second);

    // `original` is now two rotations old, so it's outside the grace window
    const replay = await request(app).post("/api/auth/refresh").set("Cookie", cookieValue(original));
    expect(replay.status).toBe(401);
    expect(replay.body.code).toBe("REFRESH_TOKEN_REUSED");

    // the legitimate (rotated) token and the old access token are dead too
    expect((await request(app).post("/api/auth/refresh").set("Cookie", cookieValue(rotated))).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set(bearer(token))).body.code).toBe("TOKEN_REVOKED");
  });

  it("ends only this device's session on logout", async () => {
    const user = await createUser();
    const laptop = await login(app, user);
    const phone = await login(app, user);

    const out = await request(app).post("/api/auth/logout").set("Cookie", cookieValue(laptop.cookie));
    expect(out.status).toBe(200);
    expect(refreshCookieFrom(out)).toMatch(/cc_refresh=;/); // cookie cleared

    // the phone keeps working and only one session is left
    expect((await request(app).post("/api/auth/refresh").set("Cookie", cookieValue(phone.cookie))).status).toBe(200);
    const sessions = await request(app).get("/api/auth/sessions").set(bearer(phone.token));
    expect(sessions.body.sessions).toHaveLength(1);

    // the signed-out cookie can't be used again
    expect((await request(app).post("/api/auth/refresh").set("Cookie", cookieValue(laptop.cookie))).status).toBe(401);
  });

  it("signs out everywhere and invalidates outstanding access tokens", async () => {
    const user = await createUser();
    const laptop = await login(app, user);
    const phone = await login(app, user);

    expect((await request(app).post("/api/auth/logout-all").set(bearer(laptop.token))).status).toBe(200);
    expect((await request(app).get("/api/auth/me").set(bearer(phone.token))).body.code).toBe("TOKEN_REVOKED");
    expect((await request(app).post("/api/auth/refresh").set("Cookie", cookieValue(phone.cookie))).status).toBe(401);
  });

  it("lists sessions and can revoke one", async () => {
    const user = await createUser();
    const { token } = await login(app, user);
    await login(app, user);

    const list = await request(app).get("/api/auth/sessions").set(bearer(token));
    expect(list.status).toBe(200);
    expect(list.body.sessions).toHaveLength(2);

    const revoke = await request(app).delete(`/api/auth/sessions/${list.body.sessions[0].id}`).set(bearer(token));
    expect(revoke.status).toBe(200);
    const after = await request(app).get("/api/auth/sessions").set(bearer(token));
    expect(after.body.sessions).toHaveLength(1);
  });
});

describe("password reset", () => {
  it("answers the same way whether or not the account exists", async () => {
    const user = await createUser();
    const known = await request(app).post("/api/auth/forgot-password").send({ email: user.email });
    const unknown = await request(app).post("/api/auth/forgot-password").send({ email: "ghost@example.com" });
    expect(known.status).toBe(200);
    expect(unknown.body.message).toBe(known.body.message);

    const stored = await User.findById(user._id).select("+passwordReset.tokenHash");
    expect(stored.passwordReset.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("resets the password with a valid token and signs out every session", async () => {
    const user = await createUser();
    const { token: oldAccess } = await login(app, user);
    const resetToken = "a".repeat(64);
    await User.updateOne(
      { _id: user._id },
      { $set: { "passwordReset.tokenHash": sha256(resetToken), "passwordReset.expiresAt": new Date(Date.now() + 60_000) } }
    );

    const res = await request(app).post("/api/auth/reset-password").send({ token: resetToken, password: "N3wPassword" });
    expect(res.status).toBe(200);

    expect((await request(app).get("/api/auth/me").set(bearer(oldAccess))).status).toBe(401);
    expect((await request(app).post("/api/auth/login").send({ identifier: user.email, password: "N3wPassword" })).status).toBe(200);
    // single use
    expect((await request(app).post("/api/auth/reset-password").send({ token: resetToken, password: "An0therOne" })).status).toBe(400);
  });

  it("rejects expired reset tokens", async () => {
    const user = await createUser();
    const resetToken = "b".repeat(64);
    await User.updateOne(
      { _id: user._id },
      { $set: { "passwordReset.tokenHash": sha256(resetToken), "passwordReset.expiresAt": new Date(Date.now() - 1000) } }
    );
    const res = await request(app).post("/api/auth/reset-password").send({ token: resetToken, password: "N3wPassword" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_RESET_TOKEN");
  });
});

describe("account settings", () => {
  it("changes the password, signs out other devices and returns a new token", async () => {
    const user = await createUser();
    const laptop = await login(app, user);
    const phone = await login(app, user);

    const res = await request(app)
      .patch("/api/users/me/password")
      .set(bearer(laptop.token))
      .send({ currentPassword: PASSWORD, newPassword: "Br4ndNewPass" });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();

    expect((await request(app).get("/api/auth/me").set(bearer(phone.token))).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set(bearer(res.body.accessToken))).status).toBe(200);
  });

  it("requires the current password to change email", async () => {
    const user = await createUser();
    const { token } = await login(app, user);
    const wrong = await request(app).patch("/api/users/me/email").set(bearer(token)).send({ newEmail: "x@example.com", password: "nope" });
    expect(wrong.status).toBe(401);

    const ok = await request(app).patch("/api/users/me/email").set(bearer(token)).send({ newEmail: "X@Example.com", password: PASSWORD });
    expect(ok.status).toBe(200);
    expect(ok.body.user.email).toBe("x@example.com");
  });

  it("hides email and location on other people's profiles", async () => {
    const viewer = await createUser();
    const other = await createUser({ location: { latitude: 25.4, longitude: 81.8 } });
    const { token } = await login(app, viewer);

    const res = await request(app).get(`/api/users/${other._id}`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBeUndefined();
    expect(res.body.user.location).toBeUndefined();
    expect(res.body.stats).toMatchObject({ totalUploads: 0, totalCreatedClassrooms: 0 });

    const own = await request(app).get(`/api/users/${viewer._id}`).set(bearer(token));
    expect(own.body.user.email).toBe(viewer.email);
    expect(own.body.isSelf).toBe(true);
  });
});
