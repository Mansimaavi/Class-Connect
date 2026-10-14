import express from "express";
import {
  createAnswer,
  deleteAnswer,
  listAnswers,
  reactToAnswer,
} from "../Controllers/discussionController/answerController.js";
import {
  createQuestion,
  deleteQuestion,
  getQuestion,
  listQuestions,
} from "../Controllers/discussionController/questionController.js";
import { PERMISSIONS as P } from "../config/permissions.js";
import { authenticate, optionalAuth } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/rbac.js";
import validate from "../middleware/validate.js";
import {
  answerParams,
  createAnswerSchema,
  createQuestionSchema,
  listQuestionsQuery,
  questionParams,
  reactionSchema,
} from "../validators/contentValidators.js";

export const questionRouter = express.Router();
export const answerRouter = express.Router();

questionRouter.get("/", validate({ query: listQuestionsQuery }), listQuestions);
questionRouter.post(
  "/",
  authenticate,
  requirePermission(P.DISCUSSION_POST),
  validate({ body: createQuestionSchema }),
  createQuestion
);
questionRouter.get("/:questionId", validate({ params: questionParams }), getQuestion);
questionRouter.delete("/:questionId", authenticate, validate({ params: questionParams }), deleteQuestion);
questionRouter.get("/:questionId/answers", optionalAuth, validate({ params: questionParams }), listAnswers);
questionRouter.post(
  "/:questionId/answers",
  authenticate,
  requirePermission(P.DISCUSSION_POST),
  validate({ params: questionParams, body: createAnswerSchema }),
  createAnswer
);

answerRouter.post(
  "/:answerId/reaction",
  authenticate,
  validate({ params: answerParams, body: reactionSchema }),
  reactToAnswer
);
answerRouter.delete("/:answerId", authenticate, validate({ params: answerParams }), deleteAnswer);
