const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Project = require('../models/Project');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/generate', async (req, res) => {
  try {
    const { name, description, ownerId } = req.body;

    if (!name || !description) {
      return res.status(400).json({ message: 'Name and description are required' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
      You are a software architect. Generate a comprehensive project architecture and step-by-step development plan for the following project:
      
      Project Name: ${name}
      Project Description: ${description}

      Please provide the output strictly as a JSON object with the following structure. Do not include any markdown formatting or explanations outside the JSON.

      {
        "architecture": {
          "highLevel": "String describing high-level architecture",
          "frontend": {
            "structure": "String describing frontend structure",
            "pages": ["List of pages"],
            "components": ["List of key components"],
            "routing": "Description of routing"
          },
          "backend": {
            "structure": "String describing backend structure",
            "apis": ["List of key API endpoints"],
            "controllers": ["List of controllers"],
            "services": ["List of services"],
            "authFlow": "Description of authentication flow"
          },
          "database": {
            "design": "String describing database design",
            "collections": ["List of collections/tables"],
            "relationships": "Description of relationships"
          },
          "apiFlow": "Description of API calling flow between frontend and backend",
          "integrations": ["List of optional integrations"]
        },
        "steps": [
          {
            "id": "1",
            "title": "Step Title",
            "description": "Detailed description of the task",
            "type": "Frontend" | "Backend" | "Database" | "Design" | "Other",
            "page": "Related Page or Module (e.g., 'Login Page', 'Dashboard')"
          }
        ]
      }
      
      Ensure the steps are ordered logically for development (e.g., Setup -> Auth -> Core Features).
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up the text to ensure it's valid JSON (remove markdown code blocks if present)
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let generatedData;
    try {
      generatedData = JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse Gemini response:", text);
      return res.status(500).json({ message: 'Failed to generate valid project structure', error: e.message });
    }

    // Create and save the project
    const newProject = new Project({
      name,
      description,
      ownerId,
      architecture: generatedData.architecture,
      steps: generatedData.steps
    });

    await newProject.save();

    res.status(201).json(newProject);

  } catch (error) {
    console.error('Error generating project:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all projects for a user
router.get('/', async (req, res) => {
  try {
    const { ownerId } = req.query;
    const projects = await Project.find({ ownerId }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a single project by ID
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
