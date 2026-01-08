const express = require("express");
const router = express.Router();
const Class = require("../models/Class");

// ==============================
// CREATE CLASS
// ==============================
router.post("/classes", async (req, res) => {
  try {
    const { className, subject, semester, branch, year } = req.body;

    if (!className || !subject || !semester || !branch || !year) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const newClass = new Class({
      className,
      subject,
      semester,
      branch,
      year,
      students: [],
    });

    await newClass.save();

    res.status(201).json({
      success: true,
      message: "Class created successfully",
      class: newClass,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ==============================
// GET ALL CLASSES
// ==============================
router.get("/classes", async (req, res) => {
  try {
    const classes = await Class.find().sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==============================
// GET SINGLE CLASS BY ID
// ==============================
router.get("/class/:id", async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);

    if (!cls) {
      return res.status(404).json({ message: "Class not found" });
    }

    res.json(cls);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ==============================
// JOIN CLASS (WITH ROLL NO)
// ==============================
router.post("/class/join/:classId", async (req, res) => {
  try {
    const { rollNo, enrollment, name, password } = req.body;
    const { classId } = req.params;

    // ✅ basic validation
    if (!rollNo || !enrollment || !name || !password) {
      return res.status(400).json({
        success: false,
        message: "Roll No, enrollment, name and password are required",
      });
    }

    const cls = await Class.findById(classId);
    if (!cls) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // ❌ SAME ENROLLMENT IN ANY CLASS
    const enrollmentExists = await Class.findOne({
      "students.enrollment": enrollment,
    });

    if (enrollmentExists) {
      return res.status(400).json({
        success: false,
        message: "This enrollment number has already joined a class",
      });
    }

    // ❌ SAME ROLL NO IN SAME CLASS
    const rollExists = cls.students.find(
      (s) => s.rollNo === Number(rollNo)
    );

    if (rollExists) {
      return res.status(400).json({
        success: false,
        message: "This roll number already exists in this class",
      });
    }

    // ❌ SAME ENROLLMENT IN SAME CLASS (extra safety)
    const alreadyJoined = cls.students.find(
      (s) => s.enrollment === enrollment
    );

    if (alreadyJoined) {
      return res.status(400).json({
        success: false,
        message: "Student already joined this class",
      });
    }

    // ✅ ADD STUDENT
    cls.students.push({
      rollNo: Number(rollNo),
      enrollment,
      name,
      password,
      joinedAt: new Date(),
    });

    await cls.save();

    res.json({
      success: true,
      message: "Joined class successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
