import Question from "../../models/Question.js";

// ✅ Create a question (Only authenticated users)
export const createQuestion = async (req, res) => {
  try {
    const { questionName, questionUrl } = req.body;
    const user = req.user; // From AuthMiddleware

    if (!questionName) {
      return res.status(400).json({ message: "Question name is required" });
    }

    const newQuestion = new Question({
      questionName,
      questionUrl,
      user: user._id,
    });

    await newQuestion.save();
    res.status(201).json(newQuestion);
  } catch (error) {
    res.status(500).json({ message: "Error adding question" });
  }
};

// ✅ Fetch all questions with answers
export const getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find().populate("user", "userName photo")
      .populate({ path: "answers", populate: { path: "user", select: "userName photo" } });

    res.status(200).json(questions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching questions" });
  }
};

// ✅ Delete question (Only by owner)
export const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: "Question not found" });

    if (question.user.toString() !== req.user._id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await question.deleteOne();
    res.status(200).json({ message: "Question deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting question" });
  }
};
