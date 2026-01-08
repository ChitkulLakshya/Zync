const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const prisma = require('../lib/prisma');
const verifyToken = require('../middleware/authMiddleware');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GEMINI_MODEL = "gemini-2.5-flash"; // Or use env

router.post('/', verifyToken, async (req, res) => {
  const { idea, repoIds } = req.body; // repoIds is String[]
  const userId = req.user.uid;

  if (!idea) {
    return res.status(400).json({ message: 'Idea is required' });
  }

  try {
    // 1. Generate Tasks with Gemini
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const prompt = `
      You are a technical project manager. Break down the following software project idea into a list of specific, actionable technical tasks.
      
      Project Idea: "${idea}"

      Return a STRICT JSON object containing an array of tasks under the key "tasks".
      Each task object must have:
      - "displayId": A unique short string ID (e.g., "TASK-01", "TASK-02").
      - "title": Short summary (max 10 words).
      - "description": Detailed technical instruction.
      
      Example format:
      {
        "tasks": [
          { "displayId": "TASK-01", "title": "Setup React", "description": "Initialize Vite project." }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean and parse JSON
    const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    let generatedData;
    try {
        generatedData = JSON.parse(jsonString);
    } catch (e) {
        return res.status(500).json({ message: 'Failed to parse AI response', error: e.message });
    }

    if (!generatedData.tasks || !Array.isArray(generatedData.tasks)) {
      return res.status(500).json({ message: 'Invalid AI response format' });
    }

    // 2. Save to MongoDB using Prisma
    // We can use createMany, but if we want to ensure uniqueness or validation, loop is okay.
    // MongoDB supports createMany in Prisma.

    const tasksToCreate = generatedData.tasks.map(t => ({
      displayId: t.displayId,
      title: t.title,
      description: t.description,
      status: 'pending',
      repoIds: repoIds || [], // Array of GitHub Repo IDs
      userId: userId
    }));

    await prisma.task.createMany({
      data: tasksToCreate
    });

    res.status(201).json({ message: 'Tasks generated successfully', count: tasksToCreate.length, tasks: tasksToCreate });

  } catch (error) {
    console.error('Project Generation Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
