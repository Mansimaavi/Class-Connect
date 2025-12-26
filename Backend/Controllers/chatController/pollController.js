import Poll from "../../models/ChatModels/Poll.js";

export const createPoll = async (req, res) => {
  const { question, options } = req.body;
  const folder = req.params.folderId;
  const createdBy = req.user._id;

  if (!question || !options || options.length < 2)
    return res.status(400).json({ message: "Question and at least 2 options required" });

  const poll = new Poll({ question, options: options.map(text => ({ text })), createdBy, folder });
  await poll.save();
  res.status(201).json(poll);
};

export const votePoll = async (req, res) => {
  const { optionIndex } = req.body;
  const pollId = req.params.pollId;
  const userId = req.user._id;
  const poll = await Poll.findById(pollId);
  if (!poll) return res.status(404).json({ message: "Poll not found" });
  // Prevent duplicate vote
  const alreadyVoted = poll.options.some(opt => opt.votes.includes(userId));
  if (alreadyVoted) return res.status(400).json({ message: "Already voted" });

  poll.options[optionIndex].votes.push(userId);
  await poll.save();
  res.json(poll);
};

export const getPollsByFolder = async (req, res) => {
  const polls = await Poll.find({ folder: req.params.folderId })
    .populate("createdBy", "name")
    .populate("options.votes", "name");

  res.json(polls);
};
export const deletePoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    if (!poll) return res.status(404).json({ message: "Poll not found" });
    // Only the creator of the poll can delete it
    if (poll.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to delete this poll" });
    }

    await poll.deleteOne(); // or Poll.findByIdAndDelete(req.params.pollId)
    res.status(200).json({ message: "Poll deleted successfully" });
  } catch (err) {
    console.error("Error deleting poll:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const unvotePoll = async (req, res) => {
  const { optionIndex } = req.body;
  const pollId = req.params.pollId;
  const userId = req.user._id;

  const poll = await Poll.findById(pollId);
  if (!poll) return res.status(404).json({ message: "Poll not found" });

  const option = poll.options[optionIndex];
  if (!option) return res.status(400).json({ message: "Invalid option" });

  const index = option.votes.indexOf(userId);
  if (index === -1) return res.status(400).json({ message: "You haven't voted for this option" });

  option.votes.splice(index, 1);
  await poll.save();

  res.json(poll);
};
