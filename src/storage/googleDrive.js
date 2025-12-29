/**
 * Google Drive Storage Service
 * 
 * This module provides functions to upload, download, list, and delete files
 * from Google Drive using a service account.
 * 
 * Setup Instructions:
 * 1. Go to Google Cloud Console (https://console.cloud.google.com/)
 * 2. Create a new project or select existing one
 * 3. Enable Google Drive API
 * 4. Create a Service Account (IAM & Admin > Service Accounts)
 * 5. Download the JSON key file
 * 6. Rename it to 'google-credentials.json' and place in backend/src/config/
 * 7. Share your Google Drive folder with the service account email
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const stream = require('stream');

// Path to your credentials file
const CREDENTIALS_PATH = path.join(__dirname, '../config/google-credentials.json');

// Scopes for Google Drive access
const SCOPES = ['https://www.googleapis.com/auth/drive'];

/**
 * Initialize Google Drive client
 */
async function initializeDrive() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: CREDENTIALS_PATH,
            scopes: SCOPES,
        });

        const drive = google.drive({ version: 'v3', auth });
        return drive;
    } catch (error) {
        console.error('Error initializing Google Drive:', error.message);
        throw new Error('Failed to initialize Google Drive. Check your credentials.');
    }
}

/**
 * Upload a file to Google Drive
 * @param {string} filePath - Local path to the file
 * @param {string} fileName - Name for the file in Drive
 * @param {string} mimeType - MIME type of the file
 * @param {string} folderId - Optional folder ID to upload to
 * @returns {Object} - Uploaded file metadata
 */
async function uploadFile(filePath, fileName, mimeType = 'application/octet-stream', folderId = null) {
    const drive = await initializeDrive();

    const fileMetadata = {
        name: fileName,
    };

    // If folder ID provided, upload to that folder
    if (folderId) {
        fileMetadata.parents = [folderId];
    }

    const media = {
        mimeType: mimeType,
        body: fs.createReadStream(filePath),
    };

    try {
        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, mimeType, size, webViewLink, webContentLink, createdTime',
            supportsAllDrives: true,
        });

        console.log('✅ File uploaded successfully:', response.data.name);
        return response.data;
    } catch (error) {
        console.error('❌ Error uploading file:', error.message);
        throw error;
    }
}

/**
 * Upload a buffer/stream to Google Drive
 * @param {Buffer} buffer - File buffer
 * @param {string} fileName - Name for the file
 * @param {string} mimeType - MIME type
 * @param {string} folderId - Optional folder ID
 * @returns {Object} - Uploaded file metadata
 */
async function uploadBuffer(buffer, fileName, mimeType = 'application/octet-stream', folderId = null) {
    const drive = await initializeDrive();

    const fileMetadata = {
        name: fileName,
    };

    if (folderId) {
        fileMetadata.parents = [folderId];
    }

    // Convert buffer to readable stream
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    const media = {
        mimeType: mimeType,
        body: bufferStream,
    };

    try {
        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, mimeType, size, webViewLink, webContentLink, createdTime',
            supportsAllDrives: true,
        });

        console.log('✅ Buffer uploaded successfully:', response.data.name);
        return response.data;
    } catch (error) {
        console.error('❌ Error uploading buffer:', error.message);
        throw error;
    }
}

/**
 * Download a file from Google Drive
 * @param {string} fileId - Google Drive file ID
 * @param {string} destinationPath - Local path to save the file
 * @returns {string} - Path to downloaded file
 */
async function downloadFile(fileId, destinationPath) {
    const drive = await initializeDrive();

    try {
        const response = await drive.files.get(
            { fileId: fileId, alt: 'media' },
            { responseType: 'stream' }
        );

        const dest = fs.createWriteStream(destinationPath);

        return new Promise((resolve, reject) => {
            response.data
                .on('end', () => {
                    console.log('✅ File downloaded successfully:', destinationPath);
                    resolve(destinationPath);
                })
                .on('error', (err) => {
                    console.error('❌ Error downloading file:', err.message);
                    reject(err);
                })
                .pipe(dest);
        });
    } catch (error) {
        console.error('❌ Error downloading file:', error.message);
        throw error;
    }
}

