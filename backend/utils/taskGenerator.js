const { Groq } = require('groq-sdk');
const { PrismaClient } = require('@prisma/client');

// Initialize Groq
const prisma = new PrismaClient();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL_NAME = "llama-3.3-70b-versatile";

/**
 * Generates technical tasks from a user idea and links them to repositories.
 * 
 * @param {number} userId - The ID of the user initiating the task generation.
 * @param {string} idea - The high-level description of the project or feature.
 * @param {number[]} repoIds - Array of internal Repository IDs (integers) to link tasks to.
 * @returns {Promise<Array>} - The created tasks.
 */
async function generateTasksFromIdea(userId, idea, repoIds) {
  try {
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

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL_NAME,
      response_format: { type: 'json_object' }
    });

    const jsonString = completion.choices[0]?.message?.content || "[]";
    let generatedTasks = [];

    try {
      const parsed = JSON.parse(jsonString);
      // Handle if AI wrapped it in { "tasks": [...] } or returned array directly
      if (Array.isArray(parsed)) generatedTasks = parsed;
      else if (parsed.tasks && Array.isArray(parsed.tasks)) generatedTasks = parsed.tasks;
    } catch (e) {
      console.error("Failed to parse AI Task JSON", e);
      return [];
    }

    const createdTasks = [];

    // 2. Save Tasks to DB and Link Repos
    // We use a transaction to ensure integrity
    await prisma.$transaction(async (tx) => {
      // Get current count to generate sequential IDs (e.g., TASK-001)
      const lastTask = await tx.task.findFirst({
        orderBy: { id: 'desc' }
      });

      let nextIdNum = lastTask ? lastTask.id + 1 : 1;

      for (const taskData of generatedTasks) {
        const displayId = `TASK-${String(nextIdNum).padStart(3, '0')}`;

        // Create the Task
        const newTask = await tx.task.create({
          data: {
            display_id: displayId,
            description: `${taskData.title}: ${taskData.description}`,
            status: 'Backlog',
            repositories: {
              create: repoIds.map(repoId => ({
                repository: {
                  connect: { id: repoId }
                }
              }))
            }
          },
          include: {
            repositories: true
          }
        });

        createdTasks.push(newTask);
        nextIdNum++;
      }
    });

    return createdTasks;

  } catch (error) {
    console.error('Task Generation Error:', error);
    throw error;
  }
}

// Map the export name to match usage if necessary, or just export the function
module.exports = { generateArchitectureTasks: generateTasksFromIdea };
