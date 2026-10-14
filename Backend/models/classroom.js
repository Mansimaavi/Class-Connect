import crypto from "node:crypto";
import mongoose from "mongoose";
import { CLASSROOM_ROLES } from "../config/permissions.js";

const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I lookalikes

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: [CLASSROOM_ROLES.STUDENT, CLASSROOM_ROLES.TEACHER],
      default: CLASSROOM_ROLES.STUDENT,
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const classroomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    subject: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    joinCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 6,
      maxlength: 12,
      match: [/^[A-Z0-9]+$/, "Join code can only contain letters and numbers"],
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // The owner is stored here too (as a teacher) so member lists and counts
    // are a single source of truth.
    members: { type: [memberSchema], default: [] },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

classroomSchema.index({ "members.user": 1 });

classroomSchema.statics.generateJoinCode = function generateJoinCode(length = 8) {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += JOIN_CODE_ALPHABET[crypto.randomInt(JOIN_CODE_ALPHABET.length)];
  }
  return code;
};

const idOf = (value) => (value?._id ?? value)?.toString();

classroomSchema.methods.findMember = function findMember(userId) {
  const id = idOf(userId);
  return this.members.find((member) => idOf(member.user) === id) || null;
};

/** Returns "owner", "teacher", "student", or null when the user isn't a member. */
classroomSchema.methods.roleOf = function roleOf(userId) {
  if (idOf(this.owner) === idOf(userId)) return CLASSROOM_ROLES.OWNER;
  return this.findMember(userId)?.role || null;
};

classroomSchema.methods.memberIds = function memberIds() {
  return this.members.map((member) => idOf(member.user));
};

const Classroom = mongoose.models.Classroom || mongoose.model("Classroom", classroomSchema);

export default Classroom;
