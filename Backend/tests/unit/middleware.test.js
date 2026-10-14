import mongoose from "mongoose";
import multer from "multer";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { PERMISSIONS as P } from "../../config/permissions.js";
import { errorHandler } from "../../middleware/errorHandler.js";
import { authorize, requireClassroomPermission, requirePermission } from "../../middleware/rbac.js";
import sanitize, { stripOperators } from "../../middleware/sanitize.js";
import validate from "../../middleware/validate.js";
import ApiError from "../../utils/ApiError.js";

const run = (middleware, req) =>
  new Promise((resolve) => {
    middleware(req, {}, (err) => resolve(err));
  });

const mockResponse = () => {
  const res = { headersSent: false };
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe("validate()", () => {
  const schema = {
    body: z.object({ title: z.string().trim().min(1), count: z.coerce.number().int().default(1) }),
    query: z.object({ page: z.coerce.number().int().min(1).default(1) }),
  };

  it("replaces input with parsed values and drops unknown fields", async () => {
    const req = { body: { title: "  Hello ", extra: "nope" }, query: { page: "3" }, params: {} };
    const err = await run(validate(schema), req);
    expect(err).toBeUndefined();
    expect(req.body).toEqual({ title: "Hello", count: 1 });
    expect(req.query).toEqual({ page: 3 });
  });

  it("reports every problem at once as VALIDATION_ERROR", async () => {
    const req = { body: { title: "" }, query: { page: "0" }, params: {} };
    const err = await run(validate(schema), req);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.details.map((d) => `${d.location}.${d.field}`).sort()).toEqual(["body.title", "query.page"]);
  });
});

describe("sanitize", () => {
  it("removes Mongo operators and dotted keys at any depth", () => {
    expect(
      stripOperators({ email: { $ne: null }, nested: [{ "a.b": 1, ok: 2 }], profile: { $where: "x", name: "Mansi" } })
    ).toEqual({ email: {}, nested: [{ ok: 2 }], profile: { name: "Mansi" } });
  });

  it("cleans body, params and query on the request", async () => {
    const req = { body: { password: { $gt: "" } }, params: { id: "1" }, query: { sort: { $natural: 1 } } };
    await run(sanitize, req);
    expect(req.body).toEqual({ password: {} });
    expect(req.query).toEqual({ sort: {} });
  });
});

describe("RBAC middleware", () => {
  it("authorize() only lets listed roles through", async () => {
    expect(await run(authorize("admin"), { user: { role: "admin" } })).toBeUndefined();
    expect((await run(authorize("admin"), { user: { role: "user" } })).status).toBe(403);
    expect((await run(authorize("admin"), {})).status).toBe(401);
  });

  it("requirePermission() checks the role's permission set", async () => {
    expect(await run(requirePermission(P.USER_BLOCK), { user: { role: "admin" } })).toBeUndefined();
    expect((await run(requirePermission(P.USER_ROLE_UPDATE), { user: { role: "admin" } })).status).toBe(403);
  });

  it("requireClassroomPermission() distinguishes non-members from under-privileged members", async () => {
    const classroom = {};
    const student = { user: { role: "user" }, classroom, classroomRole: "student" };
    const outsider = { user: { role: "user" }, classroom, classroomRole: null };
    const moderator = { user: { role: "admin" }, classroom, classroomRole: null };

    expect(await run(requireClassroomPermission(P.MESSAGE_SEND), student)).toBeUndefined();
    expect((await run(requireClassroomPermission(P.ANNOUNCEMENT_CREATE), student)).code).toBe("INSUFFICIENT_CLASSROOM_ROLE");
    expect((await run(requireClassroomPermission(P.CLASSROOM_VIEW), outsider)).code).toBe("NOT_A_MEMBER");
    expect(await run(requireClassroomPermission(P.CLASSROOM_VIEW), moderator)).toBeUndefined();
    expect((await run(requireClassroomPermission(P.MESSAGE_SEND), moderator)).code).toBe("NOT_A_MEMBER");
  });
});

describe("errorHandler", () => {
  const handle = (err) => {
    const res = mockResponse();
    errorHandler(err, { id: "req-1" }, res, () => {});
    return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
  };

  it("passes ApiErrors through with their code and details", () => {
    const { status, body } = handle(ApiError.badRequest("Bad", [{ field: "x" }], "CUSTOM"));
    expect(status).toBe(400);
    expect(body).toEqual({ success: false, message: "Bad", code: "CUSTOM", details: [{ field: "x" }], requestId: "req-1" });
  });

  it("maps Mongo duplicate keys to 409", () => {
    const { status, body } = handle(Object.assign(new Error("dup"), { code: 11000, keyValue: { email: "a@b.c" } }));
    expect(status).toBe(409);
    expect(body.code).toBe("DUPLICATE_KEY");
    expect(body.details[0].field).toBe("email");
  });

  it("maps bad ObjectIds to 400", () => {
    const castError = new mongoose.Error.CastError("ObjectId", "nope", "_id");
    expect(handle(castError).status).toBe(400);
  });

  it("maps oversized uploads to 413", () => {
    expect(handle(new multer.MulterError("LIMIT_FILE_SIZE")).status).toBe(413);
  });

  it("hides internal error messages behind a generic 500", () => {
    const { status, body } = handle(new Error("database password is hunter2"));
    expect(status).toBe(500);
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.message).not.toContain("hunter2");
  });
});
