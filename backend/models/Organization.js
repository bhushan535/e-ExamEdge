const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false,
  },
  type: {
    type: String,
    required: false,
  },
  principalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  logoUrl: { type: String, default: '' },
  address: {
    type: String,
    default: '',
  },
  organizationName: { type: String },
  institutionType: { 
    type: String, 
    enum: ['School','College','University','Institute'], 
    default: 'School' 
  },
  branches: [{ type: String }],
  academicYears: [{ type: String }],
  semesters: [{ type: String }],
  permissions: {
    allowTeacherStudentImport: { type: Boolean, default: false },
    principalApprovalLoop: { type: Boolean, default: false },
    internalExamSharing: { type: Boolean, default: false }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  teachers: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      department: {
        type: String,
      },
      employeeId: {
        type: String,
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active',
      },
    },
  ],
  students: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  subjects: [
    {
      name: { type: String, required: true },
      code: { type: String, required: true },
      branch: { type: String, required: true },
      semester: { type: String, required: true }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Organization', organizationSchema);
