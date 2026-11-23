const { Router } = require('express');
const authRoutes = require('./auth.routes');
const documentRoutes = require('./document.routes');
const { sendSuccess } = require('../utils/response');

const router = Router();

router.get('/health', (req, res) => sendSuccess(res, { data: { ok: true }, message: 'API is healthy' }));
router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);

module.exports = router;
