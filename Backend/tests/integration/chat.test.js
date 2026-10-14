import request from "supertest";
import { describe, expect, it } from "vitest";
import createApp from "../../app.js";
import Message from "../../models/message.js";
import { bearer, createClassroomWithMembers, signedInUser } from "../helpers.js";
import { useTestDatabase } from "../setup/db.js";

useTestDatabase();
const app = createApp();

const setup = async () => {
  const teacher = await signedInUser(app);
  const alice = await signedInUser(app);
  const bob = await signedInUser(app);
  const classroom = await createClassroomWithMembers(app, teacher, [alice, bob]);
  return { teacher, alice, bob, classroom, base: `/api/classrooms/${classroom._id}` };
};

const send = (base, who, text) => request(app).post(`${base}/messages`).set(bearer(who.token)).send({ text });

describe("messages", () => {
  it("sends and lists messages oldest-first with the sender populated", async () => {
    const { alice, bob, base } = await setup();
    const first = await send(base, alice, "hello");
    expect(first.status).toBe(201);
    expect(first.body.message.sender.name).toBe(alice.user.name);
    await send(base, bob, "hi alice");

    const res = await request(app).get(`${base}/messages`).set(bearer(alice.token));
    expect(res.status).toBe(200);
    expect(res.body.messages.map((m) => m.text)).toEqual(["hello", "hi alice"]);
    expect(res.body.hasMore).toBe(false);
  });

  it("pages back through history with `before`", async () => {
    const { alice, base, classroom } = await setup();
    const start = Date.now() - 60_000;
    await Message.insertMany(
      Array.from({ length: 5 }, (_, i) => ({
        classroom: classroom._id,
        sender: alice.user._id,
        text: `m${i}`,
        createdAt: new Date(start + i * 1000),
      }))
    );

    const latest = await request(app).get(`${base}/messages?limit=2`).set(bearer(alice.token));
    expect(latest.body.messages.map((m) => m.text)).toEqual(["m3", "m4"]);
    expect(latest.body.hasMore).toBe(true);

    const older = await request(app)
      .get(`${base}/messages?limit=2&before=${encodeURIComponent(latest.body.messages[0].createdAt)}`)
      .set(bearer(alice.token));
    expect(older.body.messages.map((m) => m.text)).toEqual(["m1", "m2"]);
  });

  it("only lets the sender edit a message", async () => {
    const { alice, bob, base } = await setup();
    const sent = await send(base, alice, "typo");
    const id = sent.body.message._id;

    expect((await request(app).patch(`${base}/messages/${id}`).set(bearer(bob.token)).send({ text: "nope" })).status).toBe(403);
    const edited = await request(app).patch(`${base}/messages/${id}`).set(bearer(alice.token)).send({ text: "fixed" });
    expect(edited.status).toBe(200);
    expect(edited.body.message.text).toBe("fixed");
    expect(edited.body.message.editedAt).toBeTruthy();
  });

  it("lets the sender or a teacher delete, but not other students", async () => {
    const { teacher, alice, bob, base } = await setup();
    const one = await send(base, alice, "one");
    const two = await send(base, alice, "two");

    expect((await request(app).delete(`${base}/messages/${one.body.message._id}`).set(bearer(bob.token))).status).toBe(403);
    expect((await request(app).delete(`${base}/messages/${one.body.message._id}`).set(bearer(alice.token))).status).toBe(200);
    expect((await request(app).delete(`${base}/messages/${two.body.message._id}`).set(bearer(teacher.token))).status).toBe(200);
  });

  it("bulk-deletes only the caller's own messages", async () => {
    const { alice, bob, base } = await setup();
    const mine = await send(base, alice, "mine");
    const theirs = await send(base, bob, "theirs");

    const res = await request(app)
      .post(`${base}/messages/bulk-delete`)
      .set(bearer(alice.token))
      .send({ messageIds: [mine.body.message._id, theirs.body.message._id] });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ deletedCount: 1, skippedCount: 1 });
    expect(await Message.exists({ _id: theirs.body.message._id })).not.toBeNull();
  });

  it("marks messages as seen", async () => {
    const { alice, bob, base } = await setup();
    await send(base, alice, "read me");
    const res = await request(app).post(`${base}/messages/seen`).set(bearer(bob.token));
    expect(res.body.updated).toBe(1);
    const message = await Message.findOne({ text: "read me" });
    expect(message.seenBy.map(String)).toContain(bob.user._id.toString());
  });

  it("keeps non-members out", async () => {
    const { base } = await setup();
    const outsider = await signedInUser(app);
    expect((await request(app).get(`${base}/messages`).set(bearer(outsider.token))).status).toBe(403);
    expect((await send(base, outsider, "let me in")).status).toBe(403);
  });

  it("rejects empty and overly long messages", async () => {
    const { alice, base } = await setup();
    expect((await send(base, alice, "   ")).status).toBe(400);
    expect((await send(base, alice, "x".repeat(2001))).status).toBe(400);
  });
});

