const express = require('express');
const router = express.Router();
const { getInspiration, getDribbbleInspiration, getLiveScrape } = require('../controllers/inspirationController');


router.get('/scrape', getLiveScrape);
router.get('/', getInspiration);
router.get('/dribbble', getDribbbleInspiration);

module.exports = router;
