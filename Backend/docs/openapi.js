// OpenAPI 3.1 description of the REST API, served at /api/docs (Swagger UI)
// and /api/openapi.json. Every error response uses the `Error` schema.

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ "application/json": { schema } });
const ok = (description, properties = {}) => ({
  description,
  content: json({ type: "object", properties: { success: { type: "boolean", example: true }, ...properties } }),
});
const errors = (...codes) =>
  Object.fromEntries(codes.map((code) => [code, { $ref: `#/components/responses/E${code}` }]));
const body = (properties, required = []) => ({
  required: true,
  content: json({ type: "object", properties, required }),
});
const pathId = (name, description = `${name} (MongoDB ObjectId)`) => ({
  name,
  in: "path",
  required: true,
  description,
  schema: { type: "string", pattern: "^[a-f0-9]{24}$" },
});
const query = (name, schema, description) => ({ name, in: "query", required: false, schema, description });

const secured = [{ bearerAuth: [] }];
const op = (tag, summary, { auth = true, description, parameters, requestBody, responses }) => ({
  tags: [tag],
  summary,
  ...(description && { description }),
  ...(auth ? { security: secured } : { security: [] }),
  ...(parameters && { parameters }),
  ...(requestBody && { requestBody }),
  responses,
});

const classroomId = pathId("classroomId");
const pagination = [query("page", { type: "integer", minimum: 1, default: 1 }), query("limit", { type: "integer", minimum: 1, maximum: 100, default: 20 })];

