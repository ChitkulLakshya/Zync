// Declares a constant variable named 'express' and assigns it the Express.js framework module, which is imported using Node.js's 'require()' function. This is needed to build web applications and define routes.
const express = require('express');
// Declares a constant variable named 'router' and initializes it with a new Express Router instance. This creates a modular, mountable route handler that can define its own routes and middleware, helping to organize API endpoints.
const router = express.Router();
// Declares a constant variable and uses object destructuring to extract specific named exports (getInspiration, getDribbbleInspiration, getLiveScrape) from the module located at '../controllers/inspirationController'. This makes these functions available to be used as route handlers for processing requests.
const { getInspiration, getDribbbleInspiration, getLiveScrape } = require('../controllers/inspirationController');

// Defines an HTTP GET route for the path '/scrape' on this router. When a GET request is made to '/scrape', the 'getLiveScrape' function from the controller will be executed to handle the request, typically performing a real-time data scrape.
router.get('/scrape', getLiveScrape);
// Defines an HTTP GET route for the root path '/' on this router. When a GET request is made to '/', the 'getInspiration' function from the controller will be executed to handle the request, typically fetching general inspiration data.
router.get('/', getInspiration);
// Defines an HTTP GET route for the path '/dribbble' on this router. When a GET request is made to '/dribbble', the 'getDribbbleInspiration' function from the controller will be executed to handle the request, specifically fetching inspiration data from Dribbble.
router.get('/dribbble', getDribbbleInspiration);

// Exports the 'router' instance as the module's primary export. This makes the configured router, including all its defined routes, available for other files (e.g., the main application file) to import and use, integrating these routes into the overall application.
module.exports = router;