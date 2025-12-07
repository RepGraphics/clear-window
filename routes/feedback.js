const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');

// HTML escape function for XSS protection
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Anti-spam: Spam keyword detection
const spamKeywords = [
    'whatsapp', 'reference website', 'business online', 'digital presence',
    'seo service', 'rank your website', 'generate more leads', 'professional website',
    'warm regards', 'best regards', 'click here', 'limited time offer',
    'make money', 'earn money', 'crypto', 'investment opportunity',
    'weight loss', 'dating site', 'adult content', 'viagra', 'cialis'
];

// Rate limiting map (IP -> last submission time)
const rateLimitMap = new Map();
const RATE_LIMIT_MS = 60000; // 1 minute

function detectSpam(text) {
    const lowerText = text.toLowerCase();
    
    // Check for excessive URLs (more than 2)
    const urlCount = (lowerText.match(/http[s]?:\/\//g) || []).length;
    if (urlCount > 2) return true;
    
    // Check for spam keywords (2 or more)
    let keywordCount = 0;
    for (const keyword of spamKeywords) {
        if (lowerText.includes(keyword)) keywordCount++;
        if (keywordCount >= 2) return true;
    }
    
    // Check for excessive capitalization (more than 30% caps)
    const capsCount = (text.match(/[A-Z]/g) || []).length;
    const totalLetters = (text.match(/[a-zA-Z]/g) || []).length;
    if (totalLetters > 20 && (capsCount / totalLetters) > 0.3) return true;
    
    return false;
}

// POST /api/feedback - Submit feedback
router.post('/', async (req, res) => {
    try {
        const { name, email, message, website } = req.body;
        
        // Anti-spam: Honeypot check
        if (website && website !== '') {
            return res.status(400).json({ success: false, message: 'Spam detected.' });
        }
        
        // Anti-spam: Rate limiting by IP
        const clientIP = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const lastSubmit = rateLimitMap.get(clientIP);
        if (lastSubmit && (now - lastSubmit) < RATE_LIMIT_MS) {
            return res.status(429).json({ success: false, message: 'Please wait before submitting again.' });
        }
        
        // Validation
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ success: false, message: 'Feedback message is required.' });
        }
        
        const trimmedMessage = message.trim();
        
        // Length validation
        if (trimmedMessage.length < 20) {
            return res.status(400).json({ success: false, message: 'Feedback must be at least 20 characters.' });
        }
        if (trimmedMessage.length > 1000) {
            return res.status(400).json({ success: false, message: 'Feedback must be less than 1000 characters.' });
        }
        
        // Anti-spam: Content validation
        if (detectSpam(trimmedMessage)) {
            return res.status(400).json({ success: false, message: 'Your message appears to be spam.' });
        }
        
        // Save feedback (escape HTML for XSS protection)
        const feedback = new Feedback({ 
            name: name ? escapeHtml(name.trim().substring(0, 100)) : undefined, 
            email: email ? email.trim().substring(0, 100) : undefined, 
            message: escapeHtml(trimmedMessage) 
        });
        await feedback.save();
        
        // Update rate limit
        rateLimitMap.set(clientIP, now);
        
        // Clean up old rate limit entries (older than 2 minutes)
        for (const [ip, timestamp] of rateLimitMap.entries()) {
            if (now - timestamp > RATE_LIMIT_MS * 2) {
                rateLimitMap.delete(ip);
            }
        }
        
        res.status(201).json({ success: true, message: 'Feedback submitted successfully.' });
    } catch (err) {
        console.error('Feedback submission error:', err);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

module.exports = router;
