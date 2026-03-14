const express = require('express');
const router = express.Router();
const { authenticate, isPrincipal } = require('../middleware/auth');
const User = require('../models/User');
const TeacherProfile = require('../models/TeacherProfile');
const Organization = require('../models/Organization');

// Consolidated authorization for principal routes
router.use(authenticate, (req, res, next) => {
    if (req.userRole === 'principal') {
        return next();
    }
    return res.status(403).json({ success: false, message: "Access denied. Principals only." });
});

// 1. Organization Management
router.get('/organization', async (req, res) => {
  try {
    const organization = await Organization.findById(req.organizationId);
    if (!organization) return res.status(404).json({ success: false, message: 'Registry not found' });
    res.json({ success: true, organization });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Faculty Management
router.post('/teacher/add', async (req, res) => {
  try {
    const { name, email, password, department, employeeId } = req.body;
    const organization = await Organization.findById(req.organizationId);
    if (!organization) return res.status(404).json({ success: false, message: 'Organization context lost' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    const teacherUser = new User({
      name, email, password,
      role: 'teacher', mode: 'organization',
      organizationId: organization._id,
    });
    await teacherUser.save();

    const teacherProfile = new TeacherProfile({
      userId: teacherUser._id,
      mode: 'organization',
      organizationId: organization._id,
      department, employeeId,
    });
    await teacherProfile.save();

    organization.teachers.push({ userId: teacherUser._id, department, employeeId });
    await organization.save();

    res.status(201).json({ success: true, message: 'Teacher onboarded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/teachers', async (req, res) => {
  try {
    const organization = await Organization.findById(req.organizationId).populate('teachers.userId', 'name email status');
    if (!organization) return res.status(404).json({ success: false, message: 'Registry not found' });
    res.json({ success: true, teachers: organization.teachers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/teacher/toggle-status/:teacherId', async (req, res) => {
  try {
    const user = await User.findById(req.params.teacherId);
    if (!user || user.organizationId?.toString() !== req.organizationId.toString()) {
      return res.status(404).json({ success: false, message: 'Account not found in your scope' });
    }
    user.status = user.status === 'active' ? 'suspended' : 'active';
    await user.save();
    res.json({ success: true, message: `Status updated to ${user.status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/teacher/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    console.log(`[DEBUG] Attempting purge of teacher ${teacherId} from Org ${req.organizationId}`);

    const organization = await Organization.findById(req.organizationId);
    if (!organization) return res.status(404).json({ success: false, message: 'Principal organization record not found' });

    const idx = organization.teachers.findIndex(t => t.userId && t.userId.toString() === teacherId);
    if (idx === -1) {
        console.warn(`[PURGE WARNING] Teacher ${teacherId} not indexed in Org ${req.organizationId}`);
        return res.status(404).json({ success: false, message: 'Teacher entry not found in organization registry' });
    }

    // Execution sequence
    organization.teachers.splice(idx, 1);
    await organization.save();
    
    await TeacherProfile.findOneAndDelete({ userId: teacherId });
    await User.findByIdAndDelete(teacherId);

    console.log(`[SUCCESS] Teacher ${teacherId} fully purged from system`);
    res.json({ success: true, message: 'Faculty record and profile purged successfully' });
  } catch (error) {
    console.error("[PURGE ERROR]:", error);
    res.status(500).json({ success: false, message: 'System error during purge protocol' });
  }
});

router.get('/students', async (req, res) => {
  try {
    const Student = require('../models/Student');
    const { search, branch, semester } = req.query;
    let filter = { organizationId: req.organizationId };
    if (branch) filter.branch = branch;
    if (semester) filter.currentSemester = Number(semester);
    
    let students = await Student.find(filter).populate('userId', 'name email').sort({ rollNo: 1 });
    
    if (search) {
      students = students.filter(s => 
        s.userId?.name.toLowerCase().includes(search.toLowerCase()) || 
        s.rollNo?.toString().toLowerCase().includes(search.toLowerCase())
      );
    }

    // Dynamic metadata for filters
    const allBranches = await Student.distinct('branch', { organizationId: req.organizationId });
    const allSemesters = await Student.distinct('currentSemester', { organizationId: req.organizationId });

    res.json({ 
      success: true, 
      students,
      metadata: {
        branches: allBranches.sort(),
        semesters: allSemesters.sort((a,b) => a - b)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/organization', async (req, res) => {
  try {
    const { 
        name, organizationName,
        type, institutionType,
        address, logo, settings, branches, academicYears, semesters, subjects 
    } = req.body;
    const organization = await Organization.findById(req.organizationId);
    if (!organization) return res.status(404).json({ success: false, message: "Organization record missing" });

    // Sync redundant fields
    if (organizationName) organization.organizationName = organizationName;
    if (name) organization.organizationName = name;
    
    if (institutionType) organization.institutionType = institutionType;
    if (type) organization.institutionType = type;

    if (address) organization.address = address;
    if (logo) organization.logo = logo;
    if (settings) organization.settings = settings;
    if (branches) organization.branches = branches;
    if (academicYears) organization.academicYears = academicYears;
    if (semesters) organization.semesters = semesters;
    if (subjects) {
      organization.subjects = subjects;
      organization.markModified('subjects');
    }

    const savedOrg = await organization.save();
    res.json({ success: true, message: 'Archive updated', organization: savedOrg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/promote-students', async (req, res) => {
  try {
    const { currentSemester, newSemester, branch, newYear } = req.body;
    const Student = require('../models/Student');
    const Class = require('../models/Class');
    const students = await Student.find({ organizationId: req.organizationId, currentSemester, branch, status: 'active' });
    
    if (students.length === 0) return res.status(404).json({ success: false, message: 'No eligible students for promotion' });

    for (let student of students) {
      const currentClasses = await Class.find({ organizationId: req.organizationId, semester: currentSemester, branch, status: 'active', 'students.enrollment': student.enrollmentNo });
      student.academicHistory.push({ year: student.currentYear, semester: student.currentSemester, classes: currentClasses.map(c => c._id), completedAt: new Date() });
      student.currentSemester = newSemester;
      if (newYear) student.currentYear = newYear;
      await student.save();
    }

    await Class.updateMany({ organizationId: req.organizationId, semester: currentSemester, branch, status: 'active' }, { $set: { status: 'completed' } });
    res.json({ success: true, message: `Successfully promoted ${students.length} students` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const organization = await Organization.findById(req.organizationId);
    if (!organization) return res.status(404).json({ success: false, message: 'Stats source unavailable' });
    
    const Class = require('../models/Class');
    const Exam = require('../models/Exam');
    res.json({ success: true, stats: { 
      totalTeachers: organization.teachers.length, 
      totalStudents: organization.students.length, 
      totalClasses: await Class.countDocuments({ organizationId: req.organizationId }), 
      totalExams: await Exam.countDocuments({ organizationId: req.organizationId }) 
    }});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    const Student = require('../models/Student');
    const Exam = require('../models/Exam');
    const branchStats = await Student.aggregate([{ $match: { organizationId: new require('mongoose').Types.ObjectId(req.organizationId) } }, { $group: { _id: "$branch", count: { $sum: 1 } } }]);
    const examStats = await Exam.aggregate([{ $match: { organizationId: new require('mongoose').Types.ObjectId(req.organizationId) } }, { $group: { _id: "$status", count: { $sum: 1 } } }]);
    res.json({ success: true, data: { branchStats, examStats } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
