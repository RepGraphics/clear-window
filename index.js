const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const reviewRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');
const statsRoutes = require('./routes/stats');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 5000;

// Set up EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✓ MongoDB connected successfully'))
.catch((err) => {
    console.error('✗ MongoDB connection error:', err);
    process.exit(1);
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for frontend
    crossOriginEmbedderPolicy: false
}));
app.use(cors({
    origin: process.env.APP_URL || 'http://localhost:5000',
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimiter);

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);

// Clean URL routing for pages
app.get('/login', (req, res) => {
    res.render('pages/login');
});

app.get('/signup', (req, res) => {
    res.render('pages/signup');
});

app.get('/reviews', (req, res) => {
    res.render('pages/reviews');
});

app.get('/submit-review', (req, res) => {
    res.render('pages/submit-review');
});

app.get('/account', (req, res) => {
    res.render('pages/account');
});

app.get('/admin', (req, res) => {
    res.render('pages/admin');
});

app.get('/privacy-policy', (req, res) => {
    res.render('pages/privacy-policy');
});

app.get('/terms-of-service', (req, res) => {
    res.render('pages/terms-of-service');
});

app.get('/cookie-policy', (req, res) => {
    res.render('pages/cookie-policy');
});

app.get('/gdpr', (req, res) => {
    res.render('pages/gdpr');
});

// Serve index.html for root and catch-all
app.get('/', (req, res) => {
    // Fetch public stats for homepage
    const axios = require('axios');
    const apiUrl = process.env.APP_URL ? `${process.env.APP_URL}/api/stats` : `http://localhost:${PORT}/api/stats`;
    axios.get(apiUrl)
        .then(response => {
            // The stats endpoint returns the stats object directly
            const stats = response.data || {};
            res.render('pages/index', { stats });
        })
        .catch(err => {
            // Fallback: render with empty stats
            res.render('pages/index', { stats: {} });
        });
});

app.get('*', (req, res) => {
    // Don't serve index.html for API routes or uploads
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return res.status(404).json({
            success: false,
            message: 'Route not found'
        });
    }
    // Always provide stats to index.ejs
    const axios = require('axios');
    const apiUrl = process.env.APP_URL ? `${process.env.APP_URL}/api/stats` : `http://localhost:${PORT}/api/stats`;
    axios.get(apiUrl)
        .then(response => {
            const stats = response.data || {};
            res.render('pages/index', { stats });
        })
        .catch(err => {
            res.render('pages/index', { stats: {} });
        });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ Frontend: http://localhost:${PORT}`);
    console.log(`✓ API available at: http://localhost:${PORT}/api`);
    console.log(`✓ Signups enabled: ${process.env.ENABLE_SIGNUPS === 'true'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    mongoose.connection.close();
    process.exit(0);
});
