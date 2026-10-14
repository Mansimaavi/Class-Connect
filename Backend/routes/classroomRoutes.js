import express from "express";
import { z } from "zod";
import {
  addComment,
  createAnnouncement,
  deleteAnnouncement,
  deleteComment,
  getAnnouncement,
  listAnnouncements,
  updateAnnouncement,
} from "../Controllers/classroomController/announcementController.js";
import {
  createClassroom,
  deleteClassroom,
  getClassroom,
  joinClassroom,
  leaveClassroom,
  listMyClassrooms,
  regenerateJoinCode,
  updateClassroom,
} from "../Controllers/classroomController/classroomController.js";
import { listMembers, removeMember, updateMemberRole } from "../Controllers/classroomController/memberController.js";
import {
  deleteResource,
  downloadResource,
  listResources,
  summarizeResource,
  updateProgress,
  uploadResource,
} from "../Controllers/classroomController/resourceController.js";
import {
  bulkDeleteMessages,
  deleteMessage,
  editMessage,
  listMessages,
  markMessagesSeen,
  sendMessage,
} from "../Controllers/chatController/messageController.js";
import { createPoll, deletePoll, listPolls, setPollClosed, votePoll } from "../Controllers/chatController/pollController.js";
import { PERMISSIONS as P } from "../config/permissions.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { pickUploadedFile, uploadDocument } from "../middleware/multerMiddleware.js";
import { summarizeLimiter, uploadLimiter } from "../middleware/rateLimiters.js";
import { classroomAccess, requirePermission } from "../middleware/rbac.js";
import validate from "../middleware/validate.js";
import {
  announcementListQuery,
  announcementParams,
  bulkDeleteSchema,
  classroomParams,
  commentParams,
  commentSchema,
  createAnnouncementSchema,
  createClassroomSchema,
  createPollSchema,
  joinClassroomSchema,
  listClassroomsQuery,
  memberParams,
  messageListQuery,
  messageParams,
  pollParams,
  progressSchema,
  resourceParams,
  sendMessageSchema,
  summarySchema,
  updateAnnouncementSchema,
  updateClassroomSchema,
  updateMemberRoleSchema,
  voteSchema,
} from "../validators/classroomValidators.js";

const router = express.Router();

router.use(authenticate);

// --- classrooms ------------------------------------------------------------
router
  .route("/")
  .get(validate({ query: listClassroomsQuery }), listMyClassrooms)
  .post(requirePermission(P.CLASSROOM_CREATE), validate({ body: createClassroomSchema }), createClassroom);

router.post("/join", validate({ body: joinClassroomSchema }), joinClassroom);

router
  .route("/:classroomId")
  .get(validate({ params: classroomParams }), classroomAccess(P.CLASSROOM_VIEW), getClassroom)
  .patch(
    validate({ params: classroomParams, body: updateClassroomSchema }),
    classroomAccess(P.CLASSROOM_UPDATE),
    updateClassroom
  )
  .delete(validate({ params: classroomParams }), classroomAccess(P.CLASSROOM_DELETE), deleteClassroom);

router.post(
  "/:classroomId/join-code",
  validate({ params: classroomParams }),
  classroomAccess(P.MEMBER_MANAGE),
  regenerateJoinCode
);
router.post("/:classroomId/leave", validate({ params: classroomParams }), classroomAccess(P.CLASSROOM_LEAVE), leaveClassroom);

// --- members ---------------------------------------------------------------
router.get("/:classroomId/members", validate({ params: classroomParams }), classroomAccess(P.MEMBER_VIEW), listMembers);
router
  .route("/:classroomId/members/:userId")
  .patch(
    validate({ params: memberParams, body: updateMemberRoleSchema }),
    classroomAccess(P.MEMBER_ROLE_UPDATE),
    updateMemberRole
  )
  .delete(validate({ params: memberParams }), classroomAccess(P.MEMBER_MANAGE), removeMember);

// --- resources -------------------------------------------------------------
router
  .route("/:classroomId/resources")
  .get(validate({ params: classroomParams }), classroomAccess(P.RESOURCE_VIEW), listResources)
  .post(
    validate({ params: classroomParams }),
    classroomAccess(P.RESOURCE_UPLOAD),
    uploadLimiter,
    uploadDocument,
    pickUploadedFile,
    uploadResource
  );
