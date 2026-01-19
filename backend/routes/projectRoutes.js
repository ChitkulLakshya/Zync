const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai"); // Changed from Groq
const Project = require('../models/Project');
const { sendZyncEmail } = require('../services/mailer');
const User = require('../models/User');
// Prisma Client with Driver Adapter
const prisma = require('../lib/prisma');
const axios = require('axios');
const CryptoJS = require('crypto-js');
const authMiddleware = require('../middleware/authMiddleware');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_SECONDARY);
// Reverting to stable model as requested (likely user meant 1.5-flash or 2.0-flash-exp but 1.5 is safer)
const MODEL_NAME = "gemini-2.5-flash";
console.log(`[Config] Using Gemini Model: ${MODEL_NAME}`);
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Helper: Decrypt Token
const decryptToken = (ciphertext) => {
  if (!ciphertext) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Token decryption failed:", error);
    return null;
  }
};

const fs = require('fs');
const path = require('path');

const logDebug = (message) => {
  const logPath = path.join(__dirname, '../debug_architecture.log');
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
  console.log(`[DEBUG] ${message}`);
};

// Helper: Fetch Repo Context
const fetchRepoContext = async (accessToken, owner, repo) => {
  logDebug(`Fetching repo context for ${owner}/${repo}`);
  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json'
    };

    // 1. Fetch File Tree (Root)
    logDebug(`Requesting file tree...`);
    const treeResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents`, { headers });
    const files = treeResponse.data.map(f => f.name);
    logDebug(`Found files: ${files.join(', ')}`);

    let context = `Repository File Structure (Root):\n${files.join('\n')}\n\n`;

    // 2. Fetch specific interesting files
    const interestingFiles = ['package.json', 'requirements.txt', 'go.mod', 'README.md', 'schema.prisma', 'Genre.js', 'App.js', 'server.js', 'index.js'];

    for (const file of interestingFiles) {
      if (files.includes(file)) {
        try {
          logDebug(`Fetching content of ${file}...`);
          const contentRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${file}`, { headers });
          if (contentRes.data.content) {
            const content = Buffer.from(contentRes.data.content, 'base64').toString('utf-8');
            // Truncate large files to avoid token limits
            context += `\n--- Content of ${file} ---\n${content.substring(0, 5000)}\n----------------------\n`;
          }
        } catch (e) {
          logDebug(`Failed to fetch ${file}: ${e.message}`);
        }
      }
    }

    logDebug(`Context prepared. Length: ${context.length} chars`);
    return context;
  } catch (error) {
    logDebug(`Error fetching repo context: ${error.message}`);
    if (error.response) logDebug(`Response data: ${JSON.stringify(error.response.data)}`);
    return "Failed to fetch repository context.";
  }
};

// Helper: Analyze with Gemini
const analyzeWithGemini = async (repoContext, projectName) => {
  logDebug(`Sending context to Gemini for analysis...`);
  const prompt = `
    You are a Senior Software Architect. Analyze the following codebase context for the project "${projectName}".
    
    Codebase Context:
    ${repoContext}

    Based on the file structure and contents (dependencies, README, etc.), deduce the architecture.
    Return a STRICT JSON object matching this schema exactly:

    {
      "highLevel": "Brief summary of the architecture (e.g., MERN Stack application with Redux)",
      "frontend": {
        "structure": "Description of frontend organization (e.g., React with Vite)",
        "pages": ["Inferred pages"],
        "components": ["Inferred key components"],
        "routing": "Inferred routing strategy"
      },
      "backend": {
        "structure": "Description of backend organization (e.g., Node.js Express server)",
        "apis": ["Inferred API routes (REST/GraphQL)"],
        "controllers": ["Inferred controllers"],
        "services": ["Inferred services"],
        "authFlow": "Inferred authentication mechanism"
      },
      "database": {
        "design": "Description of data model",
        "collections": ["Inferred collections/tables"],
        "relationships": "Inferred key relationships"
      },
      "apiFlow": "How frontend communicates with backend",
      "integrations": ["Detected external libraries/SDKs (e.g., Firebase, Stripe)"]
    }

    If you cannot derive specific details, ANY logical inference is better than null. Use "N/A" only if absolutely unknown.
    Do NOT include markdown formatting or explanations outside the JSON.
  `;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    logDebug(`Gemini response received. Length: ${jsonString.length}`);

    const parsed = JSON.parse(jsonString);
    logDebug(`Parsed JSON keys: ${Object.keys(parsed).join(', ')}`);
    return parsed;
  } catch (error) {
    logDebug(`Gemini analysis failed: ${error.message}`);
    throw error; // Propagate error so route handles it
  }
};

