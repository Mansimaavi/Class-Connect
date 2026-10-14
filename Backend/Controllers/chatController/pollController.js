import { PERMISSIONS } from "../../config/permissions.js";
import { hasClassroomPermission } from "../../middleware/rbac.js";
import Poll from "../../models/poll.js";
import { emitToClassroom } from "../../socket/emitter.js";
import ApiError from "../../utils/ApiError.js";

const USER_FIELDS = "name username";
const POPULATE = [
  { path: "createdBy", select: USER_FIELDS },
  { path: "options.votes", select: USER_FIELDS },
];

const findPoll = async (req) => {
  const poll = await Poll.findOne({ _id: req.params.pollId, classroom: req.classroom._id });
  if (!poll) throw ApiError.notFound("Poll");
  return poll;
};

/** GET /api/classrooms/:classroomId/polls */
export const listPolls = async (req, res) => {
  const polls = await Poll.find({ classroom: req.classroom._id }).sort({ createdAt: 1, _id: 1 }).populate(POPULATE);
  res.json({ success: true, polls });
};

/** POST /api/classrooms/:classroomId/polls */
export const createPoll = async (req, res) => {
  const poll = await Poll.create({
    classroom: req.classroom._id,
    createdBy: req.user._id,
    question: req.body.question,
    options: req.body.options.map((text) => ({ text, votes: [] })),
  });
  await poll.populate(POPULATE);

  emitToClassroom(req.classroom._id, "poll:created", { classroomId: req.classroom._id, poll });
  res.status(201).json({ success: true, poll });
};

/**
 * POST /api/classrooms/:classroomId/polls/:pollId/vote
 * Single choice: voting moves your vote; voting for the option you already
 * picked removes it.
 */
export const votePoll = async (req, res) => {
  const poll = await findPoll(req);
  if (poll.closed) throw ApiError.badRequest("This poll is closed", undefined, "POLL_CLOSED");

  const { optionIndex } = req.body;
  const option = poll.options[optionIndex];
  if (!option) throw ApiError.badRequest("That option doesn't exist", undefined, "INVALID_OPTION");

  const userId = req.user._id;
  const alreadyChosen = option.votes.some((vote) => vote.equals(userId));
  for (const each of poll.options) {
    each.votes = each.votes.filter((vote) => !vote.equals(userId));
  }
  if (!alreadyChosen) option.votes.push(userId);

  await poll.save();
  await poll.populate(POPULATE);

  emitToClassroom(req.classroom._id, "poll:updated", { classroomId: req.classroom._id, poll });
  res.json({ success: true, poll, myVote: alreadyChosen ? null : optionIndex });
};

/** PATCH /api/classrooms/:classroomId/polls/:pollId — close/reopen (creator or teacher). */
export const setPollClosed = async (req, res) => {
  const poll = await findPoll(req);
  if (!poll.createdBy.equals(req.user._id) && !hasClassroomPermission(req, PERMISSIONS.POLL_MANAGE)) {
    throw ApiError.forbidden("Only the poll's creator or a teacher can change it");
  }
  poll.closed = req.body.closed;
  await poll.save();
  await poll.populate(POPULATE);

  emitToClassroom(req.classroom._id, "poll:updated", { classroomId: req.classroom._id, poll });
  res.json({ success: true, poll });
};

/** DELETE /api/classrooms/:classroomId/polls/:pollId — creator or teacher. */
export const deletePoll = async (req, res) => {
  const poll = await findPoll(req);
  if (!poll.createdBy.equals(req.user._id) && !hasClassroomPermission(req, PERMISSIONS.POLL_MANAGE)) {
    throw ApiError.forbidden("Only the poll's creator or a teacher can delete it");
  }

  await poll.deleteOne();
  emitToClassroom(req.classroom._id, "poll:deleted", { classroomId: req.classroom._id, pollId: poll._id });
  res.json({ success: true, message: "Poll deleted" });
};
