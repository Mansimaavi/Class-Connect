import request from "supertest";
import { describe, expect, it } from "vitest";
import createApp from "../../app.js";
import ClassNote from "../../models/classNote.js";
import Notification from "../../models/notification.js";
import Question from "../../models/question.js";
import { bearer, signedInUser } from "../helpers.js";
import { useTestDatabase } from "../setup/db.js";

useTestDatabase();
const app = createApp();

const makeNote = (uploader, overrides = {}) =>
  ClassNote.create({
    title: "Graph Algorithms",
    topic: "BFS & DFS",
    subject: "DSA",
    url: "https://res.cloudinary.com/demo/raw/upload/graphs.pdf",
    uploadedBy: uploader.user._id,
    ...overrides,
  });

describe("class notes", () => {
  it("lists notes publicly with filters, sorting and subjects", async () => {
    const author = await signedInUser(app);
    await makeNote(author, { title: "Graphs", subject: "DSA", averageRating: 4.5 });
    await makeNote(author, { title: "Transactions", subject: "DBMS", averageRating: 3 });

    const all = await request(app).get("/api/class-notes?sort=rating");
    expect(all.status).toBe(200);
    expect(all.body.notes.map((n) => n.title)).toEqual(["Graphs", "Transactions"]);
    expect(all.body.subjects).toEqual(["DBMS", "DSA"]);

    const filtered = await request(app).get("/api/class-notes?subject=DBMS");
    expect(filtered.body.notes).toHaveLength(1);

    const searched = await request(app).get("/api/class-notes?search=graph");
    expect(searched.body.notes.map((n) => n.title)).toEqual(["Graphs"]);
  });

  it("averages ratings and lets each user change theirs", async () => {
    const author = await signedInUser(app);
    const a = await signedInUser(app);
    const b = await signedInUser(app);
    const note = await makeNote(author);

    await request(app).post(`/api/class-notes/${note._id}/rating`).set(bearer(a.token)).send({ rating: 5 });
    const second = await request(app).post(`/api/class-notes/${note._id}/rating`).set(bearer(b.token)).send({ rating: 2 });
    expect(second.body).toMatchObject({ averageRating: 3.5, ratingCount: 2 });

    const changed = await request(app).post(`/api/class-notes/${note._id}/rating`).set(bearer(a.token)).send({ rating: 4 });
    expect(changed.body).toMatchObject({ averageRating: 3, ratingCount: 2 });

    const listed = await request(app).get("/api/class-notes").set(bearer(a.token));
    expect(listed.body.notes[0].myRating).toBe(4);
    expect(listed.body.notes[0].ratings).toBeUndefined();
  });

  it("rejects out-of-range ratings and anonymous reviews", async () => {
    const author = await signedInUser(app);
    const note = await makeNote(author);
    expect((await request(app).post(`/api/class-notes/${note._id}/rating`).set(bearer(author.token)).send({ rating: 9 })).status).toBe(400);
    expect((await request(app).post(`/api/class-notes/${note._id}/reviews`).send({ text: "great" })).status).toBe(401);
  });

  it("stores reviews with the reviewer", async () => {
    const author = await signedInUser(app);
    const reader = await signedInUser(app);
    const note = await makeNote(author);
    const res = await request(app).post(`/api/class-notes/${note._id}/reviews`).set(bearer(reader.token)).send({ text: "Very clear", rating: 5 });
    expect(res.status).toBe(201);
    expect(res.body.review.user.name).toBe(reader.user.name);
    expect(res.body.averageRating).toBe(5);
  });

  it("counts views and only lets the uploader or an admin delete", async () => {
    const author = await signedInUser(app);
    const other = await signedInUser(app);
    const admin = await signedInUser(app, { role: "admin" });
    const note = await makeNote(author);

    expect((await request(app).post(`/api/class-notes/${note._id}/view`)).body.viewCount).toBe(1);
    expect((await request(app).delete(`/api/class-notes/${note._id}`).set(bearer(other.token))).status).toBe(403);
    expect((await request(app).delete(`/api/class-notes/${note._id}`).set(bearer(admin.token))).status).toBe(200);
  });
});

