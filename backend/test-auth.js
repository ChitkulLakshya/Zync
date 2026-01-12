require('dotenv').config();
const { App } = require('octokit');

async function testAuth() {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n');

    console.log("App ID:", appId);
    console.log("Private Key Length:", privateKey ? privateKey.length : 0);
    console.log("First line of Key:", privateKey ? privateKey.split('\n')[0] : "N/A");

    if (!appId || !privateKey) {
        console.error("Missing App ID or Key");
        return;
    }

    try {
        const app = new App({ appId, privateKey });
        const jwt = app.getSignedJsonWebToken();
        console.log("JWT Generated successfully (internal check)");

        // Test API call to get App info (verifies JWT against GitHub)
        const { data } = await app.octokit.request("GET /app");
        console.log("✅ Authenticated as App:", data.name);
    } catch (error) {
        console.error("❌ Authentication Failed:");
        console.error(error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Body:", error.response.data);
        }
    }
}

testAuth();
