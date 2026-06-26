// Imports the Express.js framework, which is used to build web applications and APIs.
const express = require('express');
// Creates a new router object from Express, which allows for defining modular, mountable route handlers.
const router = express.Router();
// Imports the 'verifyToken' middleware function from the specified path.
const verifyToken = require('../middleware/authMiddleware');
// Imports the Mongoose 'User' model, which provides an interface to interact with the 'users' collection in the MongoDB database.
const User = require('../models/User');
// Imports the 'normalizeDoc' utility function using object destructuring from the specified path.
const { normalizeDoc } = require('../utils/normalize');


// Defines a route handler for HTTP POST requests to the '/connect' endpoint.
// The 'verifyToken' middleware is executed first to authenticate the user, and then the asynchronous callback function handles the request.
router.post('/connect', verifyToken, async (req, res) => {
    // Uses object destructuring to extract 'accessToken', 'email', and 'refreshToken' from the request body.
    // These variables contain the Google credentials sent by the client for integration.
    const { accessToken, email, refreshToken } = req.body;
    // Extracts the 'uid' (user ID) from the 'req.user' object, which is populated by the 'verifyToken' middleware after successful authentication.
    // This 'uid' uniquely identifies the user in the database.
    const uid = req.user.uid;

    // Checks if the 'accessToken' variable is falsy (e.g., undefined, null, or an empty string).
    // This is a validation step to ensure a critical piece of information is present.
    if (!accessToken) {
        // Sends an HTTP 400 (Bad Request) status code to the client.
        // Returns a JSON response with an error message, indicating that the access token is missing and stopping further execution.
        return res.status(400).json({ message: 'Access Token is required' });
    }

    // Initiates a try-catch block to handle potential errors that may occur during the asynchronous operations within.
    try {
        // Declares a constant object 'googleData' to store the Google integration details.
        const googleData = {
            // Sets the 'connected' status to true, indicating a successful connection.
            connected: true,
            // Stores the user's email, using shorthand property syntax (equivalent to email: email).
            email,
            // Stores the Google access token, using shorthand property syntax (equivalent to accessToken: accessToken).
            accessToken,
            // Records the current date and time in ISO 8601 format as a string, marking when the connection was established.
            connectedAt: new Date().toISOString()
        };
        // Checks if a 'refreshToken' was provided in the request body.
        // A refresh token allows the application to obtain new access tokens without user re-authentication.
        if (refreshToken) {
            // If a refresh token exists, it is added as a property to the 'googleData' object.
            googleData.refreshToken = refreshToken;
        }

        // Uses Mongoose's 'findOneAndUpdate' method to find a user document by 'uid', update it, and return the modified document.
        // 'await' pauses the function execution until the database operation completes.
        const user = await User.findOneAndUpdate(
            // The first argument is the filter object: it finds a document where the 'uid' field matches the extracted 'uid'.
            { uid },
            // The second argument is the update object: '$set' operator replaces the value of the 'googleIntegration' field with the 'googleData' object.
            { $set: { googleIntegration: googleData } },
            // The third argument is the options object:
            // 'returnDocument: 'after'' ensures the updated document is returned.
            // 'lean: true' returns a plain JavaScript object instead of a Mongoose document for performance.
            { returnDocument: 'after', lean: true }
        );

        // Checks if no user document was found and updated (i.e., 'user' is null or undefined).
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Sends an HTTP 200 (OK) status code to the client.
        res.status(200).json({
            // Provides a success message indicating that Google is connected.
            message: 'Google connected',
            // Returns the email associated with the Google integration.
            // The optional chaining operator '?.' safely accesses 'email' only if 'googleIntegration' exists on the 'user' object.
            email: user.googleIntegration?.email
        });

    // Catches any errors that occur within the 'try' block.
    } catch (error) {
        // Logs the error to the console for debugging purposes, prefixed with a descriptive message.
        console.error('Google Connect Error:', error);
        // Sends an HTTP 500 (Internal Server Error) status code to the client.
        // Returns a generic error message, indicating a server-side issue without exposing sensitive details.
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// Defines a route handler for HTTP DELETE requests to the '/disconnect' endpoint.
// The 'verifyToken' middleware is executed first to authenticate the user, and then the asynchronous callback function handles the request.
router.delete('/disconnect', verifyToken, async (req, res) => {
    // Extracts the 'uid' (user ID) from the 'req.user' object, which is populated by the 'verifyToken' middleware.
    // This 'uid' uniquely identifies the user whose Google integration needs to be disconnected.
    const uid = req.user.uid;

    // Initiates a try-catch block to handle potential errors that may occur during the asynchronous operations within.
    try {
        // Uses Mongoose's 'updateOne' method to find a user document by 'uid' and update it.
        // 'await' pauses the function execution until the database operation completes.
        await User.updateOne(
            // The first argument is the filter object: it finds a document where the 'uid' field matches the extracted 'uid'.
            { uid },
            // The second argument is the update object:
            {
                // The '$set' operator replaces the value of the 'googleIntegration' field with a new object.
                $set: {
                    // Defines the new state for the 'googleIntegration' embedded document.
                    googleIntegration: {
                        // Sets 'connected' to false, explicitly marking the Google account as disconnected.
                        connected: false,
                        // Sets 'accessToken' to null, clearing the stored access token for security and invalidating future API calls.
                        accessToken: null,
                        // Sets 'refreshToken' to null, clearing the stored refresh token to prevent obtaining new access tokens.
                        refreshToken: null,
                        // Sets 'email' to null, removing the associated Google email from the user's profile.
                        email: null
                    }
                }
            }
        );

        // Sends an HTTP 200 (OK) status code to the client.
        // Returns a JSON response with a success message, confirming that Google was disconnected.
        res.status(200).json({ message: 'Google disconnected' });

    // Catches any errors that occur within the 'try' block.
    } catch (error) {
        // Logs the error to the console for debugging purposes, prefixed with a descriptive message.
        console.error('Google Disconnect Error:', error);
        // Sends an HTTP 500 (Internal Server Error) status code to the client.
        // Returns a generic error message, indicating a server-side issue without exposing sensitive details.
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Exports the 'router' object, making all the defined routes available for other files in the application to import and use.
module.exports = router;