describe("polls", () => {
  it("creates a poll, ignoring blank options", async () => {
    const { alice, base } = await setup();
    const res = await request(app)
      .post(`${base}/polls`)
      .set(bearer(alice.token))
      .send({ question: "Extra class on Saturday?", options: ["Yes", "No", "  "] });
    expect(res.status).toBe(201);
    expect(res.body.poll.options.map((o) => o.text)).toEqual(["Yes", "No"]);
  });

  it("needs at least two options", async () => {
    const { alice, base } = await setup();
    const res = await request(app).post(`${base}/polls`).set(bearer(alice.token)).send({ question: "?", options: ["only"] });
    expect(res.status).toBe(400);
  });

  it("allows one vote per person, moving it or removing it", async () => {
    const { alice, bob, base } = await setup();
    const created = await request(app).post(`${base}/polls`).set(bearer(alice.token)).send({ question: "Pick", options: ["A", "B"] });
    const url = `${base}/polls/${created.body.poll._id}/vote`;
    const votes = (poll) => poll.options.map((o) => o.votes.length);

    expect(votes((await request(app).post(url).set(bearer(alice.token)).send({ optionIndex: 0 })).body.poll)).toEqual([1, 0]);
    expect(votes((await request(app).post(url).set(bearer(bob.token)).send({ optionIndex: 0 })).body.poll)).toEqual([2, 0]);
    // alice switches to B
    expect(votes((await request(app).post(url).set(bearer(alice.token)).send({ optionIndex: 1 })).body.poll)).toEqual([1, 1]);
    // alice clicks B again to take her vote back
    const removed = await request(app).post(url).set(bearer(alice.token)).send({ optionIndex: 1 });
    expect(votes(removed.body.poll)).toEqual([1, 0]);
    expect(removed.body.myVote).toBeNull();

    expect((await request(app).post(url).set(bearer(bob.token)).send({ optionIndex: 5 })).status).toBe(400);
  });

  it("only lets the creator or a teacher delete or close a poll", async () => {
    const { teacher, alice, bob, base } = await setup();
    const created = await request(app).post(`${base}/polls`).set(bearer(alice.token)).send({ question: "Pick", options: ["A", "B"] });
    const url = `${base}/polls/${created.body.poll._id}`;

    expect((await request(app).delete(url).set(bearer(bob.token))).status).toBe(403);
    const closed = await request(app).patch(url).set(bearer(teacher.token)).send({ closed: true });
    expect(closed.body.poll.closed).toBe(true);
    expect((await request(app).post(`${url}/vote`).set(bearer(bob.token)).send({ optionIndex: 0 })).body.code).toBe("POLL_CLOSED");
    expect((await request(app).delete(url).set(bearer(alice.token))).status).toBe(200);
  });
});
