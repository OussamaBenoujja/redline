const express = require('express');

const authRoutes = require('./routes/auth');
const mediaRoutes = require('./routes/media');
const chaptersRoutes = require('./routes/chapters');
const novelsRoutes = require('./routes/novels');
const usersRoutes = require('./routes/users');
const authorRoutes = require('./routes/author');
const aiRoutes = require('./routes/ai');

const router = express.Router();

router.use(authRoutes);
router.use(mediaRoutes);
router.use(chaptersRoutes);
router.use(novelsRoutes);
router.use(usersRoutes);
router.use(authorRoutes);
router.use(aiRoutes);

module.exports = router;
