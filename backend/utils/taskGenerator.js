const { Groq } = require('groq-sdk');
const { PrismaClient } = require('@prisma/client');


const prisma = new PrismaClient();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL_NAME = "openai/gpt-oss-120b";


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

      if (Array.isArray(parsed)) generatedTasks = parsed;
      else if (parsed.tasks && Array.isArray(parsed.tasks)) generatedTasks = parsed.tasks;
    } catch (e) {
      console.error("Failed to parse AI Task JSON", e);
      return [];
    }

    const createdTasks = [];


    await prisma.$transaction(async (tx) => {

      const lastTask = await tx.task.findFirst({
        orderBy: { displayId: 'desc' }
      });

      let nextIdNum = 1;
      if (lastTask && lastTask.displayId) {
        const match = lastTask.displayId.match(/TASK-(\d+)/);
        if (match) {
          nextIdNum = parseInt(match[1], 10) + 1;
        }
      }


      const newTasks = await Promise.all(generatedTasks.map((taskData, index) => {
        const currentIdNum = nextIdNum + index;
        const displayId = `TASK-${String(currentIdNum).padStart(3, '0')}`;

        return tx.task.create({
          data: {
            displayId: displayId,
            description: `${taskData.title}: ${taskData.description}`,
            status: 'Backlog',
            repoIds: repoIds
          }
        });
      }));

      createdTasks.push(...newTasks);
    });

    return createdTasks;

  } catch (error) {
    console.error('Task Generation Error:', error);
    throw error;
  }
}


module.exports = { generateArchitectureTasks: generateTasksFromIdea };
