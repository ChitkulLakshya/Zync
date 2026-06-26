const fs = require('fs'); // Imports the built-in Node.js 'fs' (file system) module, which provides methods for interacting with the file system, such as reading and writing files. This is needed to read the static JSON data file.
const path = require('path'); // Imports the built-in Node.js 'path' module, which provides utilities for working with file and directory paths. This is needed to construct a consistent and platform-independent path to the data file.
const { paginateArray, setPaginationHeaders } = require('../utils/pagination'); // Destructures and imports specific functions 'paginateArray' and 'setPaginationHeaders' from the 'pagination.js' utility file located in the 'utils' directory. These functions are essential for handling pagination logic and setting appropriate HTTP response headers for paginated data.
const { getSharedBrowser, scrapeDribbble } = require('../services/scraperService'); // Destructures and imports specific functions 'getSharedBrowser' and 'scrapeDribbble' from the 'scraperService.js' file located in the 'services' directory. These functions are crucial for managing a browser instance and performing web scraping operations.

const DATA_FILE = path.join(__dirname, '../data/inspiration.json'); // Declares a constant variable 'DATA_FILE' and assigns it the absolute path to the 'inspiration.json' file. 'path.join' concatenates path segments, '__dirname' provides the current directory, and '../data/inspiration.json' specifies the relative path to the data file, ensuring the application can locate its static data.

let CACHED_DATA = null; // Declares a mutable variable 'CACHED_DATA' and initializes it to 'null'. This variable will hold the parsed content of the 'inspiration.json' file in memory after it's loaded, acting as a simple in-memory cache to avoid repeated file reads.

function loadCache() { // Defines a function named 'loadCache' which is responsible for loading the static data from the JSON file into memory and caching it.
  if (!CACHED_DATA) { // Checks if the 'CACHED_DATA' variable is currently null or undefined (i.e., the cache has not been loaded yet). This condition ensures that the file is read and parsed only once per application lifecycle.
    try { // Starts a try-catch block to handle potential errors that might occur during file system operations or JSON parsing.
      const rawData = fs.readFileSync(DATA_FILE, 'utf-8'); // Reads the content of the file specified by 'DATA_FILE' synchronously using 'fs.readFileSync'. The 'utf-8' encoding is specified to correctly interpret the file's text content, and the raw string data is stored in 'rawData'.
      CACHED_DATA = JSON.parse(rawData); // Parses the 'rawData' string, which is expected to be a JSON string, into a JavaScript object or array using 'JSON.parse'. The resulting JavaScript data structure is then assigned to 'CACHED_DATA' for caching.
    } catch (err) { // Catches any error that occurs within the try block. The error object is passed as 'err'.
      CACHED_DATA = []; // If an error occurs during file reading or parsing, 'CACHED_DATA' is initialized as an empty array. This ensures that subsequent operations on the cache don't fail due to an undefined or malformed cache.
      if (err.code === 'ENOENT') { // Checks if the error code is 'ENOENT', which specifically indicates that the file or directory does not exist. This helps differentiate between a missing file and other types of errors.
        console.warn('WARN: Static cache file not found.'); // Logs a warning message to the console if the 'inspiration.json' file was not found. This informs the developer that the application will start with an empty cache.
      } else { // Executes if the error is not 'ENOENT', meaning it's a different type of file system or parsing error.
        console.warn(`WARN: Failed to read cache file: ${err.message}`); // Logs a warning message to the console, including the specific error message, indicating that the cache file could not be read for reasons other than it being missing.
      }
    }
  }
  return CACHED_DATA; // Returns the 'CACHED_DATA', which will either be the loaded data, an empty array if an error occurred, or the already cached data from previous calls.
}

function searchCache(query) { // Defines a function named 'searchCache' that takes a 'query' string as an argument and filters the cached data based on that query.
  let items = loadCache(); // Calls the 'loadCache' function to ensure the data is loaded into 'CACHED_DATA' and then assigns a reference to this data (an array of items) to the local 'items' variable.

  if (query && query !== 'web design') { // Checks if a 'query' string is provided (not null, undefined, or empty) AND if it's not the specific string 'web design'. This condition prevents filtering when no meaningful query is present or for a default query that might be handled differently.
    const normalizedQuery = query.replace(/[\s-]+/g, ''); // Declares a constant 'normalizedQuery' and assigns it the 'query' string with all whitespace characters (spaces, tabs, newlines) and hyphens removed using a regular expression. This normalization helps in performing more flexible searches that ignore formatting differences.
    items = items.filter(item => { // Filters the 'items' array, creating a new array containing only the items for which the provided callback function returns true.
      const title = item.title?.toLowerCase() || ''; // Accesses the 'title' property of the current 'item'. The optional chaining operator '?.' prevents errors if 'title' is null or undefined, and '.toLowerCase()' converts it to lowercase for case-insensitive comparison. If 'title' is missing, it defaults to an empty string.
      const source = item.source?.toLowerCase() || ''; // Accesses the 'source' property of the current 'item'. It's converted to lowercase for case-insensitive comparison, and defaults to an empty string if missing.
      const tags = item.tags?.map(t => t.toLowerCase()) || []; // Accesses the 'tags' property of the current 'item'. If 'tags' exists, '.map()' iterates over each tag and converts it to lowercase. If 'tags' is missing, it defaults to an empty array.

      const titleMatch = title.includes(query) || title.replace(/[\s-]+/g, '').includes(normalizedQuery); // Checks for a match in the item's title. It returns true if the title (lowercase) includes the original query OR if the normalized title includes the normalized query. This allows for flexible matching.
      const sourceMatch = source.includes(query) || source.replace(/[\s-]+/g, '').includes(normalizedQuery); // Checks for a match in the item's source. It returns true if the source (lowercase) includes the original query OR if the normalized source includes the normalized query.
      const tagMatch = tags.some(tag => // Checks for a match within the item's tags array. 'some()' returns true if at least one tag satisfies the provided condition.
        tag.includes(query) || tag.replace(/[\s-]+/g, '').includes(normalizedQuery) // The condition for each tag: returns true if the tag includes the original query OR if the normalized tag includes the normalized query.
      );
      return titleMatch || sourceMatch || tagMatch; // Returns true if any of the match conditions (title, source, or tags) are true, meaning the item should be included in the filtered results.
    });
  }

  return items; // Returns the filtered array of items, or the original unfiltered array if no query was provided or if the query was 'web design'.
}


