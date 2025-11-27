const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    propertyName: {
        type: String,
        required: [true, 'Property name is required'],
        trim: true
    },
    propertyAddress: {
        type: String,
        required: [true, 'Property address is required'],
        trim: true
    },
    landlordName: {
        type: String,
        trim: true
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: 1,
        max: 5
    },
    reviewTitle: {
        type: String,
        required: [true, 'Review title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    reviewContent: {
        type: String,
        required: [true, 'Review content is required'],
        trim: true,
        minlength: [50, 'Review must be at least 50 characters'],
        maxlength: [5000, 'Review cannot exceed 5000 characters']
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    verificationDocuments: [{
        filename: String,
        path: String,
        uploadedAt: Date
    }],
    isAnonymized: {
        type: Boolean,
        default: false
    },
    anonymizationDate: Date,
    status: {
        type: String,
        enum: ['draft', 'pending_verification', 'published', 'flagged', 'removed'],
        default: 'draft'
    },
    flagCount: {
        type: Number,
        default: 0
    },
    adminNotes: String,
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: Date,
    publishedAt: Date,
    weightingScore: {
        type: Number,
        default: 1.0,
        min: 0,
        max: 2
    },
    metadata: {
        ipAddress: String,
        userAgent: String,
        submittedAt: Date
    }
}, {
    timestamps: true
});

// Index for efficient queries
reviewSchema.index({ propertyAddress: 1 });
reviewSchema.index({ verificationStatus: 1 });
reviewSchema.index({ status: 1 });
reviewSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
