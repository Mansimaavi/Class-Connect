
import express from "express";
import Answer from "../models/DiscussionModels/Answer.js";
import Question from "../models/DiscussionModels/Question.js";

const router = express.Router();

// ✅ Add an answer
router.post("/", async (req, res) => {
  console.log(req.data);
  try {
    console.log(req.body);
    const { text, photo, questionId } = req.body;

    if (!questionId || (!text && !photo)) {
      console.log("hiii");
      return res.status(400).json({
        status: false,
        message: "Question ID and either text or photo are required",
      });
    }

    const answer = new Answer({
      text,
      photo,
      questionId,
    });

    await answer.save();

    // ✅ Update the question with the new answer
    await Question.findByIdAndUpdate(questionId, {

      $push: { answers: answer._id },
    
    });
    console.log(Question.data);
    res.status(201).json({
      status: true,
      message: "Answer added suSccessfully",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      status: false,
      message: "Error while adding answer",
    });
  }
});

// ✅ Like an answer
router.post("/:id/like", async (req, res) => {
  const userId = req.body.userId;

  try {
    const answer = await Answer.findById(req.params.id);
    if (!answer) {
      return res.status(404).json({ status: false, message: "Answer not found" });
    }

    // Already liked
    if (answer.likedBy.includes(userId)) {
      return res.status(400).json({ status: false, message: "You have already liked this answer" });
    }

    // Already disliked
    if (answer.dislikedBy.includes(userId)) {
      return res.status(400).json({ status: false, message: "You cannot like after disliking" });
    }

    // Perform like
    answer.likes += 1;
    answer.likedBy.push(userId);
    await answer.save();

    res.status(200).json({ status: true, likes: answer.likes, message: "Answer liked successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Error liking the answer" });
  }
});


// ✅ Dislike an answer
router.post("/:id/dislike", async (req, res) => {
  const userId = req.body.userId;

  try {
    const answer = await Answer.findById(req.params.id);
    if (!answer) {
      return res.status(404).json({ status: false, message: "Answer not found" });
    }

    // Already disliked
    if (answer.dislikedBy.includes(userId)) {
      return res.status(400).json({ status: false, message: "You have already disliked this answer" });
    }

    // Already liked
    if (answer.likedBy.includes(userId)) {
      return res.status(400).json({ status: false, message: "You cannot dislike after liking" });
    }

    // Perform dislike
    answer.dislikes += 1;
    answer.dislikedBy.push(userId);
    await answer.save();

    res.status(200).json({ status: true, dislikes: answer.dislikes, message: "Answer disliked successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Error disliking the answer" });
  }
});

// ✅ Get an answer
// ✅ Get all answers for a specific question ID
router.get("/:id", async (req, res) => {
  const questionId = req.params.id;
  console.log("Fetching answers for question ID:", questionId);

  try {
    const answers = await Answer.find({ questionId });

    if (!answers || answers.length === 0) {
      return res.status(404).json({ status: false, message: "No answers found" });
    }

    res.status(200).json(answers);
  } catch (e) {
    console.error("Error fetching answers:", e);
    res.status(500).json({ status: false, message: "Error fetching the answers" });
  }
});

export default router;
