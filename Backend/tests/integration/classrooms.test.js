import request from "supertest";
import { describe, expect, it } from "vitest";
import createApp from "../../app.js";
import Announcement from "../../models/announcement.js";
import Classroom from "../../models/classroom.js";
import Notification from "../../models/notification.js";
import Progress from "../../models/progress.js";
import Resource from "../../models/resource.js";
import { bearer, createClassroomWithMembers, signedInUser } from "../helpers.js";
import { useTestDatabase } from "../setup/db.js";

useTestDatabase();
const app = createApp();

describe("creating and joining classrooms", () => {
  it("creates a classroom with the creator as owner and a generated join code", async () => {
    const owner = await signedInUser(app);
    const res = await request(app)
      .post("/api/classrooms")
      .set(bearer(owner.token))
      .send({ name: "Operating Systems", subject: "CS", description: "Unit 3 onwards" });

    expect(res.status).toBe(201);
    expect(res.body.classroom).toMatchObject({ name: "Operating Systems", myRole: "owner", memberCount: 1 });
    expect(res.body.classroom.joinCode).toMatch(/^[A-Z0-9]{8}$/);
  });

  it("accepts a custom join code but not a taken one", async () => {
    const owner = await signedInUser(app);
    const first = await request(app).post("/api/classrooms").set(bearer(owner.token)).send({ name: "A", subject: "B", joinCode: "dsa2025" });
    expect(first.body.classroom.joinCode).toBe("DSA2025");
    const second = await request(app).post("/api/classrooms").set(bearer(owner.token)).send({ name: "C", subject: "D", joinCode: "DSA2025" });
    expect(second.status).toBe(409);
  });

  it("lets students join with the code (case-insensitive) and hides the code from them", async () => {
    const owner = await signedInUser(app);
    const student = await signedInUser(app);
    const classroom = await createClassroomWithMembers(app, owner);

    const join = await request(app)
      .post("/api/classrooms/join")
      .set(bearer(student.token))
      .send({ joinCode: classroom.joinCode.toLowerCase() });
    expect(join.status).toBe(200);
    expect(join.body.classroom.myRole).toBe("student");
    expect(join.body.classroom.joinCode).toBeUndefined();

    const again = await request(app).post("/api/classrooms/join").set(bearer(student.token)).send({ joinCode: classroom.joinCode });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("ALREADY_MEMBER");

    // the owner gets a notification that someone joined
    expect(await Notification.countDocuments({ user: owner.user._id, type: "member_joined" })).toBe(1);
  });

  it("still accepts the old `key` field", async () => {
    const owner = await signedInUser(app);
    const student = await signedInUser(app);
    const classroom = await createClassroomWithMembers(app, owner);
    const res = await request(app).post("/api/classrooms/join").set(bearer(student.token)).send({ key: classroom.joinCode });
    expect(res.status).toBe(200);
  });

  it("404s on an unknown code", async () => {
    const student = await signedInUser(app);
    const res = await request(app).post("/api/classrooms/join").set(bearer(student.token)).send({ joinCode: "NOPE1234" });
    expect(res.status).toBe(404);
  });

  it("lists owned and joined classrooms with progress", async () => {
    const owner = await signedInUser(app);
    const student = await signedInUser(app);
    await createClassroomWithMembers(app, owner, [student]);
    await createClassroomWithMembers(app, student);

    const all = await request(app).get("/api/classrooms").set(bearer(student.token));
    expect(all.body.classrooms).toHaveLength(2);
    expect(all.body.classrooms.map((c) => c.myRole).sort()).toEqual(["owner", "student"]);
    expect(all.body.classrooms[0].progress).toEqual({ total: 0, completed: 0, percentage: 0 });

    const joined = await request(app).get("/api/classrooms?scope=joined").set(bearer(student.token));
    expect(joined.body.classrooms).toHaveLength(1);
    expect(joined.body.classrooms[0].myRole).toBe("student");
  });
});

