const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const Project = require('../models/Project');
const Step = require('../models/Step');
const ProjectTask = require('../models/ProjectTask');
const { normalizeDoc } = require('../utils/normalize');
const { getProjectWithSteps } = require('../utils/projectHelper');

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;


router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, ownerId } = req.body;
    const uid = req.user.uid;

    if (!name || !description) {
      return res.status(400).json({ message: 'Name and description are required' });
    }

    if (!groq) {
      return res.status(503).json({ message: 'AI generation service not configured (missing GROQ_API_KEY)' });
    }


    let user = await User.findOne({ uid }).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const prompt = `You are a senior software architect. Generate a comprehensive project plan for:

Project Name: ${name}
Description: ${description}

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:

{
  "architecture": {
    "highLevel": "Brief summary of the architecture",
    "frontend": {
      "structure": "Frontend organization description",
      "pages": ["List of pages"],
      "components": ["Key components"],
      "routing": "Routing strategy"
    },
    "backend": {
      "structure": "Backend organization",
      "apis": ["API endpoints"],
      "controllers": ["Controllers"],
      "services": ["Services"],
      "authFlow": "Auth mechanism"
    },
    "database": {
      "design": "Database design",
      "collections": ["Collections/tables"],
      "relationships": "Key relationships"
    },
    "apiFlow": "Frontend-backend communication",
    "integrations": ["External libraries/SDKs"]
  },
  "steps": [
    {
      "title": "Phase Title",
      "description": "Phase description",
      "type": "Frontend|Backend|Database|Design|Other",
      "tasks": [
        { "title": "Task title", "description": "Task details" }
      ]
    }
  ]
}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-oss-120b',
      temperature: 0.7,
      max_tokens: 8192,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices?.[0]?.message?.content;
    if (!responseText) {
      return res.status(500).json({ message: 'AI returned empty response' });
    }

    let generatedData;
    try {
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      generatedData = JSON.parse(cleaned);
    } catch (e) {
      console.error('Failed to parse AI response:', responseText);
      return res.status(500).json({ message: 'Failed to parse AI response', error: e.message });
    }


    const newProject = await Project.create({
      name,
      description,
      ownerId: user._id,
      architecture: generatedData.architecture || {},
      team: [],
    });


    const stepsData = (generatedData.steps || []).map((stepData, idx) => ({
      title: stepData.title,
      description: stepData.description || '',
      type: stepData.type || 'Other',
      page: stepData.page || 'General',
      order: idx,
      projectId: newProject._id,
      tasks: stepData.tasks || [],
    }));

    const createdSteps = await Step.insertMany(
      stepsData.map(({ tasks, ...stepFields }) => stepFields)
    );

    const allTasks = createdSteps.flatMap((step, i) =>
      stepsData[i].tasks.map(task => ({
        title: task.title,
        description: task.description || '',
        status: 'Pending',
        stepId: step._id,
      }))
    );

    if (allTasks.length > 0) {
      await ProjectTask.insertMany(allTasks);
    }

    const fullProject = await getProjectWithSteps(newProject._id);
    res.status(201).json(fullProject);
  } catch (error) {
    console.error('Error generating project:', error);
    res.status(500).json({ message: 'Failed to generate project', error: error.message });
  }
});

module.exports = router;
