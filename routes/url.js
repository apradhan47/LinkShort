
const express = require('express');
const { createURLLimiter } = require('../middlewares/rateLimiter');

const {
    handleGenerateNewShortURL,
    handleGetAnalytics,
    handleDeleteURL,
    handleGenerateQRCode,
    handleEditURL,
    handleEditExpiration,
    handleToggleURLStatus
} = require('../controllers/url');

const router = express.Router();

router.post('/', createURLLimiter, handleGenerateNewShortURL);

router.get('/analytics/:shortId', handleGetAnalytics);

router.post('/edit/:shortId', handleEditURL);

// Edit link expiration
router.post('/edit-expiration/:shortId', handleEditExpiration);

router.post('/delete/:shortId', handleDeleteURL);

// Activate / Deactivate link
router.post('/toggle/:shortId', handleToggleURLStatus);

// QR Code generation
router.get('/qrcode/:shortId', handleGenerateQRCode);

module.exports = router;
