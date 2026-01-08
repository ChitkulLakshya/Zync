const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PrismaClient } = require('../prisma/generated/client');
const prisma = new PrismaClient();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";

/**
 * Generates technical tasks from a user idea and links them to repositories.
 * 
 * @param {string} userIdea - The high-level description of the project.
 * @param {number[]} selectedRepoIds - Array of internal Repository IDs (integers) to link tasks to.
 * @returns {Promise<Array>} - The created tasks.
 */
async function generateArchitectureTasks(userIdea, selectedRepoIds) {
  try {
    // 1. Generate Tasks using Gemini
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    
    const prompt = `
      You are a technical project manager. Break down the following software project idea into a list of specific, actionable technical tasks.
      
      Project Idea: "${userIdea}"

      Return a JSON object containing an array of tasks under the key "tasks".
      Each task object should have:
      - "title": Short summary (max 10 words)
      - "description": Detailed technical instruction.
      - "type": One of "Frontend", "Backend", "Database", "DevOps".

      Example format:
      {
        "tasks": [
          { "title": "Setup React Router", "description": "Install react-router-dom and configure app routes.", "type": "Frontend" }
        ]
      }
      
      Ensure strict JSON output.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean and parse JSON
    const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const generatedData = JSON.parse(jsonString);
    
    if (!generatedData.tasks || !Array.isArray(generatedData.tasks)) {
        throw new Error("Invalid response format from AI");
    }

    const createdTasks = [];

    // 2. Save Tasks to DB and Link Repos
    // We use a transaction to ensure integrity
    await prisma.$transaction(async (tx) => {
        // Get current count to generate sequential IDs (e.g., TASK-001)
        // Note: For high concurrency, a sequence table or UUIDs are better, 
        // but finding the max ID works for this scope.
        const lastTask = await tx.task.findFirst({
            orderBy: { id: 'desc' }
        });
        
        let nextIdNum = lastTask ? lastTask.id + 1 : 1;

        for (const taskData of generatedData.tasks) {
            const displayId = `TASK-${String(nextIdNum).padStart(3, '0')}`;
            
            // Create the Task
            const newTask = await tx.task.create({
                data: {
                    display_id: displayId,
                    description: `${taskData.title}: ${taskData.description}`,
                    status: 'Backlog', // Default status
                    // Create relationships in the same operation
                    repositories: {
                        create: selectedRepoIds.map(repoId => ({
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
    console.error("Error generating architecture tasks:", error);
    throw error;
  }
}

module.exports = { generateArchitectureTasks };
