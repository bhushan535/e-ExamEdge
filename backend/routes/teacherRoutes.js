const express = require("express");
const router = express.Router();

// Import required for backward compatibility
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper function for token generation
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// LEGACY LOGIN REMOVED - Use /api/auth/login instead
router.post('/teacher/login', async (req, res) => {
    res.status(410).json({ success: false, message: "Legacy login is disabled. Please use the organization login." });
});

module.exports = router;
