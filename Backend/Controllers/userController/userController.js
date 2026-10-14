import mongoose from "mongoose";
import { PERMISSIONS, roleHasPermission } from "../../config/permissions.js";
import { passwordUpdatedTemplate } from "../../mail/templates/passwordTemplates.js";
import ClassNote from "../../models/classNote.js";
import Classroom from "../../models/classroom.js";
import Resource from "../../models/resource.js";
import User from "../../models/user.js";
import { startSession } from "../../services/authService.js";
import ApiError from "../../utils/ApiError.js";
import logger from "../../utils/logger.js";
import sendMail from "../../utils/mailSender.js";

const PUBLIC_FIELDS = ["_id", "name", "username", "role", "course", "college", "avatarUrl", "createdAt"];

const pick = (source, keys) => Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]]));

export const getUserStats = async (userId) => {
  const id = new mongoose.Types.ObjectId(userId);
  const [resourceUploads, noteUploads, downloads, createdClassrooms, joinedClassrooms] = await Promise.all([
    Resource.countDocuments({ uploadedBy: id }),
    ClassNote.countDocuments({ uploadedBy: id }),
    Resource.aggregate([
      { $unwind: "$downloadedBy" },
      { $match: { "downloadedBy.user": id } },
      { $count: "total" },
    ]),
    Classroom.countDocuments({ owner: id }),
    Classroom.countDocuments({ "members.user": id, owner: { $ne: id } }),
  ]);

  return {
    totalUploads: resourceUploads + noteUploads,
    totalDownloads: downloads[0]?.total ?? 0,
    totalCreatedClassrooms: createdClassrooms,
    totalJoinedClassrooms: joinedClassrooms,
  };
};

/**
 * GET /api/users/:userId — profile page data. Email and location are only
 * included for the user themselves and for admins.
 */
export const getProfile = async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) throw ApiError.notFound("User");

  const isSelf = user._id.equals(req.user._id);
  const canSeePrivate = isSelf || roleHasPermission(req.user.role, PERMISSIONS.USER_READ);
  const json = user.toJSON();

  const profile = canSeePrivate
    ? { ...pick(json, [...PUBLIC_FIELDS, "email", "location", "lastLogin", "isBlocked"]), twoFactorEnabled: Boolean(user.twoFactor?.enabled) }
    : pick(json, PUBLIC_FIELDS);

  res.json({ success: true, user: profile, isSelf, stats: await getUserStats(user._id) });
};

/** PATCH /api/users/me */
export const updateMyProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
  Object.assign(user, req.body);
  await user.save();
  res.json({ success: true, message: "Profile updated", user });
};

/** PATCH /api/users/me/email — confirmed with the account password. */
export const changeMyEmail = async (req, res) => {
  const { newEmail, password } = req.body;
  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.comparePassword(password))) {
    throw ApiError.unauthorized("Incorrect password", "INVALID_PASSWORD");
  }
  if (newEmail === user.email) {
    throw ApiError.badRequest("That's already your email address", undefined, "SAME_EMAIL");
  }
  if (await User.exists({ email: newEmail })) {
    throw ApiError.conflict("That email is already in use", "EMAIL_TAKEN");
  }

  user.email = newEmail;
  await user.save();
  res.json({ success: true, message: "Email updated", user });
};

/**
 * PATCH /api/users/me/password — signs every other device out and starts a
 * fresh session for this one, so the response carries a new access token.
 */
export const changeMyPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password +sessions +tokenVersion");
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.unauthorized("Current password is incorrect", "INVALID_PASSWORD");
  }
  if (await user.comparePassword(newPassword)) {
    throw ApiError.badRequest("Choose a password you haven't used here before", undefined, "SAME_PASSWORD");
  }

  user.password = newPassword;
  user.sessions = [];
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  const accessToken = await startSession(user, req, res);

  sendMail({
    to: user.email,
    subject: "Your ClassConnect password was changed",
    html: passwordUpdatedTemplate(user.name, user.email),
  }).catch((error) => logger.error({ err: error }, "failed to send password-changed email"));

  res.json({ success: true, message: "Password updated. Other devices have been signed out.", accessToken, user });
};