describe("discussion", () => {
  it("lets signed-in users ask and answer; anyone can read", async () => {
    const asker = await signedInUser(app);
    const helper = await signedInUser(app);

    expect((await request(app).post("/api/questions").send({ title: "How does Dijkstra work?" })).status).toBe(401);

    const asked = await request(app).post("/api/questions").set(bearer(asker.token)).send({ title: "How does Dijkstra work?" });
    expect(asked.status).toBe(201);
    const id = asked.body.question._id;

    const answered = await request(app)
      .post(`/api/questions/${id}/answers`)
      .set(bearer(helper.token))
      .send({ text: "Greedy: always expand the closest unvisited node." });
    expect(answered.status).toBe(201);

    const list = await request(app).get("/api/questions");
    expect(list.body.questions[0]).toMatchObject({ title: "How does Dijkstra work?", answerCount: 1 });
    expect(list.body.questions[0].author.name).toBe(asker.user.name);

    const answers = await request(app).get(`/api/questions/${id}/answers`);
    expect(answers.body.answers[0]).toMatchObject({ likes: 0, dislikes: 0, myReaction: null });
    expect(answers.body.answers[0].likedBy).toBeUndefined();
  });

  it("toggles reactions so each person counts once", async () => {
    const asker = await signedInUser(app);
    const voter = await signedInUser(app);
    const q = await request(app).post("/api/questions").set(bearer(asker.token)).send({ title: "Best book for OS?" });
    const a = await request(app).post(`/api/questions/${q.body.question._id}/answers`).set(bearer(asker.token)).send({ text: "Galvin" });
    const url = `/api/answers/${a.body.answer._id}/reaction`;

    expect((await request(app).post(url).set(bearer(voter.token)).send({ type: "like" })).body).toMatchObject({ likes: 1, dislikes: 0, myReaction: "like" });
    expect((await request(app).post(url).set(bearer(voter.token)).send({ type: "dislike" })).body).toMatchObject({ likes: 0, dislikes: 1, myReaction: "dislike" });
    expect((await request(app).post(url).set(bearer(voter.token)).send({ type: "dislike" })).body).toMatchObject({ likes: 0, dislikes: 0, myReaction: null });
  });

  it("deletes a question with its answers (author only)", async () => {
    const asker = await signedInUser(app);
    const other = await signedInUser(app);
    const q = await request(app).post("/api/questions").set(bearer(asker.token)).send({ title: "Delete me please" });
    const url = `/api/questions/${q.body.question._id}`;

    expect((await request(app).delete(url).set(bearer(other.token))).status).toBe(403);
    expect((await request(app).delete(url).set(bearer(asker.token))).status).toBe(200);
    expect(await Question.countDocuments()).toBe(0);
  });
});

describe("notifications", () => {
  it("lists my notifications and marks them read", async () => {
    const user = await signedInUser(app);
    await Notification.create([
      { user: user.user._id, type: "system", title: "Welcome", message: "Hello!" },
      { user: user.user._id, type: "system", title: "Tip", message: "Try the whiteboard" },
    ]);

    const list = await request(app).get("/api/notifications").set(bearer(user.token));
    expect(list.body.unreadCount).toBe(2);

    await request(app).patch(`/api/notifications/${list.body.notifications[0]._id}/read`).set(bearer(user.token));
    expect((await request(app).get("/api/notifications").set(bearer(user.token))).body.unreadCount).toBe(1);

    await request(app).patch("/api/notifications/read-all").set(bearer(user.token));
    expect((await request(app).get("/api/notifications?unreadOnly=true").set(bearer(user.token))).body.notifications).toHaveLength(0);
  });

  it("doesn't let users read someone else's notification", async () => {
    const owner = await signedInUser(app);
    const other = await signedInUser(app);
    const [note] = await Notification.create([{ user: owner.user._id, type: "system", title: "Private", message: "…" }]);
    expect((await request(app).patch(`/api/notifications/${note._id}/read`).set(bearer(other.token))).status).toBe(404);
  });
});

describe("health", () => {
  it("reports ready when the database is connected", async () => {
    const res = await request(app).get("/api/health/ready");
    expect(res.status).toBe(200);
    expect(res.body.database).toBe("connected");
  });
});