router.delete(
  "/:classroomId/resources/:resourceId",
  validate({ params: resourceParams }),
  classroomAccess(P.RESOURCE_VIEW),
  deleteResource
);
router.get(
  "/:classroomId/resources/:resourceId/download",
  validate({ params: resourceParams }),
  classroomAccess(P.RESOURCE_VIEW),
  downloadResource
);
router.put(
  "/:classroomId/resources/:resourceId/progress",
  validate({ params: resourceParams, body: progressSchema }),
  classroomAccess(P.RESOURCE_VIEW),
  updateProgress
);
router.post(
  "/:classroomId/resources/:resourceId/summary",
  validate({ params: resourceParams, body: summarySchema }),
  classroomAccess(P.RESOURCE_VIEW),
  summarizeLimiter,
  summarizeResource
);

// --- announcements ---------------------------------------------------------
router
  .route("/:classroomId/announcements")
  .get(validate({ params: classroomParams, query: announcementListQuery }), classroomAccess(P.ANNOUNCEMENT_VIEW), listAnnouncements)
  .post(
    validate({ params: classroomParams, body: createAnnouncementSchema }),
    classroomAccess(P.ANNOUNCEMENT_CREATE),
    createAnnouncement
  );
router
  .route("/:classroomId/announcements/:announcementId")
  .get(validate({ params: announcementParams }), classroomAccess(P.ANNOUNCEMENT_VIEW), getAnnouncement)
  .patch(
    validate({ params: announcementParams, body: updateAnnouncementSchema }),
    classroomAccess(P.ANNOUNCEMENT_MANAGE),
    updateAnnouncement
  )
  .delete(validate({ params: announcementParams }), classroomAccess(P.ANNOUNCEMENT_MANAGE), deleteAnnouncement);
router.post(
  "/:classroomId/announcements/:announcementId/comments",
  validate({ params: announcementParams, body: commentSchema }),
  classroomAccess(P.ANNOUNCEMENT_COMMENT),
  addComment
);
router.delete(
  "/:classroomId/announcements/:announcementId/comments/:commentId",
  validate({ params: commentParams }),
  classroomAccess(P.ANNOUNCEMENT_VIEW),
  deleteComment
);

// --- chat ------------------------------------------------------------------
router
  .route("/:classroomId/messages")
  .get(validate({ params: classroomParams, query: messageListQuery }), classroomAccess(P.CLASSROOM_VIEW), listMessages)
  .post(validate({ params: classroomParams, body: sendMessageSchema }), classroomAccess(P.MESSAGE_SEND), sendMessage);
router.post(
  "/:classroomId/messages/bulk-delete",
  validate({ params: classroomParams, body: bulkDeleteSchema }),
  classroomAccess(P.MESSAGE_SEND),
  bulkDeleteMessages
);
router.post("/:classroomId/messages/seen", validate({ params: classroomParams }), classroomAccess(P.CLASSROOM_VIEW), markMessagesSeen);
router
  .route("/:classroomId/messages/:messageId")
  .patch(validate({ params: messageParams, body: sendMessageSchema }), classroomAccess(P.MESSAGE_SEND), editMessage)
  .delete(validate({ params: messageParams }), classroomAccess(P.CLASSROOM_VIEW), deleteMessage);

// --- polls -----------------------------------------------------------------
router
  .route("/:classroomId/polls")
  .get(validate({ params: classroomParams }), classroomAccess(P.CLASSROOM_VIEW), listPolls)
  .post(validate({ params: classroomParams, body: createPollSchema }), classroomAccess(P.POLL_CREATE), createPoll);
router.post(
  "/:classroomId/polls/:pollId/vote",
  validate({ params: pollParams, body: voteSchema }),
  classroomAccess(P.POLL_VOTE),
  votePoll
);
router
  .route("/:classroomId/polls/:pollId")
  .patch(
    validate({ params: pollParams, body: z.object({ closed: z.boolean() }) }),
    classroomAccess(P.CLASSROOM_VIEW),
    setPollClosed
  )
  .delete(validate({ params: pollParams }), classroomAccess(P.CLASSROOM_VIEW), deletePoll);

export default router;
