import Answer from "../../models/Answer.js";
import Question from "../../models/Question.js";
// ✅ Get answers for a specific question
export const getAnswers = async (req, res) => {
  try {
    const { questionId } = req.params;
    if (!questionId) {
      return res.status(400).json({ message: "Question ID is required" });
    }

    const answers = await Answer.find({ questionId }).populate("user", "name email");

    res.status(200).json(answers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching answers" });
  }
};

// ✅ Create an answer (Only authenticated users)
export const createAnswer = async (req, res) => {
  try {
    const { answer, questionId } = req.body;
    const user = req.user; 

    if (!answer || !questionId) {
      return res.status(400).json({ message: "Answer and Question ID are required" });
    }

    const newAnswer = new Answer({
      answer,
      questionId,
      user: user._id,
    });

    await newAnswer.save();
    res.status(201).json(newAnswer);
  } catch (error) {
    res.status(500).json({ message: "Error adding answer" });
  }
};

// ✅ Like an answer
export const likeAnswer = async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);
    if (!answer) return res.status(404).json({ message: "Answer not found" });

    answer.likes += 1;
    await answer.save();

    res.status(200).json({ likes: answer.likes });
  } catch (error) {
    res.status(500).json({ message: "Error liking answer" });
  }
};

// ✅ Dislike an answer
export const dislikeAnswer = async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);
    if (!answer) return res.status(404).json({ message: "Answer not found" });

    answer.dislikes += 1;
    await answer.save();

    res.status(200).json({ dislikes: answer.dislikes });
  } catch (error) {
    res.status(500).json({ message: "Error disliking answer" });
  }
};

// ✅ Delete an answer
export const deleteAnswer = async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);
    if (!answer) return res.status(404).json({ message: "Answer not found" });

    if (answer.user.toString() !== req.user._id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await answer.deleteOne();
    res.status(200).json({ message: "Answer deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting answer" });
  }
};
