const express = require("express");
const router = express.Router();
const Question = require("../models/Question");
const Exam = require("../models/Exam");

// ADD QUESTION
router.post("/questions", async (req, res) => {
  try {
    const { examId } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const count = await Question.countDocuments({ examId });

    if (count >= exam.totalQuestions) {
      return res.status(400).json({
        message: `Only ${exam.totalQuestions} questions allowed`,
      });
    }

    const question = new Question(req.body);
    await question.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET QUESTIONS BY EXAM
router.get("/questions/:examId", async (req, res) => {
  try {
    const questions = await Question.find({ examId: req.params.examId });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE QUESTION
router.put("/questions/:id", async (req, res) => {
  try {
    await Question.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE QUESTION
router.delete("/questions/:id", async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
