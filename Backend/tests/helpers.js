import request from "supertest";
import { ROLES } from "../config/permissions.js";
import OtpCode from "../models/otpCode.js";
import User from "../models/user.js";
import { sha256 } from "../utils/crypto.js";

export const PASSWORD = "Passw0rd!";

let counter = 0;

export const createUser = async (overrides = {}) => {
  counter += 1;
  return User.create({
    name: `Test User ${counter}`,
    username: `user${counter}_${Date.now() % 100000}`,
    email: `user${counter}_${Date.now()}@example.com`,
    password: PASSWORD,
    course: "B.Tech CSE",
    college: "MNNIT Allahabad",
    role: ROLES.USER,
    ...overrides,
  });
};

export const createOtp = (email, code = "123456") =>
  OtpCode.create({ email, purpose: "register", codeHash: sha256(`${email}:${code}`) });

const refreshCookieFrom = (response) =>
  (response.headers["set-cookie"] || []).find((cookie) => cookie.startsWith("cc_refresh="));

/** Signs in through the API; returns the access token and the raw refresh cookie. */
export const login = async (app, user, password = PASSWORD) => {
  const response = await request(app).post("/api/auth/login").send({ identifier: user.email, password });
  if (response.status !== 200 || !response.body.accessToken) {
    throw new Error(`login failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return { token: response.body.accessToken, cookie: refreshCookieFrom(response), body: response.body };
};

/** Creates a user and signs them in. */
export const signedInUser = async (app, overrides = {}) => {
  const user = await createUser(overrides);
  const { token, cookie } = await login(app, user);
  return { user, token, cookie };
};

export const bearer = (token) => ({ Authorization: `Bearer ${token}` });

export const cookieValue = (setCookie) => setCookie?.split(";")[0];

export { refreshCookieFrom };

/** Creates a classroom owned by `owner` and has every `students` member join it. */
export const createClassroomWithMembers = async (app, owner, students = []) => {
  const created = await request(app)
    .post("/api/classrooms")
    .set(bearer(owner.token))
    .send({ name: "Data Structures", subject: "Computer Science", description: "Weekly DSA practice" });
  if (created.status !== 201) throw new Error(`create classroom failed: ${JSON.stringify(created.body)}`);
  const { classroom } = created.body;

  for (const student of students) {
    const joined = await request(app)
      .post("/api/classrooms/join")
      .set(bearer(student.token))
      .send({ joinCode: classroom.joinCode });
    if (joined.status !== 200) throw new Error(`join failed: ${JSON.stringify(joined.body)}`);
  }
  return classroom;
};
