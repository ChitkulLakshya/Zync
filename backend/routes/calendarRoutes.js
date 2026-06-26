// Declares a constant variable 'express' and assigns it the 'express' module, which is a web framework for Node.js.
// This imports the Express.js framework, essential for building web applications and APIs in Node.js, allowing us to create routes and handle HTTP requests.
const express = require('express');
// Declares a constant variable 'router' and assigns it an instance of an Express router.
// This creates a modular, mountable route handler, allowing us to define routes for a specific part of the application (like API endpoints) and then export them, keeping the main application file cleaner.
const router = express.Router();
// Declares a constant variable 'verifyToken' and assigns it the module exported from '../middleware/authMiddleware.js'.
// This imports a custom middleware function responsible for authenticating requests, ensuring that only authorized users can access the protected API endpoints.


// Declares a constant variable 'holidayCache' and initializes it as a new Map object. A Map is a collection of key-value pairs.
// This Map will be used to store fetched holiday data in memory, acting as a cache to reduce redundant API calls to the external holiday service and improve response times.
const holidayCache = new Map();
// Declares a constant variable 'CACHE_TTL_MS' and assigns it the value of 24 hours in milliseconds (24 * 60 * 60 * 1000).
// This defines the "Time To Live" for the holiday cache entries, specifying how long cached data remains valid before it's considered stale and needs to be re-fetched.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Defines an HTTP GET route for the '/holidays' path using the 'router' object. It specifies 'verifyToken' as middleware and an asynchronous callback function to handle requests.
// This sets up the API endpoint for retrieving public holidays. It uses 'verifyToken' to ensure the request is authenticated and 'async' because it will perform asynchronous operations like fetching data from an external API.
router.get('/holidays', verifyToken, async (req, res) => {
    // Declares a constant variable 'year'. It attempts to parse the 'year' query parameter from the request URL into an integer using parseInt() with radix 10. If 'req.query.year' is not provided or invalid, it defaults to the current year obtained from new Date().getFullYear().
    // This extracts the desired year for holiday lookup from the client's request, or uses the current year as a sensible default, which is necessary for querying the external holiday API.
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    // Declares a constant variable 'countryCode'. It retrieves the 'countryCode' query parameter from the request. If not provided, it defaults to 'US'. .toUpperCase() converts the string to uppercase.
    // This extracts the desired country code for holiday lookup from the client's request, defaulting to 'US' for convenience, and standardizes it to uppercase as required by the external API.
    const countryCode = (req.query.countryCode || 'US').toUpperCase();

    // This is an if statement that checks if the 'countryCode' does NOT match the regular expression /^[A-Z]{2}$/. The regex matches exactly two uppercase English letters. .test() method checks for a match.
    // This performs input validation to ensure the 'countryCode' provided by the client is in the correct ISO 3166-1 alpha-2 format (e.g., US, IN), preventing invalid requests from being sent to the external API.
    if (!/^[A-Z]{2}$/.test(countryCode)) {
        // If the 'countryCode' is invalid, this line sends an HTTP 400 (Bad Request) status code to the client. .json() sends a JSON response body containing an error message. 'return' stops further execution of the function.
        // This provides immediate feedback to the client about an invalid input, preventing unnecessary processing and clearly indicating what the expected format is.
        return res.status(400).json({ message: 'Invalid countryCode. Use ISO 3166-1 alpha-2 (e.g. US, IN, GB).' });
    }

    // This is an if statement that checks if the 'year' is less than 1900 OR greater than 2100.
    // This performs input validation to ensure the 'year' provided by the client is within a reasonable and supported range, preventing requests for years that the external API might not support or that are unlikely to be relevant.
    if (year < 1900 || year > 2100) {
        // If the 'year' is out of the valid range, this line sends an HTTP 400 (Bad Request) status code to the client with a JSON error message. 'return' stops further execution.
        // This provides immediate feedback to the client about an invalid year, guiding them to provide a valid input and preventing errors from the external API.
        return res.status(400).json({ message: 'Year must be between 1900 and 2100.' });
    }

    // Declares a constant variable 'cacheKey' and assigns it a string created using template literals, combining the 'year' and 'countryCode' with a hyphen.
    // This creates a unique identifier for each specific holiday request (year and country combination), which is used as the key to store and retrieve data from the 'holidayCache'.
    const cacheKey = `${year}-${countryCode}`;
    // Declares a constant variable 'cached' and assigns it the value associated with 'cacheKey' from the 'holidayCache' Map. If the key is not found, 'cached' will be 'undefined'.
    // This attempts to retrieve previously stored holiday data from the cache, which can significantly speed up responses if the data is already available.
    const cached = holidayCache.get(cacheKey);

    // This is an if statement that checks two conditions: first, if 'cached' exists (is not undefined or null), AND second, if the current time (Date.now()) minus the 'timestamp' stored in the 'cached' object is less than 'CACHE_TTL_MS'.
    // This checks if valid, non-stale data exists in the cache for the requested 'year' and 'countryCode', allowing the server to return cached data instead of making a new external API call.
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        // If the cache hit is valid and not stale, this line sends an HTTP 200 (OK) status code to the client with the 'data' property from the 'cached' object as a JSON response. 'return' stops further execution.
        // This immediately returns the cached holiday data to the client, fulfilling the request quickly without needing to contact the external API, thus improving performance.
        return res.json(cached.data);
    }

    // This keyword starts a 'try' block, which encloses code that might throw an error.
    // This allows for robust error handling. If any operation within this block fails (e.g., network issues, API errors), the execution will jump to the 'catch' block, preventing the application from crashing.
    try {
        // Declares a constant variable 'url' and assigns it a string constructed using template literals, embedding the 'year' and 'countryCode' into the base URL for the Nager.Date API.
        // This dynamically constructs the specific URL needed to fetch public holidays for the requested year and country from the external Nager.Date API.
        const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`;
        // Declares a constant variable 'response' and assigns it the result of an asynchronous 'fetch' request to the constructed 'url'. 'await' pauses execution until the promise returned by 'fetch' resolves.
        // This sends an HTTP request to the external Nager.Date API to retrieve the holiday data, which is an asynchronous operation.
        const response = await fetch(url);

        // This is an if statement that checks if the 'status' property of the 'response' object is strictly equal to 404.
        // This checks if the external API responded with a "Not Found" status, indicating that no holiday data exists for the given country code, which is a specific error case to handle.
        if (response.status === 404) {
            // If the external API returns a 404, this line sends an HTTP 404 (Not Found) status code to the client with a specific JSON error message. 'return' stops further execution.
            // This informs the client that the requested country code did not yield any results from the external API, providing clear feedback.
            return res.status(404).json({ message: `No holidays found for country code "${countryCode}".` });
        }

        // This is an if statement that checks if the 'ok' property of the 'response' object is 'false'. The 'ok' property is 'true' if the HTTP status code is in the 200-299 range, otherwise 'false'.
        // This checks if the external API request was unsuccessful (e.g., 5xx server error, 4xx client error other than 404), indicating a general failure to retrieve data.
        if (!response.ok) {
            // If the 'response.ok' is 'false', this line sends an HTTP 502 (Bad Gateway) status code to the client with a generic JSON error message. 'return' stops further execution.
            // This indicates that the server, acting as a gateway, received an invalid response from the upstream (Nager.Date) server, informing the client of an issue with the external service.
            return res.status(502).json({ message: 'Failed to fetch holidays from Nager.Date API.' });
        }

        // Declares a constant variable 'data' and assigns it the result of asynchronously parsing the 'response' body as JSON. 'await' pauses execution until the JSON parsing is complete.
        // This extracts the actual holiday data from the successful HTTP response received from the Nager.Date API, converting it from a raw JSON string into a JavaScript object.
        const data = await response.json();

        // Declares a constant variable 'holidays' and assigns it a new array. 'data.map()' iterates over each item ('h') in the 'data' array and transforms it into a new object.
        // This processes the raw holiday data received from the external API, mapping it to a standardized and potentially simplified format that is more suitable for the application's needs and client consumption.
        const holidays = data.map((h) => ({
            // Creates a 'date' property in the new object, assigning it the value of the 'date' property from the original holiday object 'h'.
            // This extracts the date of the holiday, ensuring it's included in the standardized output.
            date: h.date,
            // Creates a 'localName' property in the new object, assigning it the value of the 'localName' property from the original holiday object 'h'.
            // This extracts the local name of the holiday, ensuring it's included in the standardized output.
            localName: h.localName,
            // Creates a 'name' property in the new object, assigning it the value of the 'name' property from the original holiday object 'h'.
            // This extracts the common name of the holiday, ensuring it's included in the standardized output.
            name: h.name,
            // Creates a 'countryCode' property in the new object, assigning it the value of the 'countryCode' property from the original holiday object 'h'.
            // This extracts the country code associated with the holiday, ensuring it's included in the standardized output.
            fixed: h.fixed,
            // Creates a 'fixed' property in the new object, assigning it the value of the 'fixed' property from the original holiday object 'h'.
            // This extracts the boolean indicating if the holiday has a fixed date, ensuring it's included in the standardized output.
            global: h.global,
            // Creates a 'global' property in the new object, assigning it the value of the 'global' property from the original holiday object 'h'.
            // This extracts the boolean indicating if the holiday is global for the country, ensuring it's included in the standardized output.
            types: h.types || [],
        }));

        // Calls the 'set()' method on the 'holidayCache' Map, storing a new key-value pair. The 'cacheKey' is the key, and the value is an object containing the current timestamp (Date.now()) and the processed 'holidays' data.
        // This stores the newly fetched and processed holiday data in the cache, along with a timestamp, so that subsequent requests for the same year and country can be served from the cache, improving performance.
        holidayCache.set(cacheKey, { timestamp: Date.now(), data: holidays });

        // Sends an HTTP 200 (OK) status code to the client with the processed 'holidays' array as a JSON response.
        // This sends the final, formatted holiday data back to the client, successfully fulfilling the API request.
        res.json(holidays);
    // This keyword starts a 'catch' block, which executes if an error occurs in the preceding 'try' block. The 'error' object contains details about the exception.
    // This provides a mechanism to gracefully handle any unexpected errors that might occur during the API call or data processing, preventing the server from crashing.
    } catch (error) {
        // Calls the 'error()' method of the 'console' object to log an error message to the console, including a descriptive string and the 'error' object itself.
        // This logs detailed error information to the server's console, which is crucial for debugging and monitoring issues in a production environment.
        console.error('Error fetching holidays:', error);
        // Sends an HTTP 500 (Internal Server Error) status code to the client with a generic JSON error message.
        // This informs the client that an unexpected server-side error occurred, providing a general error message without exposing sensitive internal details.
        res.status(500).json({ message: 'Server error fetching holidays.' });
    }
});


// Declares a variable 'countriesCache' using 'let' (allowing reassignment) and initializes it to 'null'.
// This variable will store the list of available countries and their associated timestamp in memory, acting as a cache to avoid repeatedly fetching this static data from the external API. It's 'let' because it will be assigned a value later.
let countriesCache = null;
// Declares a constant variable 'COUNTRIES_CACHE_TTL' and assigns it the value of 7 days in milliseconds (7 * 24 * 60 * 60 * 1000).
// This defines the "Time To Live" for the countries cache, specifying how long the list of countries remains valid before it's considered stale and needs to be re-fetched. A longer TTL is used as country data changes less frequently than holiday data.
const COUNTRIES_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

// Defines an HTTP GET route for the '/countries' path using the 'router' object. It specifies 'verifyToken' as middleware and an asynchronous callback function to handle requests. '_req' indicates the request object is not used.
// This sets up the API endpoint for retrieving a list of available countries. It uses 'verifyToken' for authentication and 'async' because it will perform an asynchronous operation (fetching from an external API).
router.get('/countries', verifyToken, async (_req, res) => {
    // This is an if statement that checks two conditions: first, if 'countriesCache' exists (is not null), AND second, if the current time (Date.now()) minus the 'timestamp' stored in 'countriesCache' is less than 'COUNTRIES_CACHE_TTL'.
    // This checks if valid, non-stale country data exists in the cache, allowing the server to return cached data instead of making a new external API call.
    if (countriesCache && Date.now() - countriesCache.timestamp < COUNTRIES_CACHE_TTL) {
        // If the cache hit is valid and not stale, this line sends an HTTP 200 (OK) status code to the client with the 'data' property from the 'countriesCache' object as a JSON response. 'return' stops further execution.
        // This immediately returns the cached country data to the client, fulfilling the request quickly without needing to contact the external API, thus improving performance.
        return res.json(countriesCache.data);
    }

    // This keyword starts a 'try' block, which encloses code that might throw an error.
    // This allows for robust error handling. If any operation within this block fails (e.g., network issues, API errors), the execution will jump to the 'catch' block.
    try {
        // Declares a constant variable 'response' and assigns it the result of an asynchronous 'fetch' request to the Nager.Date API's 'AvailableCountries' endpoint. 'await' pauses execution until the promise resolves.
        // This sends an HTTP request to the external Nager.Date API to retrieve the list of available countries, which is an asynchronous operation.
        const response = await fetch('https://date.nager.at/api/v3/AvailableCountries');

        // This is an if statement that checks if the 'ok' property of the 'response' object is 'false'.
        // This checks if the external API request was unsuccessful (e.g., 5xx server error, 4xx client error), indicating a general failure to retrieve data.
        if (!response.ok) {
            // If the 'response.ok' is 'false', this line sends an HTTP 502 (Bad Gateway) status code to the client with a generic JSON error message. 'return' stops further execution.
            // This indicates that the server, acting as a gateway, received an invalid response from the upstream (Nager.Date) server, informing the client of an issue with the external service.
            return res.status(502).json({ message: 'Failed to fetch countries from Nager.Date API.' });
        }

        // Declares a constant variable 'data' and assigns it the result of asynchronously parsing the 'response' body as JSON. 'await' pauses execution until the JSON parsing is complete.
        // This extracts the actual country data from the successful HTTP response received from the Nager.Date API, converting it from a raw JSON string into a JavaScript object.
        const data = await response.json();

        // Assigns a new object to the 'countriesCache' variable. This object contains the current timestamp (Date.now()) and the fetched 'data'.
        // This stores the newly fetched country data in the cache, along with a timestamp, so that subsequent requests can be served from the cache, improving performance.
        countriesCache = { timestamp: Date.now(), data };

        // Sends an HTTP 200 (OK) status code to the client with the 'data' (list of countries) as a JSON response.
        // This sends the fetched country data back to the client, successfully fulfilling the API request.
        res.json(data);
    // This keyword starts a 'catch' block, which executes if an error occurs in the preceding 'try' block. The 'error' object contains details about the exception.
    // This provides a mechanism to gracefully handle any unexpected errors that might occur during the API call, preventing the server from crashing.
    } catch (error) {
        // Calls the 'error()' method of the 'console' object to log an error message to the console, including a descriptive string and the 'error' object itself.
        // This logs detailed error information to the server's console, which is crucial for debugging and monitoring issues in a production environment.
        console.error('Error fetching countries:', error);
        // Sends an HTTP 500 (Internal Server Error) status code to the client with a generic JSON error message.
        // This informs the client that an unexpected server-side error occurred, providing a general error message without exposing sensitive internal details.
        res.status(500).json({ message: 'Server error fetching countries.' });
    }
});

// Assigns the 'router' object to 'module.exports'. 'module.exports' is a special object in Node.js that defines what is exported from a file.
// This makes the configured Express router available for other files in the application (e.g., the main 'app.js' file) to import and use, allowing these API routes to be integrated into the main Express application.
module.exports = router;