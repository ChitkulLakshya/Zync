const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Project = require('../models/Project');
const { sendZyncEmail } = require('../services/mailer');
const User = require('../models/User');
// Prisma Client with Driver Adapter
const prisma = require('../lib/prisma');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_SECONDARY || process.env.GEMINI_API_KEY || "DUMMY_KEY_TO_PREVENT_CRASH");
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

router.post('/generate', async (req, res) => {
  try {
    const { name, description, ownerId } = req.body;

    if (!name || !description) {
      return res.status(400).json({ message: 'Name and description are required' });
    }

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

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
            "title": "Phase Title (e.g., Planning, Frontend, Backend)",
            "description": "Description of the phase",
            "type": "Frontend" | "Backend" | "Database" | "Design" | "Other",
            "page": "Related Page",
            "tasks": [
               {
                 "title": "Task Title",
                 "description": "Task details"
               }
            ]
          }
        ]
      }
      
      Ensure the steps are ordered logically for development. Each step should act as a phase (e.g. 'Setup', 'Database', 'Frontend Core') and contain multiple granular tasks.
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

    // Improved error handling
    let errorMessage = 'Server error';
    if (error.status === 404 && error.message.includes('not found')) {
      errorMessage = `Model not found: ${GEMINI_MODEL}. Please check API key availability.`;
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({ message: 'Failed to generate project', error: errorMessage });
  }
});

// Get all projects for a user (owned or part of team)
router.get('/', async (req, res) => {
  try {
    const { ownerId } = req.query;
    // Find projects where user is owner OR is in the team array
    const projects = await Project.find({
      $or: [
        { ownerId },
        { team: ownerId }
      ]
    }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add user to project team (Join Project)
router.post('/:id/team', async (req, res) => {
  try {
    const { userId } = req.body; // User to add
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!project.team.includes(userId) && project.ownerId !== userId) {
      project.team.push(userId);
      await project.save();
    }

    res.json(project);
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

// Delete a project
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update Project Details (e.g. Link GitHub Repo)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Filter allowed updates to prevent overwriting critical fields if needed
    // For now, we trust the client to send valid fields matching the schema
    const allowedUpdates = ['name', 'description', 'githubRepoName', 'githubRepoOwner', 'isTrackingActive'];
    const filteredUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const project = await Project.findByIdAndUpdate(id, { $set: filteredUpdates }, { new: true });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update a specific task status or assignment
router.put('/:projectId/steps/:stepId/tasks/:taskId', async (req, res) => {
  try {
    const { projectId, stepId, taskId } = req.params;
    const { status, assignedTo, assignedToName, assignedBy } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const step = project.steps.id(stepId);
    if (!step) return res.status(404).json({ message: 'Step not found' });

    const task = step.tasks.id(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (status) task.status = status;

    // Handle Assignment
    if (assignedTo !== undefined) {
      const oldAssignee = task.assignedTo;
      task.assignedTo = assignedTo;
      task.assignedToName = assignedToName;

      // Send email if newly assigned and different from old
      if (assignedTo && assignedTo !== oldAssignee) {
        const user = await User.findOne({ uid: assignedTo });

        if (user && user.email) {
          const subject = `New Task Assigned: ${task.title}`;
          const text = `You have been assigned a new task in project "${project.name}".\n\nStep: ${step.title}\nTask: ${task.title}\nAssigned By: ${assignedBy || 'Admin'}`;
          const html = `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h2>New Task Assignment</h2>
              <p>You have been assigned a new task in project <strong>${project.name}</strong>.</p>
              <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p><strong>Task:</strong> ${task.title}</p>
                <p><strong>Step:</strong> ${step.title}</p>
                <p><strong>Assigned By:</strong> ${assignedBy || 'Admin'}</p>
              </div>
              <p>Please log in to Zync to view more details.</p>
            </div>
          `;

          await sendZyncEmail(
            user.email,
            subject,
            html,
            text
          );
        }
      }
    }

    await project.save();
    res.json(project);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search for tasks across all projects
router.get('/tasks/search', async (req, res) => {
  try {
    const { query, userId } = req.query;
    if (!query) return res.json([]);

    // Find projects accessible to user (owned)
    // Note: In a real app, also check collaborators
    const projects = await Project.find({ ownerId: userId });

    const results = [];
    const regex = new RegExp(query, 'i');

    projects.forEach(project => {
      project.steps.forEach(step => {
        step.tasks.forEach(task => {
          if (regex.test(task.title)) {
            results.push({
              id: task.id,
              title: task.title,
              projectId: project._id,
              projectName: project.name,
              status: task.status,
              stepName: step.title
            });
          }
        });
      });
    });

    // Return top 10 matches
    res.json(results.slice(0, 10));
  } catch (error) {
    console.error('Error searching tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a quick task from external source (e.g. Notes)
router.post('/:projectId/quick-task', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Find a suitable step (e.g. "Planning", "Backlog", or the first step)
    let step = project.steps.find(s =>
      s.title.toLowerCase().includes('backlog') ||
      s.title.toLowerCase().includes('planning') ||
      s.title.toLowerCase().includes('general')
    );

    if (!step) {
      step = project.steps[0];
    }

    if (!step) {
      // Create a default step if none exist
      project.steps.push({
        title: 'Backlog',
        description: 'Auto-generated backlog',
        type: 'Other',
        tasks: []
      });
      step = project.steps[project.steps.length - 1]; // Get the one we just pushed (Wait, mongoose arrays behave differently)
      // It's safer to save and re-fetch or just assume index 0 if it was empty.
      // Actually, project.steps is a MongooseDocumentArray.
      step = project.steps[project.steps.length - 1];
    }

    const newTask = {
      title,
      description,
      status: 'Backlog',
      assignedBy: 'Note Integration'
    };

    step.tasks.push(newTask);
    await project.save();

    res.json({ message: 'Task created', task: newTask, stepId: step.id, project });
  } catch (error) {
    console.error('Error creating quick task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
