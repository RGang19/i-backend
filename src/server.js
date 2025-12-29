/**
 * Express Server
 * 
 * Main entry point for the backend API
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import routes
const uploadRoutes = require('./routes/uploadRoutes');
const authRoutes = require('./routes/authRoutes');
const statsRoutes = require('./routes/statsRoutes');

// Initialize express app
const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================

// Enable CORS for all origins (customize for production)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// ==========================================
// ROUTES
// ==========================================

// Health check route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🚀 API is running!',
        version: '1.0.0',
        endpoints: {
            upload: 'POST /api/upload',
            uploadMultiple: 'POST /api/upload/multiple',
            files: 'GET /api/files',
            search: 'GET /api/files/search?q=term',
            fileById: 'GET /api/files/:fileId',
            download: 'GET /api/files/:fileId/download',
            delete: 'DELETE /api/files/:fileId',
            makePublic: 'POST /api/files/:fileId/public',
            createFolder: 'POST /api/folders',
            signup: 'POST /api/auth/signup',
            login: 'POST /api/auth/login',
            verify: 'GET /api/auth/verify',
        },
    });
});

// API routes
app.use('/api', uploadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', statsRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);

    // Handle multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 50MB.',
        });
    }

    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║   🚀 Server running on port ${PORT}          ║
║   📁 Google Drive Storage Ready           ║
║                                           ║
║   http://localhost:${PORT}                   ║
║                                           ║
╚═══════════════════════════════════════════╝
  `);
});

module.exports = app;
