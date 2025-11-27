const express = require('express');
const router = express.Router();
const Review = require('../models/Review');

// GET /api/stats - Public stats endpoint
router.get('/', async (req, res) => {
  try {
    // Only count published reviews
    const publishedCount = await Review.countDocuments({ status: 'published' });
    // Calculate average rating for published reviews
    const publishedReviews = await Review.find({ status: 'published', rating: { $exists: true } }, 'rating');
    let averageRating = 0;
    if (publishedReviews.length > 0) {
      const total = publishedReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
      averageRating = total / publishedReviews.length;
    }
    res.json({
      reviews: { published: publishedCount },
      ratings: { average: averageRating }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