describe("classroom permissions", () => {
  it("returns 403 NOT_A_MEMBER to outsiders and 400 for malformed ids", async () => {
    const owner = await signedInUser(app);
    const outsider = await signedInUser(app);
    const classroom = await createClassroomWithMembers(app, owner);

    const res = await request(app).get(`/api/classrooms/${classroom._id}`).set(bearer(outsider.token));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("NOT_A_MEMBER");

    expect((await request(app).get("/api/classrooms/not-an-id").set(bearer(owner.token))).status).toBe(400);
    expect((await request(app).get("/api/classrooms/65f1c0ffee0000000000abcd").set(bearer(owner.token))).status).toBe(404);
  });

  it("returns the caller's permissions with the classroom", async () => {
    const owner = await signedInUser(app);
    const student = await signedInUser(app);
    const classroom = await createClassroomWithMembers(app, owner, [student]);

    const asStudent = await request(app).get(`/api/classrooms/${classroom._id}`).set(bearer(student.token));
    expect(asStudent.body.permissions).toContain("message:send");
    expect(asStudent.body.permissions).not.toContain("announcement:create");

    const asOwner = await request(app).get(`/api/classrooms/${classroom._id}`).set(bearer(owner.token));
    expect(asOwner.body.permissions).toContain("classroom:delete");
    expect(asOwner.body.classroom.members).toHaveLength(2);
  });

  it("only lets teachers edit the classroom", async () => {
    const owner = await signedInUser(app);
    const student = await signedInUser(app);
    const classroom = await createClassroomWithMembers(app, owner, [student]);

    const denied = await request(app).patch(`/api/classrooms/${classroom._id}`).set(bearer(student.token)).send({ name: "Hacked" });
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe("INSUFFICIENT_CLASSROOM_ROLE");

    const ok = await request(app).patch(`/api/classrooms/${classroom._id}`).set(bearer(owner.token)).send({ name: "DSA (Sem 4)" });
    expect(ok.status).toBe(200);
    expect(ok.body.classroom.name).toBe("DSA (Sem 4)");
  });

  it("lets platform admins view any classroom read-only", async () => {
    const owner = await signedInUser(app);
    const admin = await signedInUser(app, { role: "admin" });
    const classroom = await createClassroomWithMembers(app, owner);

    expect((await request(app).get(`/api/classrooms/${classroom._id}`).set(bearer(admin.token))).status).toBe(200);
    const post = await request(app)
      .post(`/api/classrooms/${classroom._id}/messages`)
      .set(bearer(admin.token))
      .send({ text: "hi" });
    expect(post.status).toBe(403);
  });
});