const openapi = {
  openapi: "3.1.0",
  info: {
    title: "ClassConnect API",
    version: "1.0.0",
    description: [
      "REST API for ClassConnect, a real-time classroom collaboration platform.",
      "",
      "**Authentication.** Sign in with `POST /auth/login` to get a short-lived access token (send it as `Authorization: Bearer <token>`) and an httpOnly refresh cookie. Call `POST /auth/refresh` when the API answers `401` with code `TOKEN_EXPIRED`. Accounts with two-factor authentication get a `twoFactorToken` from login instead and finish with `POST /auth/login/2fa`.",
      "",
      "**Authorization.** Platform roles (`user`, `admin`, `superadmin`) and classroom roles (`owner`, `teacher`, `student`) map to permissions; each endpoint lists what it needs.",
      "",
      "**Errors.** Every error has the shape `{ success: false, message, code, details? }`; `code` is stable and safe to branch on.",
      "",
      "**Real-time.** A Socket.IO connection (same origin, `auth: { token }`) receives events such as `message:new`, `announcement:created`, `resource:created`, `poll:updated`, `presence:online` and `notification:new`.",
    ].join("\n"),
  },
  servers: [{ url: "/api" }],
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Two-factor auth" },
    { name: "Users" },
    { name: "Classrooms" },
    { name: "Members" },
    { name: "Resources" },
    { name: "Announcements" },
    { name: "Chat" },
    { name: "Polls" },
    { name: "Class notes" },
    { name: "Discussion" },
    { name: "Notifications" },
    { name: "Whiteboards" },
    { name: "Admin" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      refreshCookie: { type: "apiKey", in: "cookie", name: "cc_refresh" },
    },
    responses: {
      E400: { description: "Validation failed or bad input", content: json(ref("Error")) },
      E401: { description: "Missing, invalid or expired credentials", content: json(ref("Error")) },
      E403: { description: "Authenticated but not allowed", content: json(ref("Error")) },
      E404: { description: "Not found", content: json(ref("Error")) },
      E409: { description: "Conflict (duplicate or already done)", content: json(ref("Error")) },
      E413: { description: "Upload too large", content: json(ref("Error")) },
      E429: { description: "Rate limited", content: json(ref("Error")) },
      E503: { description: "Dependent service unavailable", content: json(ref("Error")) },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["success", "message", "code"],
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Some fields are invalid" },
          code: { type: "string", example: "VALIDATION_ERROR" },
          details: {
            type: "array",
            items: {
              type: "object",
              properties: { location: { type: "string" }, field: { type: "string" }, message: { type: "string" } },
            },
          },
          requestId: { type: "string" },
        },
      },
      Pagination: {
        type: "object",
        properties: { page: { type: "integer" }, limit: { type: "integer" }, total: { type: "integer" }, pages: { type: "integer" } },
      },
      UserSummary: {
        type: "object",
        properties: { _id: { type: "string" }, name: { type: "string" }, username: { type: "string" }, avatarUrl: { type: "string" } },
      },
      User: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          username: { type: "string" },
          email: { type: "string", format: "email" },
          course: { type: "string" },
          college: { type: "string" },
          role: { type: "string", enum: ["user", "admin", "superadmin"] },
          isBlocked: { type: "boolean" },
          twoFactor: { type: "object", properties: { enabled: { type: "boolean" } } },
          lastLogin: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AuthResult: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          accessToken: { type: "string" },
          user: ref("User"),
          permissions: { type: "array", items: { type: "string" } },
        },
      },
      Member: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          username: { type: "string" },
          role: { type: "string", enum: ["owner", "teacher", "student"] },
          joinedAt: { type: "string", format: "date-time" },
          online: { type: "boolean" },
        },
      },
      Progress: {
        type: "object",
        properties: { total: { type: "integer" }, completed: { type: "integer" }, percentage: { type: "integer" } },
      },
      Classroom: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          subject: { type: "string" },
          description: { type: "string" },
          owner: ref("UserSummary"),
          myRole: { type: ["string", "null"], enum: ["owner", "teacher", "student", null] },
          memberCount: { type: "integer" },
          members: { type: "array", items: ref("Member") },
          joinCode: { type: "string", description: "Only returned to owners and teachers" },
          isArchived: { type: "boolean" },
          progress: ref("Progress"),
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Resource: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          url: { type: "string" },
          mimeType: { type: "string" },
          size: { type: "integer" },
          uploadedBy: ref("UserSummary"),
          downloadCount: { type: "integer" },
          completed: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Announcement: {
        type: "object",
        properties: {
          _id: { type: "string" },
          classroom: { type: "string" },
          author: ref("UserSummary"),
          title: { type: "string" },
          body: { type: "string" },
          pinned: { type: "boolean" },
          dueDate: { type: ["string", "null"], format: "date-time" },
          editedAt: { type: ["string", "null"], format: "date-time" },
          comments: {
            type: "array",
            items: {
              type: "object",
              properties: { _id: { type: "string" }, author: ref("UserSummary"), text: { type: "string" }, createdAt: { type: "string" } },
            },
          },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Message: {
        type: "object",
        properties: {
          _id: { type: "string" },
          classroom: { type: "string" },
          sender: ref("UserSummary"),
          text: { type: "string" },
          editedAt: { type: ["string", "null"] },
          seenBy: { type: "array", items: { type: "string" } },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Poll: {
        type: "object",
        properties: {
          _id: { type: "string" },
          question: { type: "string" },
          options: {
            type: "array",
            items: { type: "object", properties: { text: { type: "string" }, votes: { type: "array", items: ref("UserSummary") } } },
          },
          createdBy: ref("UserSummary"),
          closed: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      ClassNote: {
        type: "object",
        properties: {
          _id: { type: "string" },
          title: { type: "string" },
          topic: { type: "string" },
          subject: { type: "string" },
          url: { type: "string" },
          uploadedBy: ref("UserSummary"),
          averageRating: { type: "number" },
          ratingCount: { type: "integer" },
          myRating: { type: ["integer", "null"] },
          viewCount: { type: "integer" },
          reviews: { type: "array", items: { type: "object" } },
        },
      },
      Question: {
        type: "object",
        properties: {
          _id: { type: "string" },
          title: { type: "string" },
          details: { type: "string" },
          author: ref("UserSummary"),
          answerCount: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Answer: {
        type: "object",
        properties: {
          _id: { type: "string" },
          text: { type: "string" },
          author: ref("UserSummary"),
          likes: { type: "integer" },
          dislikes: { type: "integer" },
          myReaction: { type: ["string", "null"], enum: ["like", "dislike", null] },
        },
      },
      Notification: {
        type: "object",
        properties: {
          _id: { type: "string" },
          type: { type: "string" },
          title: { type: "string" },
          message: { type: "string" },
          link: { type: "string" },
          read: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/health": { get: op("Health", "Liveness check", { auth: false, responses: { 200: ok("Process is up") } }) },
    "/health/ready": {
      get: op("Health", "Readiness check (database connected)", {
        auth: false,
        responses: { 200: ok("Ready"), 503: { description: "Database unavailable" } },
      }),
    },

    "/auth/send-otp": {
      post: op("Auth", "Email a 6-digit verification code for sign-up", {
        auth: false,
        requestBody: body({ email: { type: "string", format: "email" } }, ["email"]),
        responses: { 200: ok("Code sent"), ...errors(400, 409, 429) },
      }),
    },
    "/auth/register": {
      post: op("Auth", "Create an account with a verified email", {
        auth: false,
        requestBody: body(
          {
            name: { type: "string" },
            username: { type: "string", pattern: "^[a-z0-9_.]{3,30}$" },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8, description: "At least one letter and one number" },
            course: { type: "string" },
            college: { type: "string" },
            otp: { type: "string", pattern: "^\\d{6}$" },
            latitude: { type: "number" },
            longitude: { type: "number" },
          },
          ["name", "username", "email", "password", "course", "college", "otp"]
        ),
        responses: { 201: ok("Account created", { user: ref("User") }), ...errors(400, 409, 429) },
      }),
    },
    "/auth/login": {
      post: op("Auth", "Sign in with email or username", {
        auth: false,
        description: "Returns an access token and sets the refresh cookie, or `{ requiresTwoFactor: true, twoFactorToken }` when 2FA is on.",
        requestBody: body({ identifier: { type: "string" }, password: { type: "string" } }, ["identifier", "password"]),
        responses: { 200: { description: "Signed in or 2FA required", content: json(ref("AuthResult")) }, ...errors(400, 401, 403, 429) },
      }),
    },
    "/auth/login/2fa": {
      post: op("Auth", "Finish sign-in with an authenticator or recovery code", {
        auth: false,
        requestBody: body({ twoFactorToken: { type: "string" }, code: { type: "string" } }, ["twoFactorToken", "code"]),
        responses: { 200: { description: "Signed in", content: json(ref("AuthResult")) }, ...errors(400, 401, 429) },
      }),
    },
    "/auth/refresh": {
      post: op("Auth", "Rotate the refresh cookie and get a new access token", {
        auth: false,
        description: "Reusing an already-rotated refresh token revokes every session for the account.",
        responses: { 200: { description: "New access token", content: json(ref("AuthResult")) }, ...errors(401, 403) },
      }),
    },
    "/auth/logout": { post: op("Auth", "Sign out this device", { auth: false, responses: { 200: ok("Signed out") } }) },
    "/auth/logout-all": { post: op("Auth", "Sign out every device", { responses: { 200: ok("Signed out everywhere"), ...errors(401) } }) },
    "/auth/me": {
      get: op("Auth", "Current user and their permissions", {
        responses: { 200: ok("Current user", { user: ref("User"), permissions: { type: "array", items: { type: "string" } } }), ...errors(401) },
      }),
    },
    "/auth/sessions": { get: op("Auth", "Devices you're signed in on", { responses: { 200: ok("Sessions"), ...errors(401) } }) },
    "/auth/sessions/{sessionId}": {
      delete: op("Auth", "Sign out one device", {
        parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { 200: ok("Signed out"), ...errors(401, 404) },
      }),
    },
    "/auth/forgot-password": {
      post: op("Auth", "Email a password reset link", {
        auth: false,
        requestBody: body({ email: { type: "string", format: "email" } }, ["email"]),
        responses: { 200: ok("Always succeeds, so accounts can't be discovered"), ...errors(400, 429) },
      }),
    },
    "/auth/reset-password": {
      post: op("Auth", "Set a new password from a reset link", {
        auth: false,
        requestBody: body({ token: { type: "string" }, password: { type: "string" } }, ["token", "password"]),
        responses: { 200: ok("Password changed; all sessions signed out"), ...errors(400, 429) },
      }),
    },

    "/auth/2fa": { get: op("Two-factor auth", "2FA status", { responses: { 200: ok("Status"), ...errors(401) } }) },
    "/auth/2fa/setup": {
      post: op("Two-factor auth", "Start setup: get a QR code for an authenticator app", {
        responses: { 200: ok("Secret created", { otpauthUrl: { type: "string" }, qrCode: { type: "string" }, secret: { type: "string" } }), ...errors(401, 409) },
      }),
    },
    "/auth/2fa/enable": {
      post: op("Two-factor auth", "Confirm setup with a code; returns one-time recovery codes", {
        requestBody: body({ code: { type: "string" } }, ["code"]),
        responses: { 200: ok("2FA enabled", { recoveryCodes: { type: "array", items: { type: "string" } } }), ...errors(400, 401, 409) },
      }),
    },
    "/auth/2fa/disable": {
      post: op("Two-factor auth", "Turn 2FA off (password + code)", {
        requestBody: body({ password: { type: "string" }, code: { type: "string" } }, ["password", "code"]),
        responses: { 200: ok("2FA disabled"), ...errors(400, 401) },
      }),
    },
    "/auth/2fa/recovery-codes": {
      post: op("Two-factor auth", "Replace recovery codes", {
        requestBody: body({ code: { type: "string" } }, ["code"]),
        responses: { 200: ok("New codes", { recoveryCodes: { type: "array", items: { type: "string" } } }), ...errors(400, 401) },
      }),
    },

    "/users/me": {
      patch: op("Users", "Update your profile", {
        requestBody: body({ name: { type: "string" }, course: { type: "string" }, college: { type: "string" }, avatarUrl: { type: "string" } }),
        responses: { 200: ok("Updated", { user: ref("User") }), ...errors(400, 401) },
      }),
    },
    "/users/me/email": {
      patch: op("Users", "Change your email (password required)", {
        requestBody: body({ newEmail: { type: "string", format: "email" }, password: { type: "string" } }, ["newEmail", "password"]),
        responses: { 200: ok("Updated", { user: ref("User") }), ...errors(400, 401, 409) },
      }),
    },
    "/users/me/password": {
      patch: op("Users", "Change your password (signs out other devices)", {
        requestBody: body({ currentPassword: { type: "string" }, newPassword: { type: "string" } }, ["currentPassword", "newPassword"]),
        responses: { 200: ok("Updated", { accessToken: { type: "string" } }), ...errors(400, 401) },
      }),
    },
    "/users/{userId}": {
      get: op("Users", "Profile and activity stats (email/location only for yourself or admins)", {
        parameters: [pathId("userId")],
        responses: { 200: ok("Profile"), ...errors(401, 404) },
      }),
    },

    "/classrooms": {
      get: op("Classrooms", "Classrooms you belong to, with your progress", {
        parameters: [query("scope", { type: "string", enum: ["all", "owned", "joined"], default: "all" })],
        responses: { 200: ok("Classrooms", { classrooms: { type: "array", items: ref("Classroom") } }), ...errors(401) },
      }),
      post: op("Classrooms", "Create a classroom (you become its owner)", {
        requestBody: body(
          { name: { type: "string" }, subject: { type: "string" }, description: { type: "string" }, joinCode: { type: "string", description: "Optional; generated when omitted" } },
          ["name", "subject"]
        ),
        responses: { 201: ok("Created", { classroom: ref("Classroom") }), ...errors(400, 401, 403, 409) },
      }),
    },
    "/classrooms/join": {
      post: op("Classrooms", "Join with a join code (as a student)", {
        requestBody: body({ joinCode: { type: "string" } }, ["joinCode"]),
        responses: { 200: ok("Joined", { classroom: ref("Classroom") }), ...errors(400, 401, 404, 409) },
      }),
    },
    "/classrooms/{classroomId}": {
      get: op("Classrooms", "Classroom details, your permissions and who's online", {
        parameters: [classroomId],
        responses: { 200: ok("Classroom", { classroom: ref("Classroom"), permissions: { type: "array", items: { type: "string" } } }), ...errors(401, 403, 404) },
      }),
      patch: op("Classrooms", "Update (teachers)", {
        parameters: [classroomId],
        requestBody: body({ name: { type: "string" }, subject: { type: "string" }, description: { type: "string" }, isArchived: { type: "boolean" } }),
        responses: { 200: ok("Updated", { classroom: ref("Classroom") }), ...errors(400, 401, 403, 404) },
      }),
      delete: op("Classrooms", "Delete with everything in it (owner)", {
        parameters: [classroomId],
        responses: { 200: ok("Deleted"), ...errors(401, 403, 404) },
      }),
    },
    "/classrooms/{classroomId}/join-code": {
      post: op("Classrooms", "Issue a new join code (teachers)", { parameters: [classroomId], responses: { 200: ok("New code", { joinCode: { type: "string" } }), ...errors(401, 403, 404) } }),
    },
    "/classrooms/{classroomId}/leave": {
      post: op("Classrooms", "Leave a classroom (not available to the owner)", { parameters: [classroomId], responses: { 200: ok("Left"), ...errors(401, 403, 404) } }),
    },
    "/classrooms/{classroomId}/members": {
      get: op("Members", "Members with roles and online status", {
        parameters: [classroomId],
        responses: { 200: ok("Members", { members: { type: "array", items: ref("Member") } }), ...errors(401, 403, 404) },
      }),
    },
    "/classrooms/{classroomId}/members/{userId}": {
      patch: op("Members", "Make a member a teacher or student (owner)", {
        parameters: [classroomId, pathId("userId")],
        requestBody: body({ role: { type: "string", enum: ["teacher", "student"] } }, ["role"]),
        responses: { 200: ok("Updated"), ...errors(400, 401, 403, 404) },
      }),
      delete: op("Members", "Remove a member (teachers; only the owner can remove teachers)", {
        parameters: [classroomId, pathId("userId")],
        responses: { 200: ok("Removed"), ...errors(400, 401, 403, 404) },
      }),
    },
    "/classrooms/{classroomId}/resources": {
      get: op("Resources", "Shared files with your completion state", {
        parameters: [classroomId],
        responses: { 200: ok("Resources", { resources: { type: "array", items: ref("Resource") }, progress: ref("Progress") }), ...errors(401, 403, 404) },
      }),
      post: op("Resources", "Upload a file (multipart field `file`)", {
        parameters: [classroomId],
        requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } } } },
        responses: { 201: ok("Uploaded", { resource: ref("Resource") }), ...errors(400, 401, 403, 404, 413, 503) },
      }),
    },
    "/classrooms/{classroomId}/resources/{resourceId}": {
      delete: op("Resources", "Delete a file (uploader or teacher)", { parameters: [classroomId, pathId("resourceId")], responses: { 200: ok("Deleted"), ...errors(401, 403, 404) } }),
    },
    "/classrooms/{classroomId}/resources/{resourceId}/download": {
      get: op("Resources", "Download a file (counted in stats)", {
        parameters: [classroomId, pathId("resourceId")],
        responses: { 200: { description: "File stream" }, ...errors(401, 403, 404, 503) },
      }),
    },
    "/classrooms/{classroomId}/resources/{resourceId}/progress": {
      put: op("Resources", "Mark a file complete or incomplete", {
        parameters: [classroomId, pathId("resourceId")],
        requestBody: body({ completed: { type: "boolean" } }, ["completed"]),
        responses: { 200: ok("Saved", { progress: ref("Progress") }), ...errors(400, 401, 403, 404) },
      }),
    },
    "/classrooms/{classroomId}/resources/{resourceId}/summary": {
      post: op("Resources", "AI summary of a PDF (Gemini)", {
        parameters: [classroomId, pathId("resourceId")],
        requestBody: body({ maxWords: { type: "integer", minimum: 30, maximum: 600, default: 150 } }),
        responses: { 200: ok("Summary", { summary: { type: "string" } }), ...errors(400, 401, 403, 404, 429, 503) },
      }),
    },
    "/classrooms/{classroomId}/announcements": {
      get: op("Announcements", "Announcements, pinned first", {
        parameters: [classroomId, ...pagination],
        responses: { 200: ok("Announcements", { announcements: { type: "array", items: ref("Announcement") }, pagination: ref("Pagination") }), ...errors(401, 403, 404) },
      }),
      post: op("Announcements", "Post an announcement (teachers)", {
        parameters: [classroomId],
        requestBody: body({ title: { type: "string" }, body: { type: "string" }, pinned: { type: "boolean" }, dueDate: { type: "string", format: "date-time" } }, ["title", "body"]),
        responses: { 201: ok("Posted", { announcement: ref("Announcement") }), ...errors(400, 401, 403, 404) },
      }),
    },
    "/classrooms/{classroomId}/announcements/{announcementId}": {
      get: op("Announcements", "One announcement", { parameters: [classroomId, pathId("announcementId")], responses: { 200: ok("Announcement", { announcement: ref("Announcement") }), ...errors(401, 403, 404) } }),
      patch: op("Announcements", "Edit, pin or unpin (teachers)", {
        parameters: [classroomId, pathId("announcementId")],
        requestBody: body({ title: { type: "string" }, body: { type: "string" }, pinned: { type: "boolean" }, dueDate: { type: ["string", "null"] } }),
        responses: { 200: ok("Updated", { announcement: ref("Announcement") }), ...errors(400, 401, 403, 404) },
      }),
      delete: op("Announcements", "Delete (teachers)", { parameters: [classroomId, pathId("announcementId")], responses: { 200: ok("Deleted"), ...errors(401, 403, 404) } }),
    },
    "/classrooms/{classroomId}/announcements/{announcementId}/comments": {
      post: op("Announcements", "Comment on an announcement", {
        parameters: [classroomId, pathId("announcementId")],
        requestBody: body({ text: { type: "string" } }, ["text"]),
        responses: { 201: ok("Comment added"), ...errors(400, 401, 403, 404) },
      }),
    },
    "/classrooms/{classroomId}/announcements/{announcementId}/comments/{commentId}": {
      delete: op("Announcements", "Delete a comment (its author or a teacher)", {
        parameters: [classroomId, pathId("announcementId"), pathId("commentId")],
        responses: { 200: ok("Deleted"), ...errors(401, 403, 404) },
      }),
    },
    "/classrooms/{classroomId}/messages": {
      get: op("Chat", "Chat history, oldest first (page back with `before`)", {
        parameters: [classroomId, query("before", { type: "string", format: "date-time" }), query("limit", { type: "integer", default: 50 })],
        responses: { 200: ok("Messages", { messages: { type: "array", items: ref("Message") }, hasMore: { type: "boolean" } }), ...errors(401, 403, 404) },
      }),
      post: op("Chat", "Send a message (broadcast as `message:new`)", {
        parameters: [classroomId],
        requestBody: body({ text: { type: "string", maxLength: 2000 } }, ["text"]),
        responses: { 201: ok("Sent", { message: ref("Message") }), ...errors(400, 401, 403, 404) },
      }),
    },
    "/classrooms/{classroomId}/messages/{messageId}": {
      patch: op("Chat", "Edit your message", {
        parameters: [classroomId, pathId("messageId")],
        requestBody: body({ text: { type: "string" } }, ["text"]),
        responses: { 200: ok("Edited", { message: ref("Message") }), ...errors(400, 401, 403, 404) },
      }),
      delete: op("Chat", "Delete a message (sender or teacher)", { parameters: [classroomId, pathId("messageId")], responses: { 200: ok("Deleted"), ...errors(401, 403, 404) } }),
    },
    "/classrooms/{classroomId}/messages/bulk-delete": {
      post: op("Chat", "Delete several messages", {
        parameters: [classroomId],
        requestBody: body({ messageIds: { type: "array", items: { type: "string" } } }, ["messageIds"]),
        responses: { 200: ok("Deleted", { deletedCount: { type: "integer" } }), ...errors(400, 401, 403, 404) },
      }),
    },
    "/classrooms/{classroomId}/messages/seen": {
      post: op("Chat", "Mark all messages as read", { parameters: [classroomId], responses: { 200: ok("Marked"), ...errors(401, 403, 404) } }),
    },
    "/classrooms/{classroomId}/polls": {
      get: op("Polls", "Polls in the classroom", { parameters: [classroomId], responses: { 200: ok("Polls", { polls: { type: "array", items: ref("Poll") } }), ...errors(401, 403, 404) } }),
      post: op("Polls", "Create a poll", {
        parameters: [classroomId],
        requestBody: body({ question: { type: "string" }, options: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 10 } }, ["question", "options"]),
        responses: { 201: ok("Created", { poll: ref("Poll") }), ...errors(400, 401, 403, 404) },
      }),
    },
    "/classrooms/{classroomId}/polls/{pollId}": {
      patch: op("Polls", "Close or reopen (creator or teacher)", {
        parameters: [classroomId, pathId("pollId")],
        requestBody: body({ closed: { type: "boolean" } }, ["closed"]),
        responses: { 200: ok("Updated", { poll: ref("Poll") }), ...errors(400, 401, 403, 404) },
      }),
      delete: op("Polls", "Delete (creator or teacher)", { parameters: [classroomId, pathId("pollId")], responses: { 200: ok("Deleted"), ...errors(401, 403, 404) } }),
    },
    "/classrooms/{classroomId}/polls/{pollId}/vote": {
      post: op("Polls", "Vote; voting for your current choice removes the vote", {
        parameters: [classroomId, pathId("pollId")],
        requestBody: body({ optionIndex: { type: "integer", minimum: 0 } }, ["optionIndex"]),
        responses: { 200: ok("Voted", { poll: ref("Poll") }), ...errors(400, 401, 403, 404) },
      }),
    },

    "/class-notes": {
      get: op("Class notes", "Browse public notes", {
        auth: false,
        parameters: [
          query("search", { type: "string" }),
          query("subject", { type: "string" }),
          query("sort", { type: "string", enum: ["recent", "rating", "popular"] }),
          ...pagination,
        ],
        responses: { 200: ok("Notes", { notes: { type: "array", items: ref("ClassNote") }, subjects: { type: "array", items: { type: "string" } }, pagination: ref("Pagination") }) },
      }),
      post: op("Class notes", "Share a note (multipart: file, topic, subject, title)", {
        requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" }, topic: { type: "string" }, subject: { type: "string" }, title: { type: "string" } } } } } },
        responses: { 201: ok("Uploaded", { note: ref("ClassNote") }), ...errors(400, 401, 413, 503) },
      }),
    },
    "/class-notes/{noteId}/view": { post: op("Class notes", "Record a view", { auth: false, parameters: [pathId("noteId")], responses: { 200: ok("Counted"), ...errors(404) } }) },
    "/class-notes/{noteId}/rating": {
      post: op("Class notes", "Rate 1-5", { parameters: [pathId("noteId")], requestBody: body({ rating: { type: "integer", minimum: 1, maximum: 5 } }, ["rating"]), responses: { 200: ok("Rated"), ...errors(400, 401, 404) } }),
    },
    "/class-notes/{noteId}/reviews": {
      post: op("Class notes", "Write a review", { parameters: [pathId("noteId")], requestBody: body({ text: { type: "string" }, rating: { type: "integer" } }, ["text"]), responses: { 201: ok("Added"), ...errors(400, 401, 404) } }),
    },
    "/class-notes/{noteId}": { delete: op("Class notes", "Delete (uploader or admin)", { parameters: [pathId("noteId")], responses: { 200: ok("Deleted"), ...errors(401, 403, 404) } }) },

    "/questions": {
      get: op("Discussion", "Questions, newest first", {
        auth: false,
        parameters: [query("search", { type: "string" }), ...pagination],
        responses: { 200: ok("Questions", { questions: { type: "array", items: ref("Question") }, pagination: ref("Pagination") }) },
      }),
      post: op("Discussion", "Ask a question", {
        requestBody: body({ title: { type: "string" }, details: { type: "string" } }, ["title"]),
        responses: { 201: ok("Posted", { question: ref("Question") }), ...errors(400, 401) },
      }),
    },
    "/questions/{questionId}": {
      get: op("Discussion", "One question", { auth: false, parameters: [pathId("questionId")], responses: { 200: ok("Question", { question: ref("Question") }), ...errors(404) } }),
      delete: op("Discussion", "Delete (author or admin)", { parameters: [pathId("questionId")], responses: { 200: ok("Deleted"), ...errors(401, 403, 404) } }),
    },
    "/questions/{questionId}/answers": {
      get: op("Discussion", "Answers to a question", { auth: false, parameters: [pathId("questionId")], responses: { 200: ok("Answers", { answers: { type: "array", items: ref("Answer") } }), ...errors(404) } }),
      post: op("Discussion", "Answer a question", {
        parameters: [pathId("questionId")],
        requestBody: body({ text: { type: "string" }, photoUrl: { type: "string" } }),
        responses: { 201: ok("Posted", { answer: ref("Answer") }), ...errors(400, 401, 404) },
      }),
    },
    "/answers/{answerId}/reaction": {
      post: op("Discussion", "Like or dislike (toggle)", {
        parameters: [pathId("answerId")],
        requestBody: body({ type: { type: "string", enum: ["like", "dislike"] } }, ["type"]),
        responses: { 200: ok("Updated", { likes: { type: "integer" }, dislikes: { type: "integer" }, myReaction: { type: ["string", "null"] } }), ...errors(400, 401, 404) },
      }),
    },
    "/answers/{answerId}": { delete: op("Discussion", "Delete (author or admin)", { parameters: [pathId("answerId")], responses: { 200: ok("Deleted"), ...errors(401, 403, 404) } }) },

    "/notifications": {
      get: op("Notifications", "Your notifications", {
        parameters: [query("unreadOnly", { type: "boolean" }), query("limit", { type: "integer", default: 30 })],
        responses: { 200: ok("Notifications", { notifications: { type: "array", items: ref("Notification") }, unreadCount: { type: "integer" } }), ...errors(401) },
      }),
    },
    "/notifications/read-all": { patch: op("Notifications", "Mark all as read", { responses: { 200: ok("Done"), ...errors(401) } }) },
    "/notifications/{notificationId}/read": {
      patch: op("Notifications", "Mark one as read", { parameters: [pathId("notificationId")], responses: { 200: ok("Done"), ...errors(401, 404) } }),
    },

    "/whiteboards/{roomId}": {
      get: op("Whiteboards", "Load a whiteboard (classroom id or personal-<userId>)", {
        parameters: [{ name: "roomId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: ok("Elements", { elements: { type: "array", items: { type: "object" } } }), ...errors(401, 403) },
      }),
      put: op("Whiteboards", "Replace the saved drawing", {
        parameters: [{ name: "roomId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: body({ elements: { type: "array", items: { type: "object" } } }, ["elements"]),
        responses: { 200: ok("Saved"), ...errors(400, 401, 403) },
      }),
    },

    "/admin/users": {
      get: op("Admin", "Search and list users (permission user:read)", {
        parameters: [
          query("search", { type: "string" }),
          query("role", { type: "string", enum: ["user", "admin", "superadmin"] }),
          query("status", { type: "string", enum: ["active", "blocked"] }),
          query("sort", { type: "string", enum: ["lastLogin", "createdAt", "name"] }),
          ...pagination,
        ],
        responses: { 200: ok("Users", { users: { type: "array", items: ref("User") }, pagination: ref("Pagination") }), ...errors(401, 403) },
      }),
    },
    "/admin/users/{userId}/role": {
      patch: op("Admin", "Promote to admin / demote to user (superadmin only)", {
        parameters: [pathId("userId")],
        requestBody: body({ role: { type: "string", enum: ["user", "admin"] } }, ["role"]),
        responses: { 200: ok("Updated", { user: ref("User") }), ...errors(400, 401, 403, 404) },
      }),
    },
    "/admin/users/{userId}/status": {
      patch: op("Admin", "Block or unblock (permission user:block)", {
        parameters: [pathId("userId")],
        requestBody: body({ blocked: { type: "boolean" } }, ["blocked"]),
        responses: { 200: ok("Updated", { user: ref("User") }), ...errors(400, 401, 403, 404) },
      }),
    },
    "/admin/users/{userId}": {
      delete: op("Admin", "Delete a user and the classrooms they own (permission user:delete)", {
        parameters: [pathId("userId")],
        responses: { 200: ok("Deleted"), ...errors(400, 401, 403, 404) },
      }),
    },
    "/admin/stats/overview": { get: op("Admin", "Platform totals", { responses: { 200: ok("Stats"), ...errors(401, 403) } }) },
    "/admin/stats": {
      get: op("Admin", "Activity for a time range", {
        parameters: [query("range", { type: "string", enum: ["last24hours", "last7days", "lastMonth", "lastYear", "overall"] })],
        responses: { 200: ok("Stats"), ...errors(401, 403) },
      }),
    },
    "/admin/activity": {
      get: op("Admin", "Logins and time spent per user", {
        parameters: [query("scope", { type: "string", enum: ["today", "overall"] }), query("tzOffset", { type: "integer", default: 330 })],
        responses: { 200: ok("Activity"), ...errors(401, 403) },
      }),
    },
    "/admin/locations": { get: op("Admin", "Sign-up locations users chose to share", { responses: { 200: ok("Locations"), ...errors(401, 403) } }) },
    "/admin/notifications": { get: op("Admin", "Live activity feed", { responses: { 200: ok("Feed"), ...errors(401, 403) } }) },
  },
};

export default openapi;
