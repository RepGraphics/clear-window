const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');

// POST /api/feedback - Submit feedback
router.post('/', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        if (!message || typeof message !== 'string' || message.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Feedback message is required.' });
        }
        const feedback = new Feedback({ name, email, message });
        await feedback.save();
        res.status(201).json({ success: true, message: 'Feedback submitted successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

module.exports = router;
