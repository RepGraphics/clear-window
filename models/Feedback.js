const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    name: { type: String, required: false },
    email: { type: String, required: false },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
