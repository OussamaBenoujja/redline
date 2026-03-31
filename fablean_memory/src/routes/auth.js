const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function createAuthToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email, full_name: user.full_name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Missing or invalid authorization token' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.auth = payload;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Token expired or invalid' });
    }
}

// Auth: POST /api/auth/signup
router.post('/auth/signup', async (req, res) => {
    const { email, password, fullName } = req.body || {};

    if (!email || !password || !fullName) {
        return res.status(400).json({ error: 'email, password, and fullName are required' });
    }

    if (String(password).length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(String(email).trim().toLowerCase());
        if (existing) {
            return res.status(409).json({ error: 'Email is already registered' });
        }

        const passwordHash = await bcrypt.hash(String(password), 10);
        const insert = await db.prepare(`
            INSERT INTO users (email, password_hash, full_name, bio, avatar_url, banner_url, followers_count, streak_days, coins, badges)
            VALUES (?, ?, ?, '', '', '', 0, 0, 0, ?)
        `);

        const result = await insert.run(
            String(email).trim().toLowerCase(),
            passwordHash,
            String(fullName).trim(),
            JSON.stringify([])
        );

        const user = await db.prepare('SELECT id, email, full_name, avatar_url FROM users WHERE id = ?').get(result.lastInsertRowid);
        const token = createAuthToken(user);
        return res.json({ token, user });
    } catch (e) {
        console.error('Signup error:', e);
        return res.status(500).json({ error: e.message });
    }
});

// Auth: POST /api/auth/login
router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
    }

    try {
        const user = await db.prepare('SELECT id, email, full_name, avatar_url, password_hash FROM users WHERE email = ?').get(String(email).trim().toLowerCase());
        if (!user?.password_hash) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const valid = await bcrypt.compare(String(password), user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const publicUser = {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
        };
        const token = createAuthToken(publicUser);
        return res.json({ token, user: publicUser });
    } catch (e) {
        console.error('Login error:', e);
        return res.status(500).json({ error: e.message });
    }
});

// Auth: GET /api/auth/me
router.get('/auth/me', requireAuth, async (req, res) => {
    try {
        const user = await db.prepare('SELECT id, email, full_name, avatar_url FROM users WHERE id = ?').get(req.auth.sub);
        if (!user) return res.status(404).json({ error: 'User not found' });
        return res.json({ user });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

module.exports = router;
