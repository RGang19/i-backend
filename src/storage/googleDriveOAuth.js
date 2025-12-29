/**
 * Google Drive Storage Service (OAuth2 Version)
 * 
 * This version uses OAuth2 for personal Google accounts.
 * It stores the access token after first authorization.
 * 
 * Setup Instructions:
 * 1. Go to Google Cloud Console (https://console.cloud.google.com/)
 * 2. Enable Google Drive API
 * 3. Create OAuth 2.0 Client ID (Desktop app type)
 * 4. Download credentials and save as 'oauth-credentials.json' in config folder
 * 5. Run the authorization flow once to generate tokens
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const stream = require('stream');

// Paths (for local development)
const CREDENTIALS_PATH = path.join(__dirname, '../config/oauth-credentials.json');
const TOKEN_PATH = path.join(__dirname, '../config/oauth-token.json');

// Scopes for Google Drive access
const SCOPES = ['https://www.googleapis.com/auth/drive'];

// Default folder ID for uploads (set after first authorization)
let DEFAULT_FOLDER_ID = null;

/**
 * Get credentials from environment variable or file
 */
function getCredentials() {
    // First try environment variable (for Render/cloud deployment)
    if (process.env.GOOGLE_OAUTH_CREDENTIALS) {
        try {
            return JSON.parse(process.env.GOOGLE_OAUTH_CREDENTIALS);
        } catch (e) {
            console.error('Failed to parse GOOGLE_OAUTH_CREDENTIALS env var');
        }
    }

    // Fall back to file (for local development)
    if (fs.existsSync(CREDENTIALS_PATH)) {
        return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    }

    throw new Error(
        'OAuth credentials not found. Set GOOGLE_OAUTH_CREDENTIALS env var or save oauth-credentials.json'
    );
}

/**
 * Get token from environment variable or file
 */
function getToken() {
    // First try environment variable (for Render/cloud deployment)
    if (process.env.GOOGLE_OAUTH_TOKEN) {
        try {
            return JSON.parse(process.env.GOOGLE_OAUTH_TOKEN);
        } catch (e) {
            console.error('Failed to parse GOOGLE_OAUTH_TOKEN env var');
        }
    }

    // Fall back to file (for local development)
    if (fs.existsSync(TOKEN_PATH)) {
        return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    }

    return null;
}

/**
 * Save token to file (only works locally)
 */
function saveToken(token) {
    // Only save to file if not using env vars
    if (!process.env.GOOGLE_OAUTH_TOKEN) {
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
    }
}

/**
 * Load or request authorization
 */
async function authorize() {
    const credentials = getCredentials();
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check if we have a saved token
    const token = getToken();
    if (token) {
        oAuth2Client.setCredentials(token);

        // Check if token is expired and refresh if needed
        if (token.expiry_date && token.expiry_date < Date.now()) {
            try {
                const { credentials: newCredentials } = await oAuth2Client.refreshAccessToken();
                oAuth2Client.setCredentials(newCredentials);
                saveToken(newCredentials);
                console.log('✅ Token refreshed');
            } catch (error) {
                console.log('Token refresh failed, need re-authorization');
                return await getNewToken(oAuth2Client);
            }
        }

        return oAuth2Client;
    }

    // No token, need to get new authorization
    return await getNewToken(oAuth2Client);
}

/**
 * Get and store new token after prompting for user authorization
 */
async function getNewToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║              GOOGLE DRIVE AUTHORIZATION REQUIRED              ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  1. Open this URL in your browser:                           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    console.log(authUrl);
    console.log('\n  2. Sign in and authorize the app');
    console.log('  3. Copy the authorization code and paste below:\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve, reject) => {
        rl.question('Enter authorization code: ', async (code) => {
            rl.close();
            try {
                const { tokens } = await oAuth2Client.getToken(code);
                oAuth2Client.setCredentials(tokens);
                saveToken(tokens);
                console.log('\n✅ Authorization successful! Token saved.');
                resolve(oAuth2Client);
            } catch (error) {
                reject(new Error('Error getting token: ' + error.message));
            }
        });
    });
}

/**
 * Initialize Google Drive client
 */
async function initializeDrive() {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth });
    return drive;
}

/**
 * Set default folder for uploads
 */
function setDefaultFolder(folderId) {
    DEFAULT_FOLDER_ID = folderId;
    console.log('✅ Default folder set:', folderId);
}

/**
 * Upload a file to Google Drive
 */
async function uploadFile(filePath, fileName, mimeType = 'application/octet-stream', folderId = null) {
    const drive = await initializeDrive();

    const fileMetadata = {
        name: fileName,
    };

    const targetFolder = folderId || DEFAULT_FOLDER_ID;
    if (targetFolder) {
        fileMetadata.parents = [targetFolder];
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
 */
async function uploadBuffer(buffer, fileName, mimeType = 'application/octet-stream', folderId = null) {
    const drive = await initializeDrive();

    const fileMetadata = {
        name: fileName,
    };

    const targetFolder = folderId || DEFAULT_FOLDER_ID;
    if (targetFolder) {
        fileMetadata.parents = [targetFolder];
    }

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
 */
async function listFiles(folderId = null, pageSize = 10) {
    const drive = await initializeDrive();

    let query = "trashed = false";
    const targetFolder = folderId || DEFAULT_FOLDER_ID;
    if (targetFolder) {
        query += ` and '${targetFolder}' in parents`;
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
 */
async function createFolder(folderName, parentFolderId = null) {
    const drive = await initializeDrive();

    const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
    };

    const targetFolder = parentFolderId || DEFAULT_FOLDER_ID;
    if (targetFolder) {
        fileMetadata.parents = [targetFolder];
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

/**
 * Check if authorized
 */
function isAuthorized() {
    return fs.existsSync(TOKEN_PATH);
}

/**
 * Get authorization URL for web flow
 */
function getAuthUrl() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error('OAuth credentials not found');
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    return oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
}

/**
 * Complete authorization with code (for web flow)
 */
async function authorizeWithCode(code) {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error('OAuth credentials not found');
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    console.log('✅ Authorization successful!');
    return true;
}

module.exports = {
    initializeDrive,
    authorize,
    isAuthorized,
    getAuthUrl,
    authorizeWithCode,
    setDefaultFolder,
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