describe("members", () => {
  it("lets the owner promote a student to teacher, who can then post announcements", async () => {
    const owner = await signedInUser(app);
    const student = await signedInUser(app);
    const classroom = await createClassroomWithMembers(app, owner, [student]);

    const before = await request(app)
      .post(`/api/classrooms/${classroom._id}/announcements`)
      .set(bearer(student.token))
      .send({ title: "Hi", body: "Test" });
    expect(before.status).toBe(403);

    const promote = await request(app)
      .patch(`/api/classrooms/${classroom._id}/members/${student.user._id}`)
      .set(bearer(owner.token))
      .send({ role: "teacher" });
    expect(promote.status).toBe(200);

    const after = await request(app)
      .post(`/api/classrooms/${classroom._id}/announcements`)
      .set(bearer(student.token))
      .send({ title: "Hi", body: "Test" });
    expect(after.status).toBe(201);
  });

  it("doesn't let a teacher change roles or remove another teacher", async () => {
    const owner = await signedInUser(app);
    const teacherA = await signedInUser(app);
    const teacherB = await signedInUser(app);
    const classroom = await createClassroomWithMembers(app, owner, [teacherA, teacherB]);
    for (const t of [teacherA, teacherB]) {
      await request(app).patch(`/api/classrooms/${classroom._id}/members/${t.user._id}`).set(bearer(owner.token)).send({ role: "teacher" });
    }

    const roleChange = await request(app)
      .patch(`/api/classrooms/${classroom._id}/members/${teacherB.user._id}`)
      .set(bearer(teacherA.token))
      .send({ role: "student" });
    expect(roleChange.status).toBe(403);

    const removal = await request(app).delete(`/api/classrooms/${classroom._id}/members/${teacherB.user._id}`).set(bearer(teacherA.token));
    expect(removal.status).toBe(403);
  });

  it("lets a teacher remove a student, which also clears their progress", async () => {
    const owner = await signedInUser(app);
    const student = await signedInUser(app);
    const classroom = await createClassroomWithMembers(app, owner, [student]);
    const resource = await Resource.create({ classroom: classroom._id, name: "notes.pdf", url: "https://example.com/n.pdf", uploadedBy: owner.user._id });
    await request(app)
      .put(`/api/classrooms/${classroom._id}/resources/${resource._id}/progress`)
      .set(bearer(student.token))
      .send({ completed: true });

    const res = await request(app).delete(`/api/classrooms/${classroom._id}/members/${student.user._id}`).set(bearer(owner.token));
    expect(res.status).toBe(200);
    expect(await Progress.countDocuments({ user: student.user._id })).toBe(0);
    expect((await request(app).get(`/api/classrooms/${classroom._id}`).set(bearer(student.token))).status).toBe(403);
  });

  it("protects the owner from removal and role changes", async () => {
    const owner = await signedInUser(app);
    const classroom = await createClassroomWithMembers(app, owner);
    const res = await request(app)
      .patch(`/api/classrooms/${classroom._id}/members/${owner.user._id}`)
      .set(bearer(owner.token))
      .send({ role: "student" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("OWNER_ROLE_LOCKED");
  });

  it("lists members with roles", async () => {
    const owner = await signedInUser(app);
    const student = await signedInUser(app);
    const classroom = await createClassroomWithMembers(app, owner, [student]);
    const res = await request(app).get(`/api/classrooms/${classroom._id}/members`).set(bearer(student.token));
    expect(res.status).toBe(200);
    expect(res.body.members.map((m) => m.role).sort()).toEqual(["owner", "student"]);
    expect(res.body.members[0]).toHaveProperty("online", false);
  });
});

describe("leaving and deleting", () => {
  it("lets students leave but not the owner", async () => {
    const owner = await signedInUser(app);
    const student = await signedInUser(app);
    const classroom = await createClassroomWithMembers(app, owner, [student]);

    expect((await request(app).post(`/api/classrooms/${classroom._id}/leave`).set(bearer(student.token))).status).toBe(200);
    expect((await request(app).post(`/api/classrooms/${classroom._id}/leave`).set(bearer(owner.token))).status).toBe(403);
  });

  it("deletes a classroom with everything in it (owner only)", async () => {
    const owner = await signedInUser(app);
    const student = await signedInUser(app);
    const classroom = await createClassroomWithMembers(app, owner, [student]);
    await request(app)
      .post(`/api/classrooms/${classroom._id}/announcements`)
      .set(bearer(owner.token))
      .send({ title: "Exam", body: "Friday" });

    expect((await request(app).delete(`/api/classrooms/${classroom._id}`).set(bearer(student.token))).status).toBe(403);
    expect((await request(app).delete(`/api/classrooms/${classroom._id}`).set(bearer(owner.token))).status).toBe(200);

    expect(await Classroom.exists({ _id: classroom._id })).toBeNull();
    expect(await Announcement.countDocuments({ classroom: classroom._id })).toBe(0);
  });

  it("regenerates the join code so the old one stops working", async () => {
    const owner = await signedInUser(app);
    const student = await signedInUser(app);
    const classroom = await createClassroomWithMembers(app, owner);

    const res = await request(app).post(`/api/classrooms/${classroom._id}/join-code`).set(bearer(owner.token));
    expect(res.body.joinCode).not.toBe(classroom.joinCode);
    const old = await request(app).post("/api/classrooms/join").set(bearer(student.token)).send({ joinCode: classroom.joinCode });
    expect(old.status).toBe(404);
  });
});

describe("resources and progress", () => {
  it("tracks per-user completion", async () => {
    const owner = await signedInUser(app);
    const student = await signedInUser(app);
    const classroom = await createClassroomWithMembers(app, owner, [student]);
    const [a] = await Resource.create([
      { classroom: classroom._id, name: "a.pdf", url: "https://example.com/a.pdf", uploadedBy: owner.user._id },
      { classroom: classroom._id, name: "b.pdf", url: "https://example.com/b.pdf", uploadedBy: owner.user._id },
    ]);

    const mark = await request(app)
      .put(`/api/classrooms/${classroom._id}/resources/${a._id}/progress`)
      .set(bearer(student.token))
      .send({ completed: true });
    expect(mark.status).toBe(200);
    expect(mark.body.progress).toEqual({ total: 2, completed: 1, percentage: 50 });

    const studentView = await request(app).get(`/api/classrooms/${classroom._id}/resources`).set(bearer(student.token));
    expect(studentView.body.resources.find((r) => r.name === "a.pdf").completed).toBe(true);
    const ownerView = await request(app).get(`/api/classrooms/${classroom._id}/resources`).set(bearer(owner.token));
    expect(ownerView.body.progress.completed).toBe(0);
  });

  it("only lets the uploader or a teacher delete a file", async () => {
    const owner = await signedInUser(app);
    const studentA = await signedInUser(app);
    const studentB = await signedInUser(app);
    const classroom = await createClassroomWithMembers(app, owner, [studentA, studentB]);
    const resource = await Resource.create({ classroom: classroom._id, name: "a.pdf", url: "https://example.com/a.pdf", uploadedBy: studentA.user._id });

    expect((await request(app).delete(`/api/classrooms/${classroom._id}/resources/${resource._id}`).set(bearer(studentB.token))).status).toBe(403);
    expect((await request(app).delete(`/api/classrooms/${classroom._id}/resources/${resource._id}`).set(bearer(owner.token))).status).toBe(200);
  });

  it("explains when file storage isn't configured", async () => {
    const owner = await signedInUser(app);
    const classroom = await createClassroomWithMembers(app, owner);
    const res = await request(app)
      .post(`/api/classrooms/${classroom._id}/resources`)
      .set(bearer(owner.token))
      .attach("file", Buffer.from("%PDF-1.4 test"), { filename: "notes.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe("STORAGE_NOT_CONFIGURED");
  });

  it("rejects unsupported file types", async () => {
    const owner = await signedInUser(app);
    const classroom = await createClassroomWithMembers(app, owner);
    const res = await request(app)
      .post(`/api/classrooms/${classroom._id}/resources`)
      .set(bearer(owner.token))
      .attach("file", Buffer.from("MZ..."), { filename: "virus.exe", contentType: "application/x-msdownload" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("UNSUPPORTED_FILE_TYPE");
  });
});
