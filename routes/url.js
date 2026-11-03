const express=require('express');
const {handleGenerateNewShortURL, handleGetAnalytics, handleDeleteURL} = require('../controllers/url')
const router = express.Router();

router.post('/',handleGenerateNewShortURL);
router.get('/analytics/:shortId',handleGetAnalytics);
router.post("/delete/:shortId", handleDeleteURL);

module.exports= router;