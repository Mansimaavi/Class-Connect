import { describe, expect, it } from "vitest";
import {
  CLASSROOM_ROLES,
  MODERATOR_CLASSROOM_PERMISSIONS,
  PERMISSIONS as P,
  ROLES,
  ROLE_RANK,
  classroomRoleHasPermission,
  roleHasPermission,
} from "../../config/permissions.js";

describe("platform roles", () => {
  it("gives regular users only self-service permissions", () => {
    expect(roleHasPermission(ROLES.USER, P.CLASSROOM_CREATE)).toBe(true);
    expect(roleHasPermission(ROLES.USER, P.USER_READ)).toBe(false);
    expect(roleHasPermission(ROLES.USER, P.USER_BLOCK)).toBe(false);
  });

  it("lets admins moderate but not change roles", () => {
    expect(roleHasPermission(ROLES.ADMIN, P.USER_BLOCK)).toBe(true);
    expect(roleHasPermission(ROLES.ADMIN, P.STATS_READ)).toBe(true);
    expect(roleHasPermission(ROLES.ADMIN, P.USER_ROLE_UPDATE)).toBe(false);
  });

  it("gives superadmins everything admins have plus role management", () => {
    for (const permission of [P.USER_READ, P.USER_BLOCK, P.USER_DELETE, P.STATS_READ, P.USER_ROLE_UPDATE]) {
      expect(roleHasPermission(ROLES.SUPERADMIN, permission)).toBe(true);
    }
  });

  it("ranks roles so admins can't act on peers", () => {
    expect(ROLE_RANK.superadmin).toBeGreaterThan(ROLE_RANK.admin);
    expect(ROLE_RANK.admin).toBeGreaterThan(ROLE_RANK.user);
  });

  it("returns false for unknown roles", () => {
    expect(roleHasPermission("hacker", P.USER_READ)).toBe(false);
    expect(roleHasPermission(undefined, P.CLASSROOM_CREATE)).toBe(false);
  });
});

describe("classroom roles", () => {
  it("lets students participate but not manage", () => {
    expect(classroomRoleHasPermission(CLASSROOM_ROLES.STUDENT, P.MESSAGE_SEND)).toBe(true);
    expect(classroomRoleHasPermission(CLASSROOM_ROLES.STUDENT, P.ANNOUNCEMENT_COMMENT)).toBe(true);
    expect(classroomRoleHasPermission(CLASSROOM_ROLES.STUDENT, P.ANNOUNCEMENT_CREATE)).toBe(false);
    expect(classroomRoleHasPermission(CLASSROOM_ROLES.STUDENT, P.MEMBER_MANAGE)).toBe(false);
  });

  it("lets teachers post announcements and manage members, but not delete the classroom", () => {
    expect(classroomRoleHasPermission(CLASSROOM_ROLES.TEACHER, P.ANNOUNCEMENT_CREATE)).toBe(true);
    expect(classroomRoleHasPermission(CLASSROOM_ROLES.TEACHER, P.MEMBER_MANAGE)).toBe(true);
    expect(classroomRoleHasPermission(CLASSROOM_ROLES.TEACHER, P.CLASSROOM_DELETE)).toBe(false);
    expect(classroomRoleHasPermission(CLASSROOM_ROLES.TEACHER, P.MEMBER_ROLE_UPDATE)).toBe(false);
  });

  it("gives the owner full control except leaving", () => {
    expect(classroomRoleHasPermission(CLASSROOM_ROLES.OWNER, P.CLASSROOM_DELETE)).toBe(true);
    expect(classroomRoleHasPermission(CLASSROOM_ROLES.OWNER, P.MEMBER_ROLE_UPDATE)).toBe(true);
    expect(classroomRoleHasPermission(CLASSROOM_ROLES.OWNER, P.CLASSROOM_LEAVE)).toBe(false);
  });

  it("limits platform moderators to moderation actions", () => {
    expect(MODERATOR_CLASSROOM_PERMISSIONS.has(P.CLASSROOM_VIEW)).toBe(true);
    expect(MODERATOR_CLASSROOM_PERMISSIONS.has(P.MESSAGE_MODERATE)).toBe(true);
    expect(MODERATOR_CLASSROOM_PERMISSIONS.has(P.MESSAGE_SEND)).toBe(false);
    expect(MODERATOR_CLASSROOM_PERMISSIONS.has(P.ANNOUNCEMENT_CREATE)).toBe(false);
  });
});
