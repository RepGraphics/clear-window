const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authLimiter, emailLimiter } = require('../middleware/rateLimiter');
const { sendVerificationEmail, sendWelcomeEmail } = require('../utils/email');

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', authLimiter, async (req, res, next) => {
    try {
        // Check if signups are enabled
        if (process.env.ENABLE_SIGNUPS !== 'true') {
            return res.status(403).json({
                success: false,
                message: 'Signups are currently disabled'
            });
        }

        const { username, email, password } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide username, email, and password'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: existingUser.email === email 
                    ? 'Email already registered' 
                    : 'Username already taken'
            });
        }

        // Create user
        const user = await User.create({
            username,
            email,
            password
        });

        if (process.env.EMAIL_VERIFICATION_ENABLED === 'false') {
            user.isEmailVerified = true;
            await user.save();
            const token = generateToken(user._id);
            return res.status(201).json({
                success: true,
                message: 'Account created successfully. Email verification is not required.',
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    isEmailVerified: true
                }
            });
        } else {
            // Generate email verification token
            const verificationToken = user.generateEmailVerificationToken();
            await user.save();
            // Send verification email
            await sendVerificationEmail(user, verificationToken);
            // Generate JWT
            const token = generateToken(user._id);
            res.status(201).json({
                success: true,
                message: 'Account created successfully. Please check your email to verify your account.',
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    isEmailVerified: user.isEmailVerified
                }
            });
        }

    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/auth/account
// @desc    Delete current user account
// @access  Private
router.delete('/account', require('../middleware/auth').protect, async (req, res, next) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Optionally anonymize reviews here
        await User.findByIdAndDelete(userId);
        res.json({ success: true, message: 'Account deleted and removed successfully' });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authLimiter, async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Check if user exists and get password
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check account status
        if (user.accountStatus !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Account is suspended or deleted'
            });
        }

        // Check password
        const isPasswordCorrect = await user.comparePassword(password);

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login
        user.lastLogin = Date.now();
        await user.save();

        // Generate JWT
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                isEmailVerified: user.isEmailVerified
            }
        });

    } catch (error) {
        next(error);
    }
});

// @route   GET /api/auth/verify-email/:token
// @desc    Verify email address
// @access  Public
router.get('/verify-email/:token', async (req, res, next) => {
    try {
        const { token } = req.params;

        // Find user with valid token
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification token'
            });
        }

        // Update user
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpire = undefined;
        await user.save();

        // Send welcome email
        await sendWelcomeEmail(user);

        // Redirect to login page with a message to log in again
        res.redirect('/login?verified=1');

    } catch (error) {
        next(error);
    }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email
// @access  Public
router.post('/resend-verification', emailLimiter, async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email address'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email already verified'
            });
        }

        // Generate new token
        const verificationToken = user.generateEmailVerificationToken();
        await user.save();

        // Send verification email
        await sendVerificationEmail(user, verificationToken);

        res.json({
            success: true,
            message: 'Verification email sent successfully'
        });

    } catch (error) {
        next(error);
    }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', require('../middleware/auth').protect, async (req, res, next) => {
    try {
        res.json({
            success: true,
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                role: req.user.role,
                isEmailVerified: req.user.isEmailVerified,
                accountStatus: req.user.accountStatus,
                createdAt: req.user.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/auth/password
// @desc    Update current user's password
// @access  Private
router.put('/password', require('../middleware/auth').protect, async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current and new password required' });
        }
        const user = await User.findById(userId).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }
        user.password = newPassword;
        await user.save();
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/auth/profile
// @desc    Update current user's profile (username, email)
// @access  Private
router.put('/profile', require('../middleware/auth').protect, async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { username, email } = req.body;
        if (!username || !email) {
            return res.status(400).json({ success: false, message: 'Username and email required' });
        }
        // Check for duplicate username/email
        const existingUser = await User.findOne({
            $or: [
                { username, _id: { $ne: userId } },
                { email, _id: { $ne: userId } }
            ]
        });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Username or email already in use' });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        user.username = username;
        user.email = email;
        await user.save();
        res.json({ success: true, message: 'Profile updated successfully', user });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
