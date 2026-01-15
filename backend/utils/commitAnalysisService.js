const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Fallback Regex Logic
 * Defined before usage to avoid Temporal Dead Zone issues.
 */
const filterCommitMessage = (message) => {
  // Simple regex for TASK-XXX or #XXX
  const taskRegex = /(?:TASK-|#)(\d+)/i;
  const match = message.match(taskRegex);

  if (match) {
    return {
      found: true,
      id: match[0].toUpperCase().replace('#', 'TASK-'), // Normalize to TASK-XXX
      action: message.toLowerCase().includes('fix') ? 'Complete' : 'In Progress',
      confidence: 0.8
    };
  }
  return { found: false, id: null, action: null, confidence: 0 };
};

/**
 * Analyzes a commit message using Gemini 2.5 Flash.
 * Returns structured task-related data.
 * 
 * @param {string} message - The commit message content.
 * @returns {Promise<Object>}
 */
const analyzeCommit = async (message) => {
  const API_KEY = process.env.GEMINI_API_KEY_SECONDARY || process.env.GEMINI_API_KEY;
  const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!API_KEY) {
    console.warn('GEMINI_API_KEY not found. Defaulting to regex logic.');
    return filterCommitMessage(message);
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: { responseMimeType: "application/json" }
  });

  try {
    const prompt = `
            You are a system that analyzes Git commit messages to identify linked tasks.
            
            Commit Message: "${message}"

            Analyze the message for any references to Task IDs (e.g. TASK-123, ID-456, #123).
            If found, return the task ID and the action (e.g. "Complete", "In Progress", "Reference").
            
            If the commit says "Fixes TASK-123", action is "Complete".
            If "Updates TASK-123", action is "In Progress".
            If just referencing, action is "Reference".
            
            Return JSON:
            {
                "found": boolean,
                "id": string | null, // The standardized ID found (e.g. TASK-123)
                "action": "Complete" | "In Progress" | "Reference" | null,
                "confidence": number
            }

            If no specific task ID pattern is found, set "found": false.
        `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Clean and parse
    let analysis;
    try {
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      analysis = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Gemini JSON Parse Error", e);
      return filterCommitMessage(message);
    }

    if (analysis.found) {
      return analysis;
    } else {
      return filterCommitMessage(message);
    }

  } catch (error) {
    console.error('Gemini Analysis Error:', error.message);
    // Fallback
    return filterCommitMessage(message);
  }
};

module.exports = { filterCommitMessage, analyzeCommit };
