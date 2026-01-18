const express = require('express');
const router = express.Router();
const { getInspiration, getPinterestInspiration, getDribbbleInspiration } = require('../controllers/inspirationController');

// GET /api/inspiration?q=web+design
router.get('/', getInspiration);
router.get('/pinterest', getPinterestInspiration);
router.get('/dribbble', getDribbbleInspiration);

module.exports = router;
