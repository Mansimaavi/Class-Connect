import { PERMISSIONS, roleHasPermission } from "../../config/permissions.js";
import Answer from "../../models/answer.js";
import Question from "../../models/question.js";
import ApiError from "../../utils/ApiError.js";

const AUTHOR_FIELDS = "name username avatarUrl";

const myReaction = (answer, userId) => {
  if (!userId) return null;
  const id = userId.toString();
  if (answer.likedBy.some((user) => user.toString() === id)) return "like";
  if (answer.dislikedBy.some((user) => user.toString() === id)) return "dislike";
  return null;
};

const serialize = (answer, userId) => {
  const { likedBy: _liked, dislikedBy: _disliked, ...rest } = answer.toJSON();
  return { ...rest, myReaction: myReaction(answer, userId) };
};

/** GET /api/questions/:questionId/answers (public; shows your reaction when signed in) */
export const listAnswers = async (req, res) => {
  if (!(await Question.exists({ _id: req.params.questionId }))) throw ApiError.notFound("Question");
  const answers = await Answer.find({ question: req.params.questionId })
    .sort({ createdAt: 1 })
    .populate("author", AUTHOR_FIELDS);
  res.json({ success: true, answers: answers.map((answer) => serialize(answer, req.user?._id)) });
};

/** POST /api/questions/:questionId/answers */
export const createAnswer = async (req, res) => {
  const question = await Question.findById(req.params.questionId);
  if (!question) throw ApiError.notFound("Question");

  const answer = await Answer.create({ ...req.body, question: question._id, author: req.user._id });
  await Question.updateOne({ _id: question._id }, { $inc: { answerCount: 1 } });
  await answer.populate("author", AUTHOR_FIELDS);

  res.status(201).json({ success: true, message: "Answer posted", answer: serialize(answer, req.user._id) });
};

/**
 * POST /api/answers/:answerId/reaction  { type: "like" | "dislike" }
 * Toggles: reacting the same way twice removes the reaction; switching moves it.
 */
export const reactToAnswer = async (req, res) => {
  const answer = await Answer.findById(req.params.answerId);
  if (!answer) throw ApiError.notFound("Answer");

  const userId = req.user._id;
  const current = myReaction(answer, userId);
  answer.likedBy.pull(userId);
  answer.dislikedBy.pull(userId);
  if (current !== req.body.type) {
    (req.body.type === "like" ? answer.likedBy : answer.dislikedBy).push(userId);
  }
  await answer.save();

  res.json({
    success: true,
    likes: answer.likedBy.length,
    dislikes: answer.dislikedBy.length,
    myReaction: current === req.body.type ? null : req.body.type,
  });
};

/** DELETE /api/answers/:answerId — author or moderator. */
export const deleteAnswer = async (req, res) => {
  const answer = await Answer.findById(req.params.answerId);
  if (!answer) throw ApiError.notFound("Answer");
  if (!answer.author.equals(req.user._id) && !roleHasPermission(req.user.role, PERMISSIONS.CONTENT_MODERATE)) {
    throw ApiError.forbidden("You can only delete your own answers");
  }
  await answer.deleteOne();
  await Question.updateOne({ _id: answer.question, answerCount: { $gt: 0 } }, { $inc: { answerCount: -1 } });
  res.json({ success: true, message: "Answer deleted" });
};