// Create a new project manually (e.g. from GitHub import)
router.post('/', async (req, res) => {
  try {
    const { name, description, ownerId, githubRepoName, githubRepoOwner } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const newProject = new Project({
      name,
      description: description || 'No description',
      ownerId,
      githubRepoName,
      githubRepoOwner,

      isTrackingActive: !!(githubRepoName && githubRepoOwner),
      steps: [
        { id: 'step-1', title: 'Planning', description: 'Initial requirements and design', type: 'Design', tasks: [] },
        { id: 'step-2', title: 'Frontend', description: 'Client-side implementation', type: 'Frontend', tasks: [] },
        { id: 'step-3', title: 'Backend', description: 'Server-side logic and APIs', type: 'Backend', tasks: [] },
        { id: 'step-4', title: 'Database', description: 'Schema design and data management', type: 'Database', tasks: [] },
        { id: 'step-5', title: 'Deployment', description: 'CI/CD and hosting setup', type: 'Other', tasks: [] }
      ], // Default steps for immediate task creation
      architecture: {} // Initially empty for on-demand generation
    });

    await newProject.save();
    res.status(201).json(newProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Failed to create project', error: error.message });
  }
});

// Trigger Architecture Analysis On-Demand
router.post('/:id/analyze-architecture', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const { githubRepoName, githubRepoOwner, ownerId } = project;

    if (!githubRepoName || !githubRepoOwner) {
      return res.status(400).json({ message: 'Project is not linked to a GitHub repository' });
    }

    const user = await User.findOne({ uid: ownerId });
    if (!user || !user.integrations?.github?.accessToken) {
      return res.status(400).json({ message: 'Owner is not connected to GitHub' });
    }

    const accessToken = decryptToken(user.integrations.github.accessToken);
    if (!accessToken) {
      return res.status(500).json({ message: 'Failed to decrypt GitHub token' });
    }

    console.log(`Analyzing GitHub Repo: ${githubRepoOwner}/${githubRepoName}...`);
    const context = await fetchRepoContext(accessToken, githubRepoOwner, githubRepoName);
    const analyzedArch = await analyzeWithGemini(context, project.name);

    console.log("Analysis Result:", JSON.stringify(analyzedArch, null, 2));

    if (analyzedArch && Object.keys(analyzedArch).length > 0) {
      project.architecture = analyzedArch;
      await project.save();
      console.log("Project architecture saved successfully.");
    } else {
      console.warn("Analysis returned empty or null.");
    }


    res.json(project);
  } catch (error) {
    console.error("Architecture analysis failed:", error);
    res.status(500).json({ message: 'Failed to analyze architecture', error: error.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const { name, description, ownerId } = req.body;

    if (!name || !description) {
      return res.status(400).json({ message: 'Name and description are required' });
    }

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

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

    let generatedData;
    try {
      generatedData = JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse Gemini response:", jsonString);
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
    res.status(500).json({ message: 'Failed to generate project', error: error.message });
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
        { team: ownerId },
        { 'steps.tasks.assignedTo': ownerId }
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

    // Lazy initialization of steps if missing (for existing projects)
    if (!project.steps || project.steps.length === 0) {
      project.steps = [
        { id: 'init-1', title: 'Planning', description: 'Initial requirements and design', type: 'Design', tasks: [] },
        { id: 'init-2', title: 'Frontend', description: 'Client-side implementation', type: 'Frontend', tasks: [] },
        { id: 'init-3', title: 'Backend', description: 'Server-side logic and APIs', type: 'Backend', tasks: [] },
        { id: 'init-4', title: 'Database', description: 'Schema design and data management', type: 'Database', tasks: [] },
        { id: 'init-5', title: 'Deployment', description: 'CI/CD and hosting setup', type: 'Other', tasks: [] }
      ];
      await project.save();
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

// Create a new task in a specific step
router.post('/:projectId/steps/:stepId/tasks', async (req, res) => {
  try {
    const { projectId, stepId } = req.params;
    const { title, description, assignedTo, assignedToName, assignedBy } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const step = project.steps.id(stepId);
    if (!step) return res.status(404).json({ message: 'Step not found' });

    const newTask = {
      title,
      description,
      status: 'Pending',
      assignedTo,
      assignedToName,
      assignedTo,
      assignedToName,
      assignedBy: assignedBy || 'Admin',
      createdBy: req.user ? req.user.uid : (assignedBy || 'Admin') // Track Creator
    };

    // Send email notification if assigned
    if (assignedTo) {
      const user = await User.findOne({ uid: assignedTo });
      if (user && user.email) {
        const subject = `New Task Assigned: ${newTask.title}`;
        const text = `You have been assigned a new task in project "${project.name}".\n\nTask: ${newTask.title}\nDescription: ${newTask.description || 'No description'}\nAssigned By: ${assignedBy || 'Admin'}`;
        const html = `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>New Task Assignment</h2>
            <p>You have been assigned a new task in project <strong>${project.name}</strong>.</p>
            <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Step:</strong> ${step.title}</p>
              <p><strong>Task:</strong> ${newTask.title}</p>
              <p><strong>Description:</strong> ${newTask.description || 'No description'}</p>
            </div>
            <p>Please log in to Zync to view more details.</p>
          </div>
        `;
        try {
          await sendZyncEmail(user.email, subject, html, text);
        } catch (emailError) {
          console.error("Failed to send assignment email:", emailError);
        }
      }
    }

    step.tasks.push(newTask);
    await project.save();

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating task:', error);
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
              <p>Please log in to ZYNC to view more details.</p>
            </div>
          `;

          try {
            await sendZyncEmail(
              user.email,
              subject,
              html,
              text
            );
          } catch (emailError) {
            console.error("Failed to send assignment email:", emailError);
            // Don't crash the request, just log it
          }
        }
      }
    }

    await project.save();

    // Emit generic project update for live board
    req.app.get('io').emit('projectUpdate', {
      projectId: project._id,
      project
    });

    res.json(project);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a task (Only Creator or Project Owner)
router.delete('/:projectId/steps/:stepId/tasks/:taskId', authMiddleware, async (req, res) => {
  try {
    const { projectId, stepId, taskId } = req.params;
    const userId = req.user ? req.user.uid : null;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const step = project.steps.id(stepId);
    if (!step) return res.status(404).json({ message: 'Step not found' });

    const task = step.tasks.id(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Check Permissions: ONLY Project Owner
    if (project.ownerId !== userId) {
      return res.status(403).json({ message: 'Permission denied. Only the project owner can delete tasks.' });
    }

    step.tasks.pull(taskId);
    await project.save();

    // Emit generic project update for live board (since deletion changes state)
    req.app.get('io').emit('projectUpdate', {
      projectId: project._id,
      project
    });

    res.json({ message: 'Task deleted successfully', projectId, stepId, taskId });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Server error' });
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
    const { title, description, assignedTo, assignedToName } = req.body;

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
      step = project.steps[project.steps.length - 1];
    }

    const newTask = {
      title,
      description,
      status: 'Backlog',
      assignedTo,
      assignedToName,
      assignedBy: req.user?.name || 'Admin',
      createdBy: req.user ? req.user.uid : 'Admin'
    };

    // Send email notification if assigned
    if (assignedTo) {
      const user = await User.findOne({ uid: assignedTo });
      if (user && user.email) {
        const subject = `New Task Assigned: ${newTask.title}`;
        const text = `You have been assigned a new task in project "${project.name}".\n\nTask: ${newTask.title}\nDescription: ${newTask.description || 'No description'}\nAssigned By: Admin`;
        const html = `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>New Task Assignment</h2>
            <p>You have been assigned a new task in project <strong>${project.name}</strong>.</p>
            <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Task:</strong> ${newTask.title}</p>
              <p><strong>Description:</strong> ${newTask.description || 'No description'}</p>
            </div>
            <p>Please log in to Zync to view more details.</p>
          </div>
        `;
        try {
          await sendZyncEmail(user.email, subject, html, text);
        } catch (emailError) {
          console.error("Failed to send assignment email:", emailError);
        }
      }
    }

    step.tasks.push(newTask);
    await project.save();

    res.json({ message: 'Task created', task: newTask, stepId: step.id, project });
  } catch (error) {
    console.error('Error creating quick task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
