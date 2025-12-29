/**
 * Stats Routes
 * 
 * Endpoints for video statistics (views, likes, comments)
 * Data is stored in Google Drive as JSON files
 */

const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const path = require('path');

// Path to credentials file
const CREDENTIALS_PATH = path.join(__dirname, '../config/google-credentials.json');

// Initialize Google Drive
async function getDrive() {
    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/drive'],
    });
    return google.drive({ version: 'v3', auth });
}

// Stats folder ID (we'll use MyAppStorage)
const STATS_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1qBOdBEk60VTBpHfEGNX3BeLNFrnfF9ur';
const STATS_FILE_NAME = 'video_stats.json';

// Helper: Get or create stats file
async function getStatsFile() {
    try {
        const drive = await getDrive();

        // Search for existing stats file
        const response = await drive.files.list({
            q: `name='${STATS_FILE_NAME}' and '${STATS_FOLDER_ID}' in parents and trashed=false`,
            fields: 'files(id, name)',
        });

        if (response.data.files.length > 0) {
            // File exists, get its content
            const fileId = response.data.files[0].id;
            const content = await drive.files.get({
                fileId,
                alt: 'media',
            });
            return { fileId, data: content.data, drive };
        }

        // Create new stats file
        const fileMetadata = {
            name: STATS_FILE_NAME,
            parents: [STATS_FOLDER_ID],
            mimeType: 'application/json',
        };

        const media = {
            mimeType: 'application/json',
            body: JSON.stringify({ videos: {}, subscribers: {} }),
        };

        const file = await drive.files.create({
            resource: fileMetadata,
            media,
            fields: 'id',
        });

        return { fileId: file.data.id, data: { videos: {}, subscribers: {} }, drive };
    } catch (error) {
        console.error('Error getting stats file:', error);
        throw error;
    }
}

// Helper: Update stats file
async function updateStatsFile(drive, fileId, data) {
    try {
        await drive.files.update({
            fileId,
            media: {
                mimeType: 'application/json',
                body: JSON.stringify(data),
            },
        });
    } catch (error) {
        console.error('Error updating stats file:', error);
        throw error;
    }
}

// GET /api/stats/:videoId - Get stats for a video
router.get('/stats/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { fileId, data } = await getStatsFile();

        const videoStats = data.videos?.[videoId] || {
            views: 0,
            likes: 0,
            dislikes: 0,
            comments: [],
        };

        res.json({
            success: true,
            data: videoStats,
        });
    } catch (error) {
        console.error('Error getting video stats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/stats/:videoId/view - Increment view count
router.post('/stats/:videoId/view', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { fileId, data, drive } = await getStatsFile();

        if (!data.videos) data.videos = {};
        if (!data.videos[videoId]) {
            data.videos[videoId] = { views: 0, likes: 0, dislikes: 0, comments: [] };
        }

        data.videos[videoId].views += 1;
        await updateStatsFile(drive, fileId, data);

        res.json({
            success: true,
            data: { views: data.videos[videoId].views },
        });
    } catch (error) {
        console.error('Error updating views:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/stats/:videoId/like - Toggle like
router.post('/stats/:videoId/like', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { userId, action } = req.body; // action: 'add' or 'remove'
        const { fileId, data, drive } = await getStatsFile();

        if (!data.videos) data.videos = {};
        if (!data.videos[videoId]) {
            data.videos[videoId] = { views: 0, likes: 0, dislikes: 0, comments: [], likedBy: [], dislikedBy: [] };
        }

        const video = data.videos[videoId];
        if (!video.likedBy) video.likedBy = [];
        if (!video.dislikedBy) video.dislikedBy = [];

        if (action === 'add') {
            if (!video.likedBy.includes(userId)) {
                video.likedBy.push(userId);
                video.likes = video.likedBy.length;
                // Remove from dislikes if exists
                video.dislikedBy = video.dislikedBy.filter(id => id !== userId);
                video.dislikes = video.dislikedBy.length;
            }
        } else {
            video.likedBy = video.likedBy.filter(id => id !== userId);
            video.likes = video.likedBy.length;
        }

        await updateStatsFile(drive, fileId, data);

        res.json({
            success: true,
            data: { likes: video.likes, dislikes: video.dislikes },
        });
    } catch (error) {
        console.error('Error updating likes:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/stats/:videoId/dislike - Toggle dislike
router.post('/stats/:videoId/dislike', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { userId, action } = req.body;
        const { fileId, data, drive } = await getStatsFile();

        if (!data.videos) data.videos = {};
        if (!data.videos[videoId]) {
            data.videos[videoId] = { views: 0, likes: 0, dislikes: 0, comments: [], likedBy: [], dislikedBy: [] };
        }

        const video = data.videos[videoId];
        if (!video.likedBy) video.likedBy = [];
        if (!video.dislikedBy) video.dislikedBy = [];

        if (action === 'add') {
            if (!video.dislikedBy.includes(userId)) {
                video.dislikedBy.push(userId);
                video.dislikes = video.dislikedBy.length;
                // Remove from likes if exists
                video.likedBy = video.likedBy.filter(id => id !== userId);
                video.likes = video.likedBy.length;
            }
        } else {
            video.dislikedBy = video.dislikedBy.filter(id => id !== userId);
            video.dislikes = video.dislikedBy.length;
        }

        await updateStatsFile(drive, fileId, data);

        res.json({
            success: true,
            data: { likes: video.likes, dislikes: video.dislikes },
        });
    } catch (error) {
        console.error('Error updating dislikes:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/stats/:videoId/comment - Add comment
router.post('/stats/:videoId/comment', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { userId, userName, text, avatar } = req.body;
        const { fileId, data, drive } = await getStatsFile();

        if (!data.videos) data.videos = {};
        if (!data.videos[videoId]) {
            data.videos[videoId] = { views: 0, likes: 0, dislikes: 0, comments: [] };
        }

        const comment = {
            id: Date.now().toString(),
            userId,
            userName: userName || 'Anonymous',
            avatar: avatar || '👤',
            text,
            timestamp: new Date().toISOString(),
            likes: 0,
        };

        data.videos[videoId].comments.unshift(comment);
        await updateStatsFile(drive, fileId, data);

        res.json({
            success: true,
            data: comment,
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /api/stats/:videoId/comment/:commentId - Delete comment
router.delete('/stats/:videoId/comment/:commentId', async (req, res) => {
    try {
        const { videoId, commentId } = req.params;
        const { fileId, data, drive } = await getStatsFile();

        if (data.videos?.[videoId]?.comments) {
            data.videos[videoId].comments = data.videos[videoId].comments.filter(
                c => c.id !== commentId
            );
            await updateStatsFile(drive, fileId, data);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/stats/all - Get all video stats (for batch loading)
router.get('/stats', async (req, res) => {
    try {
        const { fileId, data } = await getStatsFile();

        res.json({
            success: true,
            data: data.videos || {},
        });
    } catch (error) {
        console.error('Error getting all stats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
