// Imports the 'express' module, which is a popular Node.js web application framework.
// This is needed to set up an Express.js application, providing tools for building web servers and APIs, specifically for defining routes in this file.
const express = require('express');
// Creates a new router object from Express.
// This allows us to define modular, mountable route handlers, grouping related routes here before exporting them to the main application.
const router = express.Router();
// Uses object destructuring to import the 'getWebhookQueueMetrics' function from the specified module.
// This is needed to access the specific function responsible for retrieving real-time metrics about the webhook processing queue.
const { getWebhookQueueMetrics } = require('../services/webhookQueue');

// Defines a constant arrow function named 'bytesToMb' that converts a value from bytes to megabytes.
// This utility function is needed to convert raw byte values (returned by process.memoryUsage()) into a more human-readable megabyte format for display.
const bytesToMb = (bytes) => Number((bytes / (1024 * 1024)).toFixed(2));

// Defines a GET route handler for the '/metrics' path using the Express router.
// This sets up an API endpoint at '/metrics' that, when accessed via a GET request, will execute the provided function to gather and return system and application metrics.
router.get('/metrics', (_req, res) => {
  // Calls the Node.js global 'process.memoryUsage()' function to get current memory statistics for the process.
  // This is needed to collect current memory statistics (like RSS, heapUsed, heapTotal) of the running Node.js application.
  const memoryUsage = process.memoryUsage();
  // Calls the imported 'getWebhookQueueMetrics()' function to retrieve application-specific queue metrics.
  // This is needed to retrieve the specific application-level metrics (like queue depth, lag, processing status) that provide insight into the webhook system's performance and health.
  const queueMetrics = getWebhookQueueMetrics();

  // Sends a JSON response back to the client with the collected metrics.
  // This is the final step in the API endpoint, sending back a structured JSON object containing all the gathered memory and queue metrics to the client.
  return res.json({
    // Defines a 'memoryMb' property in the JSON response to group memory-related metrics.
    // It provides a clear, nested structure for the memory usage data, making the API response organized and easy to parse.
    memoryMb: {
      // Converts the Resident Set Size (RSS) memory usage from bytes to megabytes and assigns it to the 'rss' property.
      // This provides the RSS memory usage (total memory allocated for the process) in a readable megabyte format as part of the metrics.
      rss: bytesToMb(memoryUsage.rss),
      // Converts the heapUsed memory usage from bytes to megabytes and assigns it to the 'heapUsed' property.
      // This provides the amount of memory currently used by JavaScript objects and closures in a readable megabyte format, crucial for monitoring.
      heapUsed: bytesToMb(memoryUsage.heapUsed),
      // Converts the heapTotal memory usage from bytes to megabytes and assigns it to the 'heapTotal' property.
      // This provides the total allocated size of the V8 heap in a readable megabyte format, indicating maximum memory available for JavaScript objects.
      heapTotal: bytesToMb(memoryUsage.heapTotal),
    },
    // Defines a 'webhookQueue' property in the JSON response to group webhook queue-specific metrics.
    // It provides a clear, nested structure for the application-specific queue data, making the API response organized and easy to parse.
    webhookQueue: {
      // Assigns the 'depth' metric from the queueMetrics object.
      // This provides the current number of items waiting in the webhook queue, a key indicator of backlog and processing load.
      depth: queueMetrics.depth,
      // Assigns the 'lagMs' metric from the queueMetrics object.
      // This provides the time difference (lag) in milliseconds between when a job was added and when it's processed, indicating potential delays.
      lagMs: queueMetrics.lagMs,
      // Assigns the 'processing' metric from the queueMetrics object.
      // This indicates the number of webhook jobs currently being actively processed, giving insight into the system's concurrent workload.
      processing: queueMetrics.processing,
      // Assigns the 'trackedJobs' metric from the queueMetrics object.
      // This provides the total number of jobs that the queue system is currently aware of or tracking, useful for overall system monitoring.
    },
    // Creates a new Date object for the current time and converts it to an ISO 8601 string, assigning it to the 'timestamp' property.
    // This provides a precise timestamp for when the metrics were collected, essential for monitoring, logging, and understanding data freshness.
    timestamp: new Date().toISOString(),
  });
});

// Exports the configured router object so it can be used by other parts of the application (e.g., the main app.js file).
// This makes the 'router' object, which contains the '/metrics' route definition, available for import and use, integrating this endpoint into the overall Express application.
module.exports = router;