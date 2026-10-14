import request from "supertest";
import { describe, expect, it } from "vitest";
import createApp from "../../app.js";
import Classroom from "../../models/classroom.js";
import Notification from "../../models/notification.js";
import User from "../../models/user.js";
import { PASSWORD, bearer, createClassroomWithMembers, createOtp, signedInUser } from "../helpers.js";
import { useTestDatabase } from "../setup/db.js";

useTestDatabase();
const app = createApp();

describe("admin access control", () => {
  it("keeps regular users out of admin endpoints", async () => {
    const { token } = await signedInUser(app);
    for (const path of ["/api/admin/users", "/api/admin/stats/overview", "/api/admin/activity", "/api/admin/locations"]) {
      const res = await request(app).get(path).set(bearer(token));
      expect(res.status, path).toBe(403);
    }
  });

  it("lets admins list and search users without exposing secrets", async () => {
    const admin = await signedInUser(app, { role: "admin" });
    await signedInUser(app, { name: "Riya Sharma" });

    const res = await request(app).get("/api/admin/users?search=riya").set(bearer(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0]).not.toHaveProperty("password");
    expect(res.body.users[0]).not.toHaveProperty("sessions");
    expect(res.body.users[0].uploadsCount).toBe(0);
    expect(res.body.pagination).toMatchObject({ page: 1, total: 1 });
  });

  it("treats regex characters in search as plain text", async () => {
    const admin = await signedInUser(app, { role: "admin" });
    const res = await request(app).get("/api/admin/users?search=.*").set(bearer(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(0);
  });
});

describe("blocking users", () => {
  it("blocks a user, kills their sessions, and lets them back in after unblocking", async () => {
    const admin = await signedInUser(app, { role: "admin" });
    const target = await signedInUser(app);

    const block = await request(app)
      .patch(`/api/admin/users/${target.user._id}/status`)
      .set(bearer(admin.token))
      .send({ blocked: true });
    expect(block.status).toBe(200);

    expect((await request(app).get("/api/auth/me").set(bearer(target.token))).status).toBe(401);
    const login = await request(app).post("/api/auth/login").send({ identifier: target.user.email, password: PASSWORD });
    expect(login.body.code).toBe("ACCOUNT_BLOCKED");

    await request(app).patch(`/api/admin/users/${target.user._id}/status`).set(bearer(admin.token)).send({ blocked: false });
    expect((await request(app).post("/api/auth/login").send({ identifier: target.user.email, password: PASSWORD })).status).toBe(200);
  });

  it("doesn't let an admin block another admin, a superadmin, or themselves", async () => {
    const admin = await signedInUser(app, { role: "admin" });
    const otherAdmin = await signedInUser(app, { role: "admin" });
    const superadmin = await signedInUser(app, { role: "superadmin" });

    const peer = await request(app).patch(`/api/admin/users/${otherAdmin.user._id}/status`).set(bearer(admin.token)).send({ blocked: true });
    expect(peer.status).toBe(403);
    const boss = await request(app).patch(`/api/admin/users/${superadmin.user._id}/status`).set(bearer(admin.token)).send({ blocked: true });
    expect(boss.status).toBe(403);
    const self = await request(app).patch(`/api/admin/users/${admin.user._id}/status`).set(bearer(admin.token)).send({ blocked: true });
    expect(self.status).toBe(400);
  });
});

describe("changing roles", () => {
  it("only lets superadmins promote and demote", async () => {
    const admin = await signedInUser(app, { role: "admin" });
    const superadmin = await signedInUser(app, { role: "superadmin" });
    const target = await signedInUser(app);

    const byAdmin = await request(app).patch(`/api/admin/users/${target.user._id}/role`).set(bearer(admin.token)).send({ role: "admin" });
    expect(byAdmin.status).toBe(403);

    const promote = await request(app).patch(`/api/admin/users/${target.user._id}/role`).set(bearer(superadmin.token)).send({ role: "admin" });
    expect(promote.status).toBe(200);
    expect((await User.findById(target.user._id)).role).toBe("admin");

    // their old token carried the old role, so it's revoked
    expect((await request(app).get("/api/auth/me").set(bearer(target.token))).status).toBe(401);
  });

  it("won't create new superadmins through the API", async () => {
    const superadmin = await signedInUser(app, { role: "superadmin" });
    const target = await signedInUser(app);
    const res = await request(app).patch(`/api/admin/users/${target.user._id}/role`).set(bearer(superadmin.token)).send({ role: "superadmin" });
    expect(res.status).toBe(400);
  });
});

describe("deleting users", () => {
  it("removes the account, the classrooms it owns and its memberships", async () => {
    const admin = await signedInUser(app, { role: "admin" });
    const owner = await signedInUser(app);
    const student = await signedInUser(app);
    const ownedClassroom = await createClassroomWithMembers(app, owner, [student]);

    const other = await signedInUser(app);
    const otherClassroom = await createClassroomWithMembers(app, other, [owner]);

    const res = await request(app).delete(`/api/admin/users/${owner.user._id}`).set(bearer(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.deletedClassrooms).toBe(1);

    expect(await User.exists({ _id: owner.user._id })).toBeNull();
    expect(await Classroom.exists({ _id: ownedClassroom._id })).toBeNull();
    const remaining = await Classroom.findById(otherClassroom._id);
    expect(remaining.members.map((m) => m.user.toString())).not.toContain(owner.user._id.toString());
  });
});

describe("stats and activity feed", () => {
  it("reports platform totals and the registration feed", async () => {
    const admin = await signedInUser(app, { role: "admin" });
    await signedInUser(app);

    await createOtp("feed@example.com");
    await request(app).post("/api/auth/register").send({
      name: "Feed Test",
      username: "feedtest",
      email: "feed@example.com",
      password: "Str0ngPass",
      course: "BCA",
      college: "IIIT",
      otp: "123456",
    });

    const overview = await request(app).get("/api/admin/stats/overview").set(bearer(admin.token));
    expect(overview.status).toBe(200);
    expect(overview.body.stats).toMatchObject({ totalUsers: 2, totalAdmins: 1, totalUploads: 0 });

    const ranged = await request(app).get("/api/admin/stats?range=overall").set(bearer(admin.token));
    expect(ranged.status).toBe(200);
    expect(ranged.body.stats.activeUsersCount).toBeGreaterThanOrEqual(2);

    const feed = await request(app).get("/api/admin/notifications").set(bearer(admin.token));
    expect(feed.body.notifications.some((n) => n.message.includes("@feedtest"))).toBe(true);
    expect(await Notification.countDocuments({ audience: "admin" })).toBe(1);

    const activity = await request(app).get("/api/admin/activity?scope=today").set(bearer(admin.token));
    expect(activity.status).toBe(200);
    expect(activity.body.activity.length).toBeGreaterThanOrEqual(2);
  });
});
