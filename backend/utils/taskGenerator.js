const { Groq } = require('groq-sdk');
const { PrismaClient } = require('@prisma/client');


// WHAT: Initializes the Prisma database client. WHY: Allows the application to interact with the database for reading and writing records.
const prisma = new PrismaClient();
// WHAT: Initializes the Groq SDK with an API key. WHY: Authenticates the application to communicate with the Groq AI service.
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
// WHAT: Defines the specific AI model to use. WHY: Hardcodes the model string to ensure consistent behavior across all generation requests.
const MODEL_NAME = "openai/gpt-oss-120b";


async function generateTasksFromIdea(userId, idea, repoIds) {
  try {
    // WHAT: Constructs a prompt for the AI model. WHY: Instructs the AI on how to break down the user's idea into specific, actionable engineering tasks.
    const prompt = `
      You are a Technical Lead. Break down the following feature request into small, specific engineering tasks.

      Feature Request: "${idea}"

      Repo Context: The user selected ${repoIds.length} repositories.

      Return a JSON array of objects. Each object must have:
      - title: Short clear title
      - description: Technical description of implementation
      - type: "Frontend" | "Backend" | "Database" | "DevOps"

      Example format:
      [
        { "title": "Create API Route", "description": "POST /api/v1/resource", "type": "Backend" }
      ]

      Output strictly JSON.
    `;

    // WHAT: Sends a chat completion request to Groq. WHY: Queries the AI model to process the prompt and return a structured JSON response containing the tasks.
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL_NAME,
      response_format: { type: 'json_object' }
    });

    // WHAT: Extracts the generated content from the AI's response. WHY: Captures the JSON string to be parsed into JavaScript objects, falling back to an empty array if missing.
    const jsonString = completion.choices[0]?.message?.content || "[]";
    let generatedTasks = [];

    try {
      // WHAT: Parses the AI-generated JSON string. WHY: Converts the text response into usable JavaScript objects to be inserted into the database.
      const parsed = JSON.parse(jsonString);

      // WHAT: Normalizes the parsed data into a standard array format. WHY: Handles potential structural variations from the AI output to ensure we always have an array of tasks.
      if (Array.isArray(parsed)) generatedTasks = parsed;
      else if (parsed.tasks && Array.isArray(parsed.tasks)) generatedTasks = parsed.tasks;
    } catch (e) {
      // WHAT: Catches JSON parsing errors and logs them. WHY: Prevents the application from crashing if the AI returns malformed JSON, and provides debug info.
      console.error("Failed to parse AI Task JSON", e);
      return [];
    }

    const createdTasks = [];


    // WHAT: Opens a database transaction. WHY: Ensures that all task reads and writes occur atomically, so partial task creation doesn't leave the DB in an inconsistent state.
    await prisma.$transaction(async (tx) => {

      // WHAT: Finds the most recently created task. WHY: Used to determine the next logical sequence number for new task IDs.
      const lastTask = await tx.task.findFirst({
        orderBy: { displayId: 'desc' }
      });

      // WHAT: Initializes the ID counter for new tasks. WHY: Establishes a baseline sequence number that will be incremented for each new task.
      let nextIdNum = 1;
      // WHAT: Extracts the numerical portion of the last task ID. WHY: Allows the system to continue sequential numbering from where it left off, avoiding duplicate IDs.
      if (lastTask && lastTask.displayId) {
        const match = lastTask.displayId.match(/TASK-(\d+)/);
        if (match) {
          nextIdNum = parseInt(match[1], 10) + 1;
        }
      }


      // WHAT: Creates a new database record for each generated task concurrently. WHY: Optimizes insertion speed while ensuring all tasks are linked to the selected repos and assigned proper IDs.
      const newTasks = await Promise.all(generatedTasks.map((taskData, index) => {
        // WHAT: Calculates the display ID for the current task. WHY: Gives each task a unique, human-readable identifier (e.g., TASK-001) for UI display and tracking.
        const currentIdNum = nextIdNum + index;
        const displayId = `TASK-${String(currentIdNum).padStart(3, '0')}`;

        // WHAT: Inserts a new task document via Prisma within the transaction. WHY: Persists the AI-generated task into the database so it can be assigned and worked on.
        return tx.task.create({
          data: {
            displayId: displayId,
            description: `${taskData.title}: ${taskData.description}`,
            status: 'Backlog',
            repoIds: repoIds
          }
        });
      }));

      // WHAT: Appends all newly created DB task records to the results array. WHY: Aggregates the results so they can be returned to the calling function or API route.
      createdTasks.push(...newTasks);
    });

    // WHAT: Returns the full array of created tasks. WHY: Provides the newly generated and saved tasks back to the client or consuming logic.
    return createdTasks;

  } catch (error) {
    // WHAT: Catches unexpected errors during the entire process. WHY: Logs the failure for debugging and rethrows the error to be handled by higher-level error middleware.
    console.error('Task Generation Error:', error);
    throw error;
  }
}


// WHAT: Exports the task generation function. WHY: Makes the AI-driven task breakdown feature available to other parts of the application architecture.
module.exports = { generateArchitectureTasks: generateTasksFromIdea };
