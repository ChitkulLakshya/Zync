
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User'); // If needed to validate owner
// const verifyToken = require('../middleware/authMiddleware'); // Verify token if you want strict auth

// Use Secondary Key as requested
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_SECONDARY || process.env.GEMINI_API_KEY);
const GEMINI_MODEL = "gemini-2.0-flash-exp";

router.post('/', async (req, res) => {
  const { name, description, ownerId } = req.body;

  if (!name || !description) {
    return res.status(400).json({ message: 'Project Name and Description are required' });
  }

  try {
    // 1. Generate Architecture & Tasks with Gemini
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are a Senior Software Architect and Project Manager. 
      Create a comprehensive technical Implementation Plan for a software project.
      
      Project Name: "${name}"
      Project Description: "${description}"

      You must return a STRICT JSON object with the following structure:
      {
        "architecture": {
           "highLevel": "Description of the system architecture",
           "frontend": { "tech": "Stack details", "components": ["List of core components"] },
           "backend": { "tech": "Stack details", "services": ["List of services/endpoints"] },
           "database": { "tech": "DB choice", "schema": ["Key collections/tables"] },
           "flow": "Description of data flow"
        },
        "steps": [
           {
             "id": "STEP-01",
             "title": "Phase 1: Foundation",
             "description": "Setting up the environment",
             "status": "Pending",
             "type": "Backend", 
             "tasks": [
                { "title": "Setup Repository", "description": "Initialize Git", "status": "Pending", "assignedTo": null },
                { "title": "Configure Database", "description": "Setup connection", "status": "Pending", "assignedTo": null }
             ]
           },
           {
             "id": "STEP-02",
             "title": "Test Board",
             "description": "QA and Testing Phase",
             "status": "Pending",
             "type": "Other", 
             "tasks": [
                { "title": "Unit Tests", "description": "Write core unit tests", "status": "Pending", "assignedTo": null },
                { "title": "Integration Tests", "description": "Test API endpoints", "status": "Pending", "assignedTo": null }
             ]
           }
        ],
        "team": [
            "Suggested Role 1", "Suggested Role 2"
        ]
      }
      
      Make the tasks specific, actionable, and technical. Include a "Test Board" step/phase explicitly.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let generatedData;
    try {
      generatedData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse AI JSON:", responseText);
      // Fallback or cleanup json
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      generatedData = JSON.parse(cleanJson);
    }

    // 2. Create Mongoose Project
    // Map generated steps to Mongoose Schema structure
    const steps = (generatedData.steps || []).map(step => ({
      id: step.id || new mongoose.Types.ObjectId().toString(),
      title: step.title,
      description: step.description,
      status: 'Pending',
      type: step.type || 'Other',
      tasks: (step.tasks || []).map(t => ({
        title: t.title,
        description: t.description,
        status: 'Pending',
        assignedTo: null // Ready for user assignment
      }))
    }));

    const newProject = new Project({
      name,
      description,
      ownerId: ownerId || 'anonymous',
      architecture: generatedData.architecture || {},
      steps: steps,
      team: [] // We can invite people later
    });

    await newProject.save();

    res.status(201).json(newProject);

  } catch (error) {
    console.error('Project Generation Error:', error);
    res.status(500).json({ message: 'Server error generating project', error: error.message });
  }
});

module.exports = router;
