import request from "supertest";
import { describe, expect, it } from "vitest";
import createApp from "../../app.js";
import Notification from "../../models/notification.js";
import { bearer, createClassroomWithMembers, signedInUser } from "../helpers.js";
import { useTestDatabase } from "../setup/db.js";

useTestDatabase();
const app = createApp();

const setup = async () => {
  const teacher = await signedInUser(app);
  const studentA = await signedInUser(app);
  const studentB = await signedInUser(app);
  const classroom = await createClassroomWithMembers(app, teacher, [studentA, studentB]);
  const base = `/api/classrooms/${classroom._id}/announcements`;
  return { teacher, studentA, studentB, classroom, base };
};

describe("announcements", () => {
  it("lets teachers post and notifies every other member", async () => {
    const { teacher, studentA, studentB, base } = await setup();
    const res = await request(app)
      .post(base)
      .set(bearer(teacher.token))
      .send({ title: "Mid-sem syllabus", body: "Units 1-3. Bring a calculator.", dueDate: "2026-11-01T10:00:00.000Z" });

    expect(res.status).toBe(201);
    expect(res.body.announcement).toMatchObject({ title: "Mid-sem syllabus", pinned: false });
    expect(res.body.announcement.author.name).toBe(teacher.user.name);

    for (const student of [studentA, studentB]) {
      expect(await Notification.countDocuments({ user: student.user._id, type: "announcement" })).toBe(1);
    }
    // the author isn't notified about their own post
    expect(await Notification.countDocuments({ user: teacher.user._id, type: "announcement" })).toBe(0);
  });

  it("keeps students from posting, editing or deleting", async () => {
    const { teacher, studentA, base } = await setup();
    const post = await request(app).post(base).set(bearer(studentA.token)).send({ title: "x", body: "y" });
    expect(post.status).toBe(403);

    const created = await request(app).post(base).set(bearer(teacher.token)).send({ title: "Quiz", body: "Tomorrow" });
    const id = created.body.announcement._id;
    expect((await request(app).patch(`${base}/${id}`).set(bearer(studentA.token)).send({ title: "Cancelled!" })).status).toBe(403);
    expect((await request(app).delete(`${base}/${id}`).set(bearer(studentA.token))).status).toBe(403);
  });

  it("validates input with field-level details", async () => {
    const { teacher, base } = await setup();
    const res = await request(app).post(base).set(bearer(teacher.token)).send({ title: "   ", body: "" });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.field).sort()).toEqual(["body", "title"]);
  });

  it("lists pinned announcements first, then newest, with pagination", async () => {
    const { teacher, studentA, base } = await setup();
    const make = (title, pinned = false) => request(app).post(base).set(bearer(teacher.token)).send({ title, body: "…", pinned });
    await make("first");
    await make("pinned", true);
    await make("third");

    const page1 = await request(app).get(`${base}?limit=2`).set(bearer(studentA.token));
    expect(page1.status).toBe(200);
    expect(page1.body.announcements.map((a) => a.title)).toEqual(["pinned", "third"]);
    expect(page1.body.pagination).toEqual({ page: 1, limit: 2, total: 3, pages: 2 });

    const page2 = await request(app).get(`${base}?limit=2&page=2`).set(bearer(studentA.token));
    expect(page2.body.announcements.map((a) => a.title)).toEqual(["first"]);
  });

  it("lets teachers edit and pin, marking edits", async () => {
    const { teacher, base } = await setup();
    const created = await request(app).post(base).set(bearer(teacher.token)).send({ title: "Lab", body: "Room 101" });
    const id = created.body.announcement._id;

    const res = await request(app).patch(`${base}/${id}`).set(bearer(teacher.token)).send({ body: "Room 204", pinned: true });
    expect(res.status).toBe(200);
    expect(res.body.announcement).toMatchObject({ body: "Room 204", pinned: true });
    expect(res.body.announcement.editedAt).toBeTruthy();
  });

  it("keeps announcements scoped to their classroom", async () => {
    const one = await setup();
    const two = await setup();
    const created = await request(app).post(one.base).set(bearer(one.teacher.token)).send({ title: "A", body: "B" });

    // a teacher of another classroom can't reach it through their own classroom's URL
    const res = await request(app).get(`${two.base}/${created.body.announcement._id}`).set(bearer(two.teacher.token));
    expect(res.status).toBe(404);
  });
});

describe("comments", () => {
  it("lets members comment and delete their own comments only", async () => {
    const { teacher, studentA, studentB, base } = await setup();
    const created = await request(app).post(base).set(bearer(teacher.token)).send({ title: "Doubts?", body: "Ask here" });
    const id = created.body.announcement._id;

    const comment = await request(app).post(`${base}/${id}/comments`).set(bearer(studentA.token)).send({ text: "Is unit 4 included?" });
    expect(comment.status).toBe(201);
    expect(comment.body.comment.author.name).toBe(studentA.user.name);
    const commentId = comment.body.comment._id;

    expect((await request(app).delete(`${base}/${id}/comments/${commentId}`).set(bearer(studentB.token))).status).toBe(403);
    expect((await request(app).delete(`${base}/${id}/comments/${commentId}`).set(bearer(studentA.token))).status).toBe(200);

    const after = await request(app).get(`${base}/${id}`).set(bearer(teacher.token));
    expect(after.body.announcement.comments).toHaveLength(0);
  });

  it("lets teachers remove any comment", async () => {
    const { teacher, studentA, base } = await setup();
    const created = await request(app).post(base).set(bearer(teacher.token)).send({ title: "Post", body: "…" });
    const id = created.body.announcement._id;
    const comment = await request(app).post(`${base}/${id}/comments`).set(bearer(studentA.token)).send({ text: "spam" });

    const res = await request(app).delete(`${base}/${id}/comments/${comment.body.comment._id}`).set(bearer(teacher.token));
    expect(res.status).toBe(200);
  });
});
