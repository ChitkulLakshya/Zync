const jwt = require('jsonwebtoken'); // WHAT: Imports the jsonwebtoken library. WHY: Needed to create and sign JSON Web Tokens for GitHub App authentication.
const axios = require('axios'); // WHAT: Imports the axios HTTP client. WHY: Used to make API requests to GitHub to obtain access tokens.


const getAppJwt = () => { // WHAT: Defines a function to generate a JWT for the GitHub App. WHY: GitHub requires a signed JWT to authenticate as an App before requesting an installation token.
    const appId = process.env.GITHUB_APP_ID; // WHAT: Retrieves the GitHub App ID from environment variables. WHY: Identifies which GitHub App is making the request.
    const rawKey = process.env.GITHUB_PRIVATE_KEY || process.env.GITHUB_APP_PRIVATE_KEY || ''; // WHAT: Retrieves the GitHub private key from environment variables. WHY: Needed to cryptographically sign the JWT.
    const privateKey = rawKey.replace(/\\n/g, '\n'); // WHAT: Formats the private key by replacing escaped newlines. WHY: Environment variables often escape newlines, but the crypto module requires actual newline characters.

    const now = Math.floor(Date.now() / 1000); // WHAT: Gets the current time in seconds since epoch. WHY: JWT claims like 'iat' and 'exp' require time in seconds.
    const payload = { // WHAT: Creates the JWT payload object. WHY: Defines the claims (issued at, expiration, issuer) required by GitHub.
        iat: now - 60, // WHAT: Sets the 'issued at' time to 60 seconds in the past. WHY: Prevents token rejection due to clock drift between servers.
        exp: now + (10 * 60), // WHAT: Sets the 'expiration' time to 10 minutes in the future. WHY: Limits the validity window of the token for security; GitHub enforces a max of 10 minutes.
        iss: appId // WHAT: Sets the 'issuer' to the GitHub App ID. WHY: Tells GitHub which App is presenting the token.
    };

    return jwt.sign(payload, privateKey, { algorithm: 'RS256' }); // WHAT: Signs and returns the JWT using the RS256 algorithm. WHY: GitHub requires tokens to be signed with the App's private key using RSA.
};


const getInstallationAccessToken = async (installationId) => { // WHAT: Defines an async function to get an installation access token. WHY: Allows the application to act on behalf of a specific installation of the GitHub App.
    const jwtToken = getAppJwt(); // WHAT: Generates a new App JWT. WHY: Required in the Authorization header to request the installation token.

    try { // WHAT: Starts a try-catch block. WHY: To gracefully handle any potential errors during the external API request.
        const response = await axios.post( // WHAT: Makes a POST request to the GitHub API. WHY: Endpoint specifically used to generate an access token for an installation.
            `https://api.github.com/app/installations/${installationId}/access_tokens`, // WHAT: The URL for the installation token endpoint. WHY: Targets the specific installation ID provided.
            {}, // WHAT: Sends an empty body in the POST request. WHY: The endpoint doesn't require any body parameters by default.
            { // WHAT: Configuration object for the axios request. WHY: Used to pass necessary headers.
                headers: { // WHAT: Defines the request headers. WHY: Required to pass authentication and specify API versions.
                    'Authorization': `Bearer ${jwtToken}`, // WHAT: Sets the Bearer token to the generated JWT. WHY: Authenticates the request as the GitHub App.
                    'Accept': 'application/vnd.github.v3+json' // WHAT: Specifies the acceptable response format. WHY: Ensures GitHub returns the v3 REST API response.
                }
            }
        );
        return response.data.token; // WHAT: Returns the generated token from the response. WHY: Provides the caller with the token needed to make API calls as the installation.
    } catch (error) { // WHAT: Catches any errors from the axios request. WHY: Prevents the application from crashing and allows for error logging.
        console.error('Error fetching installation token:', error.response?.data || error.message); // WHAT: Logs the error details. WHY: Useful for debugging API failures, falling back to message if no response data exists.
        throw error; // WHAT: Rethrows the error. WHY: Allows the calling function to handle the failure appropriately.
    }
};

module.exports = { getInstallationAccessToken }; // WHAT: Exports the getInstallationAccessToken function. WHY: Makes it available for other files that need to authenticate GitHub API calls.