async function getInspiration(req, res) { // Defines an asynchronous function 'getInspiration' which acts as an Express.js route handler, taking the request (req) and response (res) objects as arguments.
  const query = (req.query.q || '').toLowerCase().trim(); // Extracts the 'q' query parameter from the request URL. If 'q' is not provided, it defaults to an empty string. It then converts the query to lowercase and removes leading/trailing whitespace, preparing it for case-insensitive searching.

  try { // Starts a try-catch block to handle potential errors during the data retrieval and processing.
    const allItems = searchCache(query); // Calls 'searchCache' with the processed query to get a filtered list of inspiration items from the cached data.
    const { items, pagination } = paginateArray(allItems, req.query); // Calls 'paginateArray' to apply pagination logic to the 'allItems' array based on query parameters in 'req.query' (e.g., page number, limit). It destructures the returned object into 'items' (the paginated subset) and 'pagination' (metadata about pagination).
    setPaginationHeaders(res, pagination); // Calls 'setPaginationHeaders' to add pagination-related HTTP headers (e.g., X-Total-Count, Link) to the response object 'res'. This provides clients with information about the total number of items and links to other pages.

    res.json({ // Sends a JSON response back to the client.
      ok: true, // Indicates that the request was successful.
      count: items.length, // Provides the number of items in the current paginated response.
      total: allItems.length, // Provides the total number of items matching the search query before pagination.
      items // Includes the array of paginated inspiration items in the response body.
    });
  } catch (error) { // Catches any error that occurs within the try block. The error object is passed as 'error'.
    console.error('Inspiration Controller Error:', error); // Logs the error to the console for debugging purposes, prefixed with a descriptive message.
    res.status(500).json({ ok: false, error: error.message }); // Sends an HTTP 500 (Internal Server Error) status code and a JSON response indicating failure, including the error message.
  }
}


async function getLiveScrape(req, res) { // Defines an asynchronous function 'getLiveScrape' which acts as an Express.js route handler for performing live web scraping.
  const query = (req.query.q || '').toLowerCase().trim(); // Extracts the 'q' query parameter from the request URL, defaults to an empty string if not present, converts it to lowercase, and removes leading/trailing whitespace. This prepares the query for the scraping service.

  if (!query) { // Checks if the 'query' string is empty after processing.
    return res.json({ ok: true, count: 0, items: [] }); // If no query is provided, it immediately sends a successful JSON response with an empty array of items and a count of 0, as there's nothing to scrape. The 'return' keyword stops further execution of the function.
  }

  try { // Starts a try-catch block to handle potential errors during the live scraping process.
    console.log(`Live scraping Dribbble for "${query}"...`); // Logs a message to the console indicating that a live scraping operation is starting for the given query.
    const browser = await getSharedBrowser(); // Asynchronously calls 'getSharedBrowser' to obtain a Puppeteer browser instance. The 'await' keyword pauses execution until the browser instance is ready.
    const items = await scrapeDribbble(browser, query); // Asynchronously calls 'scrapeDribbble' with the obtained browser instance and the search query. This function performs the actual scraping, and 'await' pauses execution until the scraping is complete and the results are returned.
    console.log(`Scraped ${items.length} items from Dribbble for "${query}"`); // Logs a message to the console indicating how many items were successfully scraped for the given query.

    res.json({ // Sends a JSON response back to the client.
      ok: true, // Indicates that the request was successful.
      count: items.length, // Provides the number of items that were scraped and are included in the response.
      items // Includes the array of scraped inspiration items in the response body.
    });
  } catch (error) { // Catches any error that occurs within the try block during the scraping process. The error object is passed as 'error'.
    console.error('Live Scrape Error:', error); // Logs the error to the console for debugging purposes, prefixed with a descriptive message.
    res.json({ ok: true, count: 0, items: [] }); // Sends a successful JSON response with an empty array of items and a count of 0, even if an error occurred during scraping. This provides a graceful fallback, preventing the client from receiving an error status code for a scraping failure.
  }
}


async function getDribbbleInspiration(req, res) { // Defines an asynchronous function 'getDribbbleInspiration' which acts as an Express.js route handler.
  return getInspiration(req, res); // Calls the 'getInspiration' function, passing along the request and response objects, and returns its result. This effectively reuses the existing cached data retrieval and pagination logic for Dribbble inspiration.
}

module.exports = { getInspiration, getDribbbleInspiration, getLiveScrape }; // Exports an object containing the 'getInspiration', 'getDribbbleInspiration', and 'getLiveScrape' functions. This makes these functions available for other modules (e.g., an Express router) to import and use as route handlers.