/**
 * Download a file as buffer
 * @param {string} fileId - Google Drive file ID
 * @returns {Buffer} - File content as buffer
 */
async function downloadAsBuffer(fileId) {
    const drive = await initializeDrive();

    try {
        const response = await drive.files.get(
            { fileId: fileId, alt: 'media' },
            { responseType: 'arraybuffer' }
        );

        console.log('✅ File downloaded as buffer');
        return Buffer.from(response.data);
    } catch (error) {
        console.error('❌ Error downloading file as buffer:', error.message);
        throw error;
    }
}

/**
 * List files in Google Drive
 * @param {string} folderId - Optional folder ID to list files from
 * @param {number} pageSize - Number of files to return (default 10)
 * @returns {Array} - List of files
 */
async function listFiles(folderId = null, pageSize = 10) {
    const drive = await initializeDrive();

    let query = "trashed = false";
    if (folderId) {
        query += ` and '${folderId}' in parents`;
    }

    try {
        const response = await drive.files.list({
            pageSize: pageSize,
            q: query,
            fields: 'files(id, name, mimeType, size, webViewLink, webContentLink, createdTime, modifiedTime)',
        });

        console.log(`✅ Found ${response.data.files.length} files`);
        return response.data.files;
    } catch (error) {
        console.error('❌ Error listing files:', error.message);
        throw error;
    }
}

/**
 * Get file metadata
 * @param {string} fileId - Google Drive file ID
 * @returns {Object} - File metadata
 */
async function getFileMetadata(fileId) {
    const drive = await initializeDrive();

    try {
        const response = await drive.files.get({
            fileId: fileId,
            fields: 'id, name, mimeType, size, webViewLink, webContentLink, createdTime, modifiedTime',
        });

        return response.data;
    } catch (error) {
        console.error('❌ Error getting file metadata:', error.message);
        throw error;
    }
}

/**
 * Delete a file from Google Drive
 * @param {string} fileId - Google Drive file ID
 * @returns {boolean} - Success status
 */
async function deleteFile(fileId) {
    const drive = await initializeDrive();

    try {
        await drive.files.delete({
            fileId: fileId,
        });

        console.log('✅ File deleted successfully');
        return true;
    } catch (error) {
        console.error('❌ Error deleting file:', error.message);
        throw error;
    }
}

/**
 * Create a folder in Google Drive
 * @param {string} folderName - Name of the folder
 * @param {string} parentFolderId - Optional parent folder ID
 * @returns {Object} - Created folder metadata
 */
async function createFolder(folderName, parentFolderId = null) {
    const drive = await initializeDrive();

    const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
    }

    try {
        const response = await drive.files.create({
            requestBody: fileMetadata,
            fields: 'id, name, webViewLink',
        });

        console.log('✅ Folder created:', response.data.name);
        return response.data;
    } catch (error) {
        console.error('❌ Error creating folder:', error.message);
        throw error;
    }
}

/**
 * Make a file publicly accessible
 * @param {string} fileId - Google Drive file ID
 * @returns {string} - Public URL
 */
async function makePublic(fileId) {
    const drive = await initializeDrive();

    try {
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        const file = await getFileMetadata(fileId);
        console.log('✅ File is now public');
        return file.webViewLink;
    } catch (error) {
        console.error('❌ Error making file public:', error.message);
        throw error;
    }
}

/**
 * Search files by name
 * @param {string} searchQuery - Search term
 * @returns {Array} - Matching files
 */
async function searchFiles(searchQuery) {
    const drive = await initializeDrive();

    try {
        const response = await drive.files.list({
            q: `name contains '${searchQuery}' and trashed = false`,
            fields: 'files(id, name, mimeType, size, webViewLink, createdTime)',
        });

        console.log(`✅ Found ${response.data.files.length} matching files`);
        return response.data.files;
    } catch (error) {
        console.error('❌ Error searching files:', error.message);
        throw error;
    }
}

// Export all functions
module.exports = {
    initializeDrive,
    uploadFile,
    uploadBuffer,
    downloadFile,
    downloadAsBuffer,
    listFiles,
    getFileMetadata,
    deleteFile,
    createFolder,
    makePublic,
    searchFiles,
};
