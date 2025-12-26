import express from "express";
import Question from "../models/DiscussionModels/Question.js";

const router = express.Router();

// ✅ Add a question
router.post("/", async (req, res) => {
  try {
    const { questionName, questionUrl } = req.body;

    if (!questionName) {
      return res.status(400).json({
        status: false,
        message: "Question name is required",
      });
    }

    const newQuestion = new Question({
      questionName,
      questionUrl,
    });

    await newQuestion.save();
    res.status(201).json({
      status: true,
      message: "Question added successfully",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      status: false,
      message: "Error while adding question",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const questionsWithAnswers = await Question.aggregate([
      {
        $lookup: {
          from: "answers",
          localField: "_id",
          foreignField: "questionId",
          as: "allAnswers",
        },
      },
      {
        $set: {
          allAnswers: {
            $map: {
              input: "$allAnswers",
              as: "answer",
              in: {
                _id: "$$answer._id",
                createdAt: "$$answer.createdAt",
                answer: { $ifNull: ["$$answer.text", ""] }, // Ensure it's always a string
             //   user: "$$answer.user",
                likes: { $ifNull: ["$$answer.likes", 0] },
                dislikes: { $ifNull: ["$$answer.dislikes", 0] },
              },
            },
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    res.status(200).send(questionsWithAnswers);
  } catch (error) {
    console.error("Error fetching questions with answers:", error);
    res.status(500).send({ status: false, message: "Error fetching data" });
  }
});


export default router;
