const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Review = require('../models/Review');
const { protect, requireEmailVerification } = require('../middleware/auth');
const { sendReviewVerificationNotification } = require('../utils/email');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || './uploads';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'verification-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only .png, .jpg, .jpeg, and .pdf files are allowed'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
    },
    fileFilter: fileFilter
});

// @route   POST /api/reviews
// @desc    Submit a new review
// @access  Private (email verified)
router.post('/', protect, requireEmailVerification, upload.array('documents', 5), async (req, res, next) => {
    try {
        const {
            propertyName,
            propertyAddress,
            landlordName,
            rating,
            reviewTitle,
            reviewContent
        } = req.body;

        // Validate required fields (address is now optional)
        if (!propertyName || !rating || !reviewTitle || !reviewContent) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields except address'
            });
        }

        // If address is blank, redact it
        let safeAddress = propertyAddress && propertyAddress.trim() ? propertyAddress.trim() : 'Redacted for privacy/protection';

        // Process uploaded files
        const verificationDocuments = req.files ? req.files.map(file => ({
            filename: file.filename,
            path: file.path,
            uploadedAt: Date.now()
        })) : [];

        // Create review
        const review = await Review.create({
            userId: req.user._id,
            propertyName,
            propertyAddress: safeAddress,
            landlordName,
            rating: parseFloat(rating),
            reviewTitle,
            reviewContent,
            verificationDocuments,
            status: 'pending_verification',
            metadata: {
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                submittedAt: Date.now()
            }
        });

        // Send notification email
        await sendReviewVerificationNotification(req.user, review);

        res.status(201).json({
            success: true,
            message: 'Review submitted successfully and is pending verification',
            review: {
                id: review._id,
                propertyName: review.propertyName,
                rating: review.rating,
                status: review.status,
                createdAt: review.createdAt
            }
        });

    } catch (error) {
        // Clean up uploaded files if review creation fails
        if (req.files) {
            req.files.forEach(file => {
                fs.unlink(file.path, err => {
                    if (err) console.error('Error deleting file:', err);
                });
            });
        }
        next(error);
    }
});

// @route   GET /api/reviews/my-reviews
// @desc    Get current user's reviews
// @access  Private
router.get('/my-reviews', protect, async (req, res, next) => {
    try {
        const reviews = await Review.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .select('-verificationDocuments -metadata');

        res.json({
            success: true,
            count: reviews.length,
            reviews
        });

    } catch (error) {
        next(error);
    }
});

// @route   GET /api/reviews/published
// @desc    Get all published reviews (anonymized)
// @access  Public
router.get('/published', async (req, res, next) => {
    try {
        const { propertyAddress, page = 1, limit = 10 } = req.query;

        const query = {
            status: 'published',
            isAnonymized: true
        };

        if (propertyAddress) {
            query.propertyAddress = { $regex: propertyAddress, $options: 'i' };
        }

        const reviews = await Review.find(query)
            .select('-userId -verificationDocuments -metadata -adminNotes')
            .sort({ publishedAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Review.countDocuments(query);

        res.json({
            success: true,
            reviews,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });

    } catch (error) {
        next(error);
    }
});

// @route   GET /api/reviews/:id
// @desc    Get single review
// @access  Public (anonymized) / Private (own reviews)
router.get('/:id', async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // If review is published and anonymized, show to everyone
        if (review.status === 'published' && review.isAnonymized) {
            return res.json({
                success: true,
                review: {
                    id: review._id,
                    propertyName: review.propertyName,
                    propertyAddress: review.propertyAddress,
                    landlordName: review.landlordName,
                    rating: review.rating,
                    reviewTitle: review.reviewTitle,
                    reviewContent: review.reviewContent,
                    publishedAt: review.publishedAt,
                    weightingScore: review.weightingScore
                }
            });
        }

        // Otherwise, require authentication
        return res.status(403).json({
            success: false,
            message: 'This review is not publicly available'
        });

    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/reviews/:id
// @desc    Delete own review (before anonymization)
// @access  Private
router.delete('/:id', protect, async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Allow owner or admin to delete
        if (review.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this review'
            });
        }

        // Only block regular users from deleting anonymized reviews
        if (review.isAnonymized && req.user.role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete anonymized reviews'
            });
        }

        // Delete verification documents
        if (review.verificationDocuments && review.verificationDocuments.length > 0) {
            review.verificationDocuments.forEach(doc => {
                fs.unlink(doc.path, err => {
                    if (err) console.error('Error deleting file:', err);
                });
            });
        }

        await review.deleteOne();

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
