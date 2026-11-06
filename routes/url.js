
const express = require('express');

const {
    handleGenerateNewShortURL,
    handleGetAnalytics,
    handleDeleteURL,
    handleGenerateQRCode,
    handleEditURL
} = require('../controllers/url');

const router = express.Router();

router.post('/', handleGenerateNewShortURL);

router.get('/analytics/:shortId', handleGetAnalytics);

router.post('/edit/:shortId', handleEditURL);

router.post('/delete/:shortId', handleDeleteURL);

// QR Code generation
router.get('/qrcode/:shortId', handleGenerateQRCode);

module.exports = router;
