/**
 * Storage Configuration
 * 
 * Configure default settings for file storage
 */

module.exports = {
    // Default Google Drive folder ID for all uploads
    // This is the "MyAppStorage" folder in your Google Drive
    DEFAULT_FOLDER_ID: '1qBOdBEk60VTBpHfEGNX3BeLNFrnfF9ur',

    // Maximum file size (200MB)
    MAX_FILE_SIZE: 200 * 1024 * 1024,

    // Allowed file types (empty = all types allowed)
    ALLOWED_MIME_TYPES: [],
};
