/**
 * Auth Routes
 * 
 * Authentication endpoints for signup and login
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { googleDriveOAuth: googleDrive } = require('../storage');
const { DEFAULT_FOLDER_ID } = require('../config/storage.config');

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'itube-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

// Users database file ID (will be created on first signup)
let USERS_FILE_ID = null;
const USERS_FILE_NAME = 'users.json';

/**
 * Get or create users database file
 */
async function getUsersDatabase() {
    try {
        // Search for existing users file
        const files = await googleDrive.searchFiles(USERS_FILE_NAME);
        const usersFile = files.find(f => f.name === USERS_FILE_NAME);

        if (usersFile) {
            USERS_FILE_ID = usersFile.id;
            const buffer = await googleDrive.downloadAsBuffer(usersFile.id);
            return JSON.parse(buffer.toString());
        }

        // Create new users file if doesn't exist
        return { users: [] };
    } catch (error) {
        console.error('Error getting users database:', error);
        return { users: [] };
    }
}

/**
 * Save users database to Google Drive
 */
async function saveUsersDatabase(data) {
    try {
        const buffer = Buffer.from(JSON.stringify(data, null, 2));

        if (USERS_FILE_ID) {
            // Delete old file and create new one (simple update strategy)
            try {
                await googleDrive.deleteFile(USERS_FILE_ID);
            } catch (e) {
                // Ignore delete errors
            }
        }

        const uploaded = await googleDrive.uploadBuffer(
            buffer,
            USERS_FILE_NAME,
            'application/json',
            DEFAULT_FOLDER_ID
        );

        USERS_FILE_ID = uploaded.id;
        return true;
    } catch (error) {
        console.error('Error saving users database:', error);
        throw error;
    }
}

/**
 * Generate JWT token
 */
function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @body    { name, email, password }
 */
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, and password',
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters',
            });
        }

        // Get existing users
        const db = await getUsersDatabase();

        // Check if user exists
        const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists',
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            avatar: name.charAt(0).toUpperCase(),
            createdAt: new Date().toISOString(),
        };

        // Save to database
        db.users.push(newUser);
        await saveUsersDatabase(db);

        // Generate token
        const token = generateToken(newUser);

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: {
                token,
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    avatar: newUser.avatar,
                },
            },
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create account',
            error: error.message,
        });
    }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @body    { email, password }
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password',
            });
        }

        // Get users database
        const db = await getUsersDatabase();

        // Find user
        const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        // Generate token
        const token = generateToken(user);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    avatar: user.avatar,
                },
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to login',
            error: error.message,
        });
    }
});

/**
 * @route   GET /api/auth/verify
 * @desc    Verify JWT token
 * @header  Authorization: Bearer <token>
 */
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided',
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: decoded.id,
                    name: decoded.name,
                    email: decoded.email,
                },
            },
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
        });
    }
});

module.exports = router;
