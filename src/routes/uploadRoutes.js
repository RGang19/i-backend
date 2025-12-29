/**
 * Upload Routes
 * 
 * API routes for file upload and management
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();

const {
    uploadFile,
    uploadMultiple,
    getFiles,
    getFile,
    downloadFile,
    deleteFile,
    createFolder,
    searchFiles,
    makeFilePublic,
} = require('../controllers/uploadController');

// Configure multer for memory storage (files stored in buffer)
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 200 * 1024 * 1024, // 200MB max file size
    },
    fileFilter: (req, file, cb) => {
        // Allow all file types (customize as needed)
        cb(null, true);
    },
});

// ==========================================
// UPLOAD ROUTES
// ==========================================

/**
 * @route   POST /api/upload
 * @desc    Upload a single file
 * @access  Public
 * @body    file (form-data), folderId (optional)
 * @query   makePublic=true (optional)
 */
router.post('/upload', upload.single('file'), uploadFile);

/**
 * @route   POST /api/upload/multiple
 * @desc    Upload multiple files (max 10)
 * @access  Public
 * @body    files (form-data), folderId (optional)
 */
router.post('/upload/multiple', upload.array('files', 10), uploadMultiple);

// ==========================================
// FILE ROUTES
// ==========================================

/**
 * @route   GET /api/files
 * @desc    Get all files
 * @access  Public
 * @query   folderId (optional), limit (optional, default 20)
 */
router.get('/files', getFiles);

/**
 * @route   GET /api/files/search
 * @desc    Search files by name
 * @access  Public
 * @query   q (required) - search term
 */
router.get('/files/search', searchFiles);

/**
 * @route   GET /api/files/:fileId
 * @desc    Get single file metadata
 * @access  Public
 */
router.get('/files/:fileId', getFile);

/**
 * @route   GET /api/files/:fileId/download
 * @desc    Download a file
 * @access  Public
 */
router.get('/files/:fileId/download', downloadFile);

/**
 * @route   DELETE /api/files/:fileId
 * @desc    Delete a file
 * @access  Public
 */
router.delete('/files/:fileId', deleteFile);

/**
 * @route   POST /api/files/:fileId/public
 * @desc    Make a file publicly accessible
 * @access  Public
 */
router.post('/files/:fileId/public', makeFilePublic);

// ==========================================
// FOLDER ROUTES
// ==========================================

/**
 * @route   POST /api/folders
 * @desc    Create a new folder
 * @access  Public
 * @body    folderName (required), parentFolderId (optional)
 */
router.post('/folders', createFolder);

module.exports = router;
