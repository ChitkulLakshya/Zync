const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_SECONDARY);

async function listModels() {
    try {
        console.log("Testing alternate model availability...");

        // Trying older or specific versions
        const modelsToTest = ["gemini-1.5-flash-8b", "gemini-1.5-pro-latest", "gemini-pro-vision"];

        for (const modelName of modelsToTest) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello");
                console.log(`✅ Model ${modelName} is working!`);
                process.exit(0);
            } catch (e) {
                console.log(`❌ Model ${modelName} failed: ${e.message.split(' ')[0]}...`);
            }
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
