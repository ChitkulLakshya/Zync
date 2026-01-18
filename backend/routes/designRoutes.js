const express = require('express');
const router = express.Router();
const { getInspiration, getPinterestInspiration, getDribbbleInspiration } = require('../controllers/inspirationController');

// Unified search (Unsplash + Behance)
router.get('/search', getInspiration);

module.exports = router;
