// Imports the Express.js framework, which is a popular Node.js web application framework. This is needed to create and manage server routes and middleware for handling HTTP requests.
const express = require('express');
// Creates a new router object using Express. This object is used to define a set of routes that can be mounted as a middleware, helping to organize routes into modular units for better maintainability.
const router = express.Router();
// Imports specific controller functions (getInspiration, getPinterestInspiration, getDribbbleInspiration) from the 'inspirationController' file located in the '../controllers' directory. This destructuring assignment allows direct access to these functions, separating the route definition from the business logic.
const { getInspiration, getPinterestInspiration, getDribbbleInspiration } = require('../controllers/inspirationController');

// Defines an HTTP GET route for the '/search' path. When a GET request is made to this endpoint, the 'getInspiration' function (imported from the controller) will be executed to handle the request and fetch inspiration data.
router.get('/search', getInspiration);

// Exports the configured router object, making it available for other files (e.g., the main application file) to import and use. This allows the main application to mount these routes under a specific base path.
module.exports = router;