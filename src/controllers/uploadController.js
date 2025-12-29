/**
 * Upload Controller
 * 
 * Handles file upload operations with Google Drive
 */

const { googleDriveOAuth: googleDrive } = require('../storage');
const { DEFAULT_FOLDER_ID } = require('../config/storage.config');

/**
 * Upload a single file to Google Drive
 * POST /api/upload
 */
const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded',
            });
        }

        const { originalname, mimetype, buffer } = req.file;
        // Use provided folderId or default to MyAppStorage folder
        const folderId = req.body.folderId || DEFAULT_FOLDER_ID;

        // Upload to Google Drive
        const uploadedFile = await googleDrive.uploadBuffer(
            buffer,
            originalname,
            mimetype,
            folderId
        );

        // Make it public (optional - based on query param)
        let publicUrl = null;
        if (req.query.makePublic === 'true') {
            publicUrl = await googleDrive.makePublic(uploadedFile.id);
        }

        res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                id: uploadedFile.id,
                name: uploadedFile.name,
                mimeType: uploadedFile.mimeType,
                size: uploadedFile.size,
                webViewLink: uploadedFile.webViewLink,
                publicUrl: publicUrl,
            },
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload file',
            error: error.message,
        });
    }
};

/**
 * Upload multiple files to Google Drive
 * POST /api/upload/multiple
 */
const uploadMultiple = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded',
            });
        }

        const folderId = req.body.folderId || DEFAULT_FOLDER_ID;
        const uploadedFiles = [];

        for (const file of req.files) {
            const uploadedFile = await googleDrive.uploadBuffer(
                file.buffer,
                file.originalname,
                file.mimetype,
                folderId
            );
            uploadedFiles.push({
                id: uploadedFile.id,
                name: uploadedFile.name,
                mimeType: uploadedFile.mimeType,
                size: uploadedFile.size,
                webViewLink: uploadedFile.webViewLink,
            });
        }

        res.status(200).json({
            success: true,
            message: `${uploadedFiles.length} files uploaded successfully`,
            data: uploadedFiles,
        });
    } catch (error) {
        console.error('Multiple upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload files',
            error: error.message,
        });
    }
};

/**
 * Get all files from Google Drive
 * GET /api/files
 */
const getFiles = async (req, res) => {
    try {
        const folderId = req.query.folderId || null;
        const limit = parseInt(req.query.limit) || 20;

        const files = await googleDrive.listFiles(folderId, limit);

        res.status(200).json({
            success: true,
            count: files.length,
            data: files,
        });
    } catch (error) {
        console.error('List files error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list files',
            error: error.message,
        });
    }
};

/**
 * Get single file metadata
 * GET /api/files/:fileId
 */
const getFile = async (req, res) => {
    try {
        const { fileId } = req.params;

        const file = await googleDrive.getFileMetadata(fileId);

        res.status(200).json({
            success: true,
            data: file,
        });
    } catch (error) {
        console.error('Get file error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get file',
            error: error.message,
        });
    }
};

/**
 * Download a file from Google Drive
 * GET /api/files/:fileId/download
 */
const downloadFile = async (req, res) => {
    try {
        const { fileId } = req.params;

        // Get file metadata first
        const metadata = await googleDrive.getFileMetadata(fileId);

        // Download as buffer
        const buffer = await googleDrive.downloadAsBuffer(fileId);

        // Set headers for download
        res.setHeader('Content-Type', metadata.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${metadata.name}"`);
        res.setHeader('Content-Length', buffer.length);

        res.send(buffer);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download file',
            error: error.message,
        });
    }
};

/**
 * Delete a file from Google Drive
 * DELETE /api/files/:fileId
 */
const deleteFile = async (req, res) => {
    try {
        const { fileId } = req.params;

        await googleDrive.deleteFile(fileId);

        res.status(200).json({
            success: true,
            message: 'File deleted successfully',
        });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete file',
            error: error.message,
        });
    }
};

/**
 * Create a folder in Google Drive
 * POST /api/folders
 */
const createFolder = async (req, res) => {
    try {
        const { folderName, parentFolderId } = req.body;

        if (!folderName) {
            return res.status(400).json({
                success: false,
                message: 'Folder name is required',
            });
        }

        const folder = await googleDrive.createFolder(folderName, parentFolderId);

        res.status(201).json({
            success: true,
            message: 'Folder created successfully',
            data: folder,
        });
    } catch (error) {
        console.error('Create folder error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create folder',
            error: error.message,
        });
    }
};

/**
 * Search files by name
 * GET /api/files/search?q=searchterm
 */
const searchFiles = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required',
            });
        }

        const files = await googleDrive.searchFiles(q);

        res.status(200).json({
            success: true,
            count: files.length,
            data: files,
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search files',
            error: error.message,
        });
    }
};

/**
 * Make a file public
 * POST /api/files/:fileId/public
 */
const makeFilePublic = async (req, res) => {
    try {
        const { fileId } = req.params;

        const publicUrl = await googleDrive.makePublic(fileId);

        res.status(200).json({
            success: true,
            message: 'File is now public',
            data: {
                publicUrl,
            },
        });
    } catch (error) {
        console.error('Make public error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to make file public',
            error: error.message,
        });
    }
};

module.exports = {
    uploadFile,
    uploadMultiple,
    getFiles,
    getFile,
    downloadFile,
    deleteFile,
    createFolder,
    searchFiles,
    makeFilePublic,
};
