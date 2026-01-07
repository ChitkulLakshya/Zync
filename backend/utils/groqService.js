const Groq = require('groq-sdk');
const axios = require('axios');

/**
 * Analyzes a commit message using Groq SDK.
 * @param {string} message - The commit message to analyze.
 * @returns {Promise<{task_id: string, is_done: boolean} | null>}
 */
const analyzeCommitWithGroq = async (message) => {
  try {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      console.warn('GROQ_API_KEY not found.');
      return null;
    }

    const groq = new Groq({ apiKey: GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a task analyzer. Look at the commit message. If it contains a Task ID (e.g., GLOBAL-01) and implies the task is finished (using words like fix, complete, done, or resolved), return a JSON object: {\"id\": \"string\", \"completed\": boolean}. If no task ID is found, return null. Return strictly JSON."
        },
        {
          role: "user",
          content: message
        }
      ],
      model: "llama3-8b-8192",
      temperature: 0,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    try {
        const result = JSON.parse(content);
        // Normalize null returns from LLM to actual null
        if (!result || (result.id === null && result.completed === undefined)) return null;
        return result;
    } catch (e) {
        // Fallback for when LLM wraps json in markdown (though response_format should prevent this)
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
            return JSON.parse(content.substring(jsonStart, jsonEnd + 1));
        }
        return null;
    }

  } catch (error) {
    console.error('Groq Analysis Error:', error.message);
    return null;
  }
};

/**
 * Legacy Axios Implementation (kept for backward compatibility if needed)
 */
const filterCommitMessage = async (commitMessage, taskTitle = '', taskDescription = '') => {
  try {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      console.warn('GROQ_API_KEY not found. Defaulting to regex logic.');
      return null;
    }

    // Prepare prompt
    const prompt = `
      You are a project manager AI. Analyze the following commit message in the context of a software task.
      
      Task: "${taskTitle}"
      Task Description: "${taskDescription}"
      Commit Message: "${commitMessage}"

      Determine if this commit indicates that the task is FULLY COMPLETED (e.g., "fixed", "completed", "resolved", "done") or just WORK IN PROGRESS (e.g., "wip", "working on", "updated", "refactored").
      
      Also, extract the Task ID if present (format: [TASK-<id>]).

      Return ONLY a JSON object with this format:
      {
        "taskId": "extracted_task_id_or_null",
        "status": "Done" | "In Progress"
      }
    `;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: "mixtral-8x7b-32768",
        messages: [
          { role: "system", content: "You are a helpful assistant that outputs only valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0]?.message?.content;
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonStr = content.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonStr);
    }

    return null;

  } catch (error) {
    console.error('Groq API Analysis Failed:', error.message);
    return null; // Fallback to default logic
  }
};

const analyzeCommitWithGroq_Old = filterCommitMessage;

module.exports = { filterCommitMessage, analyzeCommitWithGroq };
