const express = require("express");
const router = express.Router();
const Class = require("../models/Class");
const Result = require("../models/Result");
const ProctorLog = require("../models/ProctorLog");
const Exam = require("../models/Exam");
const ExamAccess = require("../models/ExamAccess");
const User = require("../models/User");
const Student = require("../models/Student");
const { authenticate } = require('../middleware/auth');

// ==============================
// CREATE CLASS
// ==============================
router.post("/classes", authenticate, async (req, res) => {
  try {
    const { className, semester, branch, year } = req.body;
    if (!className || !semester || !branch) {
      return res.status(400).json({ success: false, message: "Class name, semester, and branch are required" });
    }

    if (req.userRole === 'teacher' && req.userMode === 'organization') {
        if (!req.teacherProfile || req.teacherProfile.department !== branch) {
            return res.status(403).json({
                success: false,
                message: `Denied: You are only authorized to create classes for the ${req.teacherProfile?.department || 'assigned'} branch.`
            });
        }
    }

    const userId = req.userId || (req.user && req.user._id);
    const newClass = new Class({
      className, semester, branch, year,
      students: [], createdBy: userId,
      mode: req.userMode || 'solo',
      organizationId: req.organizationId || null,
      registrationOpen: true, status: 'active'
    });

    await newClass.save();
    res.status(201).json({ success: true, message: "Class created successfully", class: newClass });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/classes", authenticate, async (req, res) => {
  try {
    const userId = req.userId || (req.user && req.user._id);
    const orgId = req.organizationId || null;
    let filter = {};
    if (req.userRole === 'principal' || (req.userRole === 'teacher' && req.userMode === 'organization')) {
      filter = { organizationId: orgId };
    } else {
      filter = { createdBy: userId, mode: 'solo' };
    }
    const classes = await Class.find(filter).sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get("/class/:id", authenticate, async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });
    res.json(cls);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post("/class/:id/clone", authenticate, async (req, res) => {
  try {
    const originalClass = await Class.findById(req.params.id);
    if (!originalClass) return res.status(404).json({ success: false, message: "Original class not found" });

    if (req.userRole === 'teacher' && req.userMode === 'organization') {
      if (!req.teacherProfile || req.teacherProfile.department !== originalClass.branch) {
        return res.status(403).json({ success: false, message: "Denied: You can only clone classes belonging to your branch." });
      }
    }

    const { newClassName } = req.body;
    const clonedClass = new Class({
      className: newClassName || `${originalClass.className} (Clone)`,
      semester: originalClass.semester,
      branch: originalClass.branch,
      year: originalClass.year,
      students: [],
      createdBy: req.userId,
      mode: req.userMode,
      organizationId: req.organizationId,
      registrationOpen: true,
      status: 'active'
    });

    await clonedClass.save();
    res.json({ success: true, message: "Class structure cloned successfully!", class: clonedClass });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put("/class/:id", authenticate, async (req, res) => {
    try {
        const { className, branch, year, semester } = req.body;
        const updatedClass = await Class.findByIdAndUpdate(req.params.id, { className, branch, year, semester }, { new: true });
        if (!updatedClass) return res.status(404).json({ success: false, message: "Class not found" });
        res.json({ success: true, message: "Class updated successfully", class: updatedClass });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete("/class/:id", authenticate, async (req, res) => {
    try {
        const cls = await Class.findById(req.params.id);
        if (!cls) return res.status(404).json({ success: false, message: "Class not found" });
        const exams = await Exam.find({ classId: req.params.id });
        const examIds = exams.map(e => e._id);
        if (examIds.length > 0) {
            await Result.deleteMany({ examId: { $in: examIds } });
            await ProctorLog.deleteMany({ examId: { $in: examIds } });
            await ExamAccess.deleteMany({ examId: { $in: examIds } });
            await Exam.deleteMany({ classId: req.params.id });
        }
        await Class.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Class and all related data deleted successfully" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Student Management in Class
router.post("/class/join/:classId", async (req, res) => {
  try {
    const { rollNo, enrollment, name, password } = req.body;
    const { classId } = req.params;
    const cls = await Class.findById(classId);
    if (!cls) return res.status(404).json({ success: false, message: "Class not found" });
    cls.students.push({ rollNo: Number(rollNo), enrollment, name, password, joinedAt: new Date() });
    await cls.save();
    res.json({ success: true, message: "Joined class successfully" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/class/import-students/:classId", authenticate, async (req, res) => {
  try {
    const { students } = req.body; // students: [{ rollNo, enrollment, name, password }]
    const classDoc = await Class.findById(req.params.classId);
    if (!classDoc) return res.status(404).json({ success: false, message: "Class not found" });

    const results = { added: 0, updated: 0, errors: [] };

    for (const s of students) {
        try {
            if (!s.enrollment || !s.name || !s.password) {
                results.errors.push(`Incomplete data for ${s.name || 'Unknown'}`);
                continue;
            }

            // 1. Unified Student/User creation
            // Use synthetic email for students: enrollment@institution.com
            const syntheticEmail = `${s.enrollment.toLowerCase()}@institution.com`;
            
            let user = await User.findOne({ email: syntheticEmail });
            if (!user) {
                user = new User({
                    name: s.name,
                    email: syntheticEmail,
                    password: s.password, // Will be hashed by pre-save
                    role: 'student',
                    mode: classDoc.mode,
                    organizationId: classDoc.organizationId
                });
                await user.save();
            }

            let studentProfile = await Student.findOne({ enrollmentNo: s.enrollment });
            if (!studentProfile) {
                studentProfile = new Student({
                    userId: user._id,
                    enrollmentNo: s.enrollment,
                    organizationId: classDoc.organizationId,
                    currentSemester: classDoc.semester,
                    branch: classDoc.branch,
                    addedBy: req.userId
                });
                await studentProfile.save();
                results.added++;
            } else {
                // Update profile if mismatch
                studentProfile.currentSemester = classDoc.semester;
                studentProfile.branch = classDoc.branch;
                await studentProfile.save();
                results.updated++;
            }

            // 2. Clear then Push to Class Roster (Avoid duplicates)
            const exists = classDoc.students.find(st => st.enrollment === s.enrollment);
            if (!exists) {
                classDoc.students.push({
                    rollNo: Number(s.rollNo),
                    enrollment: s.enrollment,
                    name: s.name,
                    password: s.password, // Note: We store plain text here for "solo" legacy, but User has hashed.
                    joinedAt: new Date()
                });
            } else {
                // Update existing roster entry
                exists.rollNo = Number(s.rollNo);
                exists.name = s.name;
                exists.password = s.password;
            }
        } catch (err) {
            results.errors.push(`Error adding ${s.enrollment}: ${err.message}`);
        }
    }

    await classDoc.save();
    res.json({ 
        success: true, 
        message: `Import complete. Added: ${results.added}, Updated: ${results.updated}`,
        errors: results.errors 
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete("/class/:id/student/:enrollment", authenticate, async (req, res) => {
    try {
        const cls = await Class.findById(req.params.id);
        if (!cls) return res.status(404).json({ success: false, message: "Class not found" });
        
        const initialCount = cls.students.length;
        cls.students = cls.students.filter(s => s.enrollment !== req.params.enrollment);
        
        if (cls.students.length === initialCount) {
            return res.status(404).json({ success: false, message: "Student not found in this class" });
        }

        await cls.save();
        res.json({ success: true, message: "Student removed from class successfully" });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/class/:classId/add-org-students", authenticate, async (req, res) => {
    try {
        const { classId } = req.params;
        const { studentEnrollments } = req.body;
        const cls = await Class.findById(classId);
        if (!cls) return res.status(404).json({ success: false, message: "Class not found" });
        const studentsToFetch = await Student.find({ enrollmentNo: { $in: studentEnrollments }, organizationId: req.organizationId }).populate('userId');
        let addedCount = 0;
        for (let sItem of studentsToFetch) {
            if (!cls.students.find(s => s.enrollment === sItem.enrollmentNo)) {
                cls.students.push({ rollNo: cls.students.length + 1, enrollment: sItem.enrollmentNo, name: sItem.userId?.name || "Unknown", password: "OrgUser", joinedAt: new Date() });
                addedCount++;
            }
        }
        await cls.save();
        res.json({ success: true, message: `Successfully added ${addedCount} students to class.` });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;