/**
 * Storage Module Index
 * 
 * Central export for all storage services
 */

const googleDrive = require('./googleDrive');
const googleDriveOAuth = require('./googleDriveOAuth');

module.exports = {
    googleDrive,           // Service Account version (for Google Workspace)
    googleDriveOAuth,      // OAuth2 version (for personal accounts)
};
