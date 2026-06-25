const Groq = require('groq-sdk');

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;
const MODEL_NAME = 'llama-3.1-8b-instant';


const filterCommitMessage = (message) => {

  const taskRegex = /(?:TASK-|#)(\d+)/i;
  const match = message.match(taskRegex);

  if (match) {
    return {
      found: true,
      id: match[0].toUpperCase().replace('#', 'TASK-'),
      action: message.toLowerCase().includes('fix') ? 'Complete' : 'In Progress',
      confidence: 0.8
    };
  }
  return { found: false, id: null, action: null, confidence: 0 };
};


const analyzeCommit = async (message) => {
  if (!groq) {
    console.warn('GROQ_API_KEY not found. Defaulting to regex logic.');
    return filterCommitMessage(message);
  }

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
                "id": string | null,
                "action": "Complete" | "In Progress" | "Reference" | null,
                "confidence": number
            }

            If no specific task ID pattern is found, set "found": false.
        `;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL_NAME,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices?.[0]?.message?.content;
    if (!responseText) {
      return filterCommitMessage(message);
    }

    let analysis;
    try {
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      analysis = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Groq JSON Parse Error", e);
      return filterCommitMessage(message);
    }

    if (analysis.found) {
      return analysis;
    } else {
      return filterCommitMessage(message);
    }

  } catch (error) {
    console.error('Groq Analysis Error:', error.message);
    return filterCommitMessage(message);
  }
};

module.exports = { filterCommitMessage, analyzeCommit };
