import { PERMISSIONS, roleHasPermission } from "../../config/permissions.js";
import Answer from "../../models/answer.js";
import Question from "../../models/question.js";
import ApiError from "../../utils/ApiError.js";
import { paginationMeta } from "../../validators/common.js";

const AUTHOR_FIELDS = "name username avatarUrl";

/** GET /api/questions?search=&page=&limit= (public) */
export const listQuestions = async (req, res) => {
  const { search, page, limit } = req.query;
  const filter = {};
  if (search) {
    const pattern = new RegExp(search, "i");
    filter.$or = [{ title: pattern }, { details: pattern }];
  }

  const [questions, total] = await Promise.all([
    Question.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("author", AUTHOR_FIELDS),
    Question.countDocuments(filter),
  ]);

  res.json({ success: true, questions, pagination: paginationMeta({ page, limit }, total) });
};

/** GET /api/questions/:questionId (public) */
export const getQuestion = async (req, res) => {
  const question = await Question.findById(req.params.questionId).populate("author", AUTHOR_FIELDS);
  if (!question) throw ApiError.notFound("Question");
  res.json({ success: true, question });
};

/** POST /api/questions */
export const createQuestion = async (req, res) => {
  const question = await Question.create({ ...req.body, author: req.user._id });
  await question.populate("author", AUTHOR_FIELDS);
  res.status(201).json({ success: true, message: "Question posted", question });
};

/** DELETE /api/questions/:questionId — author or moderator. */
export const deleteQuestion = async (req, res) => {
  const question = await Question.findById(req.params.questionId);
  if (!question) throw ApiError.notFound("Question");
  if (!question.author.equals(req.user._id) && !roleHasPermission(req.user.role, PERMISSIONS.CONTENT_MODERATE)) {
    throw ApiError.forbidden("You can only delete your own questions");
  }
  await Promise.all([question.deleteOne(), Answer.deleteMany({ question: question._id })]);
  res.json({ success: true, message: "Question deleted" });
};
