const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');
const { authenticate, isPrincipal } = require('../middleware/auth');

// @route   GET /api/org/settings
// @desc    Get organization settings
router.get('/settings', authenticate, isPrincipal, async (req, res) => {
    try {
        const org = await Organization.findById(req.organizationId);
        if (!org) {
            return res.json({
                organizationName: '',
                institutionType: 'School',
                address: '',
                logoUrl: '',
                branches: [],
                academicYears: [],
                semesters: [],
                subjects: [],
                permissions: {
                    allowTeacherStudentImport: false,
                    principalApprovalLoop: false,
                    internalExamSharing: false
                }
            });
        }
        res.json(org);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   PUT /api/org/settings
// @desc    Update organization settings (Handles Base64 logo in body)
router.put('/settings', authenticate, isPrincipal, async (req, res) => {
    try {
        const { 
            organizationName, 
            institutionType, 
            address, 
            branches, 
            academicYears, 
            semesters, 
            subjects, 
            permissions,
            logoUrl // Base64 string from frontend
        } = req.body;

        if (!organizationName || organizationName.length < 2) {
            return res.status(400).json({ message: 'Organization name is required (min 2 chars)' });
        }

        const updateData = {
            organizationName,
            institutionType,
            address,
            branches,
            academicYears,
            semesters,
            subjects,
            permissions,
            logoUrl
        };

        const updatedOrg = await Organization.findOneAndUpdate(
            { _id: req.organizationId },
            { $set: updateData },
            { upsert: true, new: true, runValidators: true }
        );

        res.json(updatedOrg);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
