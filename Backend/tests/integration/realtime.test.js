import http from "node:http";
import { io as connect } from "socket.io-client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import createApp from "../../app.js";
import Whiteboard from "../../models/whiteboard.js";
import initSocket from "../../socket/index.js";
import { resetPresence } from "../../socket/presence.js";
import { bearer, createClassroomWithMembers, signedInUser } from "../helpers.js";
import { useTestDatabase } from "../setup/db.js";

useTestDatabase();

const app = createApp();
const server = http.createServer(app);
let io;
let url;
const sockets = [];

beforeAll(async () => {
  io = initSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});

afterEach(() => {
  while (sockets.length) sockets.pop().disconnect();
  resetPresence();
});

afterAll(async () => {
  await new Promise((resolve) => io.close(() => resolve()));
});

const openSocket = (token) =>
  new Promise((resolve, reject) => {
    const socket = connect(url, { auth: { token }, transports: ["websocket"], reconnection: false, forceNew: true });
    sockets.push(socket);
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });

const once = (socket, event, timeout = 3000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), timeout);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

const emitWithAck = (socket, event, payload) => socket.timeout(3000).emitWithAck(event, payload);

describe("socket authentication", () => {
  it("rejects connections without a valid access token", async () => {
    await expect(openSocket(undefined)).rejects.toMatchObject({ data: { code: "NO_TOKEN" } });
    await expect(openSocket("not-a-jwt")).rejects.toMatchObject({ data: { code: "INVALID_TOKEN" } });
  });

  it("accepts a valid token", async () => {
    const { token } = await signedInUser(app);
    const socket = await openSocket(token);
    expect(socket.connected).toBe(true);
  });
});

describe("classroom rooms", () => {
  const setup = async () => {
    const teacher = await signedInUser(app);
    const student = await signedInUser(app);
    const classroom = await createClassroomWithMembers(app, teacher, [student]);
    const teacherSocket = await openSocket(teacher.token);
    const studentSocket = await openSocket(student.token);
    return { teacher, student, classroom, teacherSocket, studentSocket };
  };

  it("only lets members join a classroom's room", async () => {
    const { classroom } = await setup();
    const outsider = await signedInUser(app);
    const outsiderSocket = await openSocket(outsider.token);
    const reply = await emitWithAck(outsiderSocket, "classroom:join", classroom._id);
    expect(reply.ok).toBe(false);
  });

  it("broadcasts new chat messages to everyone in the room", async () => {
    const { teacher, classroom, teacherSocket, studentSocket } = await setup();
    await emitWithAck(teacherSocket, "classroom:join", classroom._id);
    await emitWithAck(studentSocket, "classroom:join", classroom._id);

    const received = once(studentSocket, "message:new");
    await request(app).post(`/api/classrooms/${classroom._id}/messages`).set(bearer(teacher.token)).send({ text: "class starts at 10" });

    const { message } = await received;
    expect(message.text).toBe("class starts at 10");
    expect(message.sender.name).toBe(teacher.user.name);
  });

  it("pushes announcements live and a personal notification", async () => {
    const { teacher, classroom, studentSocket } = await setup();
    await emitWithAck(studentSocket, "classroom:join", classroom._id);

    const announcement = once(studentSocket, "announcement:created");
    const notification = once(studentSocket, "notification:new");
    await request(app)
      .post(`/api/classrooms/${classroom._id}/announcements`)
      .set(bearer(teacher.token))
      .send({ title: "Assignment 2", body: "Due Monday" });

    expect((await announcement).announcement.title).toBe("Assignment 2");
    expect((await notification).type).toBe("announcement");
  });

  it("tracks presence and typing", async () => {
    const { teacher, student, classroom, teacherSocket, studentSocket } = await setup();
    const first = await emitWithAck(teacherSocket, "classroom:join", classroom._id);
    expect(first.onlineUserIds).toEqual([teacher.user._id.toString()]);

    const online = once(teacherSocket, "presence:online");
    const second = await emitWithAck(studentSocket, "classroom:join", classroom._id);
    expect(second.onlineUserIds.sort()).toEqual([teacher.user._id.toString(), student.user._id.toString()].sort());
    expect((await online).userId).toBe(student.user._id.toString());

    const typing = once(teacherSocket, "typing");
    studentSocket.emit("typing:start", { classroomId: classroom._id });
    expect(await typing).toMatchObject({ userId: student.user._id.toString(), isTyping: true });

    const offline = once(teacherSocket, "presence:offline");
    studentSocket.disconnect();
    expect((await offline).userId).toBe(student.user._id.toString());
  });

  it("disconnects users when an admin blocks them", async () => {
    const admin = await signedInUser(app, { role: "admin" });
    const target = await signedInUser(app);
    const socket = await openSocket(target.token);

    const disconnected = once(socket, "disconnect");
    await request(app).patch(`/api/admin/users/${target.user._id}/status`).set(bearer(admin.token)).send({ blocked: true });
    expect(await disconnected).toMatch(/disconnect|close/);
  });
});

describe("whiteboards", () => {
  it("syncs drawing between members and persists it", async () => {
    const teacher = await signedInUser(app);
    const student = await signedInUser(app);
    const classroom = await createClassroomWithMembers(app, teacher, [student]);
    const a = await openSocket(teacher.token);
    const b = await openSocket(student.token);

    expect((await emitWithAck(a, "whiteboard:join", classroom._id)).ok).toBe(true);
    expect((await emitWithAck(b, "whiteboard:join", classroom._id)).ok).toBe(true);

    const element = { type: "draw", x1: 1, y1: 2, x2: 3, y2: 4, color: "#000000", brushSize: 4 };
    const received = once(b, "whiteboard:element");
    a.emit("whiteboard:element", { roomId: classroom._id, element });
    expect((await received).element).toEqual(element);

    // writes are batched; wait for the flush
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const board = await Whiteboard.findOne({ roomId: classroom._id });
    expect(board.elements).toHaveLength(1);

    const saved = await request(app).get(`/api/whiteboards/${classroom._id}`).set(bearer(student.token));
    expect(saved.body.elements).toHaveLength(1);
  });

  it("keeps people out of other users' personal boards", async () => {
    const owner = await signedInUser(app);
    const other = await signedInUser(app);
    const roomId = `personal-${owner.user._id}`;

    expect((await request(app).get(`/api/whiteboards/${roomId}`).set(bearer(owner.token))).status).toBe(200);
    expect((await request(app).get(`/api/whiteboards/${roomId}`).set(bearer(other.token))).status).toBe(403);

    const socket = await openSocket(other.token);
    expect((await emitWithAck(socket, "whiteboard:join", roomId)).ok).toBe(false);
  });
});
