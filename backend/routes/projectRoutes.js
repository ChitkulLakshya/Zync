const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { sendZyncEmail } = require('../services/mailer');
const { getTaskAssignmentEmailHtml } = require('../utils/emailTemplates');
const { escapeRegExp } = require('../utils/regexUtils');
const User = require('../models/User');
const Team = require('../models/Team');
const Project = require('../models/Project');
const Step = require('../models/Step');
const ProjectTask = require('../models/ProjectTask');
const axios = require('axios');
const CryptoJS = require('crypto-js');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/authMiddleware');
const { normalizeDoc, normalizeDocs } = require('../utils/normalize');
const { paginateArray, setPaginationHeaders } = require('../utils/pagination');
const { getProjectWithSteps, getProjectsWithSteps } = require('../utils/projectHelper');
const cache = require('../utils/cache');

async function invalidateProjectCache(project) {
  if (!project) return;
  const uids = [project.ownerUid, ...(project.team || [])];
  const keys = uids.map(uid => `projects:${uid}`);
  await cache.invalidate(...keys);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_SECONDARY);
const MODEL_NAME = "gemini-2.5-flash";
console.log(`[Config] Using Gemini Model: ${MODEL_NAME}`);
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ARCHITECTURE_CACHE_TTL_MS = Number.parseInt(process.env.ARCHITECTURE_CACHE_TTL_MS || '21600000', 10);
const ARCHITECTURE_CACHE_MAX_ENTRIES = Number.parseInt(process.env.ARCHITECTURE_CACHE_MAX_ENTRIES || '100', 10);
const architectureAnalysisCache = new Map();

const pruneArchitectureMemoryCache = () => {
  const now = Date.now();

  for (const [cacheId, cacheEntry] of architectureAnalysisCache.entries()) {
    if (!cacheEntry || cacheEntry.expiresAt <= now) {
      architectureAnalysisCache.delete(cacheId);
    }
  }

  while (architectureAnalysisCache.size > ARCHITECTURE_CACHE_MAX_ENTRIES) {
    const oldestKey = architectureAnalysisCache.keys().next().value;
    if (!oldestKey) break;
    architectureAnalysisCache.delete(oldestKey);
  }
};


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

const logPath = path.join(__dirname, '../debug_architecture.log');
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

logStream.on('error', (err) => {
  console.error('[DEBUG] Failed to write to log file:', err);
});

const logDebug = (message) => {
  const timestamp = new Date().toISOString();
  logStream.write(`[${timestamp}] ${message}\n`);
  console.log(`[DEBUG] ${message}`);
};

const makeArchitectureCacheId = (projectId, repoCacheKey) => `${projectId}:${repoCacheKey}`;

const getArchitectureFromMemoryCache = (projectId, repoCacheKey) => {
  pruneArchitectureMemoryCache();
  if (!projectId || !repoCacheKey) return null;
  const cacheId = makeArchitectureCacheId(projectId, repoCacheKey);
  const cacheEntry = architectureAnalysisCache.get(cacheId);
  if (!cacheEntry) return null;

  if (cacheEntry.expiresAt <= Date.now()) {
    architectureAnalysisCache.delete(cacheId);
    return null;
  }

  return cacheEntry.architecture;
};

const setArchitectureInMemoryCache = (projectId, repoCacheKey, architecture) => {
  if (!projectId || !repoCacheKey || !architecture) return;
  pruneArchitectureMemoryCache();
  const cacheId = makeArchitectureCacheId(projectId, repoCacheKey);
  architectureAnalysisCache.set(cacheId, {
    architecture,
    expiresAt: Date.now() + ARCHITECTURE_CACHE_TTL_MS,
  });
  pruneArchitectureMemoryCache();
};

const buildRepoFreshnessKey = async (accessToken, owner, repo) => {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github.v3+json'
  };

  const repoRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  const repoData = repoRes.data || {};

  return [
    repoData.full_name || `${owner}/${repo}`,
    repoData.default_branch || '',
    repoData.pushed_at || '',
    repoData.updated_at || ''
  ].join('|');
};

const buildInstallationOctokitFromOwner = async (ownerUid) => {
  const ownerUser = await User.findOne({ uid: ownerUid }).lean();
  const installationId = ownerUser?.githubIntegration?.installationId;
  const appId = process.env.GITHUB_APP_ID;
  let privateKey = process.env.GITHUB_PRIVATE_KEY;

  if (!installationId || !appId || !privateKey) {
    throw new Error('Missing GitHub App installation/configuration for owner');
  }

  privateKey = privateKey.replace(/\\n/g, '\n');
  const { App } = await import('octokit');
  const app = new App({ appId, privateKey });
  return app.getInstallationOctokit(Number.parseInt(installationId, 10));
};

const getTeamUidsForUser = async (uid) => {
  const teams = await Team.find({ members: uid }).select('members').lean();
  return [...new Set(teams.flatMap((team) => team.members || []))];
};


const fetchRepoContext = async (accessToken, owner, repo) => {
  logDebug(`Fetching repo context for ${owner}/${repo}`);
  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json'
    };

    logDebug(`Requesting file tree...`);
    const treeResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents`, { headers });
    const files = treeResponse.data.map(f => f.name);
    logDebug(`Found files: ${files.join(', ')}`);

    let context = `Repository File Structure (Root):\n${files.join('\n')}\n\n`;

    const interestingFiles = ['package.json', 'requirements.txt', 'go.mod', 'README.md', 'schema.prisma', 'Genre.js', 'App.js', 'server.js', 'index.js'];

    const filePromises = interestingFiles
      .filter(file => files.includes(file))
      .map(async (file) => {
        try {
          logDebug(`Fetching content of ${file}...`);
          const contentRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${file}`, { headers });
          if (contentRes.data.content) {
            const content = Buffer.from(contentRes.data.content, 'base64').toString('utf-8');
            return `\n--- Content of ${file} ---\n${content.substring(0, 5000)}\n----------------------\n`;
          }
        } catch (e) {
          logDebug(`Failed to fetch ${file}: ${e.message}`);
          return '';
        }
        return '';
      });

    const fileContents = await Promise.all(filePromises);
    context += fileContents.join('');

    logDebug(`Context prepared. Length: ${context.length} chars`);
    return context;
  } catch (error) {
    logDebug(`Error fetching repo context: ${error.message}`);
    if (error.response) logDebug(`Response data: ${JSON.stringify(error.response.data)}`);
    return "Failed to fetch repository context.";
  }
};


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
    throw error;
  }
};


router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, githubRepoName, githubRepoOwner } = req.body;
    const ownerUid = req.user.uid;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const owner = await User.findOne({ uid: ownerUid }).lean();
    if (!owner) return res.status(404).json({ message: 'User not found' });

    const defaultSteps = [
      { title: 'Planning', description: 'Initial requirements and design', type: 'Design', order: 0 },
      { title: 'Frontend', description: 'Client-side implementation', type: 'Frontend', order: 1 },
      { title: 'Backend', description: 'Server-side logic and APIs', type: 'Backend', order: 2 },
      { title: 'Database', description: 'Schema design and data management', type: 'Database', order: 3 },
      { title: 'Deployment', description: 'CI/CD and hosting setup', type: 'Other', order: 4 }
    ];

    const newProject = await Project.create({
      name,
      description: description || 'No description',
      ownerId: owner._id,
      ownerUid: owner.uid,
      githubRepoName,
      githubRepoOwner,
      isTrackingActive: !!(githubRepoName && githubRepoOwner),
    });

    // Create default steps (bulk insert)
    await Step.insertMany(defaultSteps.map(s => ({ ...s, projectId: newProject._id })));

    const result = await getProjectWithSteps(newProject._id);
    cache.invalidate(`projects:${ownerUid}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Failed to create project', error: error.message });
  }
});


router.post('/:id/analyze-architecture', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const forceRefresh = req.query.forceRefresh === 'true' || req.body?.forceRefresh === true;
    const project = await Project.findById(id).lean();

    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.ownerUid !== req.user.uid) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { githubRepoName, githubRepoOwner } = project;

    if (!githubRepoName || !githubRepoOwner) {
      return res.status(400).json({ message: 'Project is not linked to a GitHub repository' });
    }

    const owner = await User.findById(project.ownerId).lean();
    const github = owner?.githubIntegration;
    if (!github?.accessToken) {
      return res.status(400).json({ message: 'Owner is not connected to GitHub' });
    }

    const accessToken = decryptToken(github.accessToken);
    if (!accessToken) {
      return res.status(500).json({ message: 'Failed to decrypt GitHub token' });
    }

    let repoCacheKey = null;
    try {
      repoCacheKey = await buildRepoFreshnessKey(accessToken, githubRepoOwner, githubRepoName);
    } catch (cacheKeyError) {
      logDebug(`Failed to build repo freshness key: ${cacheKeyError.message}`);
    }

    if (!forceRefresh && repoCacheKey) {
      const memoryCachedArch = getArchitectureFromMemoryCache(id, repoCacheKey);
      if (memoryCachedArch) {
        await Project.updateOne(
          { _id: id },
          { $set: { architecture: memoryCachedArch, architectureCacheKey: repoCacheKey } }
        );
        const cachedProject = await getProjectWithSteps(id);
        return res.json(cachedProject);
      }

      if (project.architecture && project.architectureCacheKey === repoCacheKey) {
        setArchitectureInMemoryCache(id, repoCacheKey, project.architecture);
        const cachedProject = await getProjectWithSteps(id);
        return res.json(cachedProject);
      }
    }

    console.log(`Analyzing GitHub Repo: ${githubRepoOwner}/${githubRepoName}...`);
    const context = await fetchRepoContext(accessToken, githubRepoOwner, githubRepoName);
    const analyzedArch = await analyzeWithGemini(context, project.name);

    console.log("Analysis Result:", JSON.stringify(analyzedArch, null, 2));

    if (analyzedArch && Object.keys(analyzedArch).length > 0) {
      const updates = {
        architecture: analyzedArch,
        architectureAnalyzedAt: new Date(),
      };
      if (repoCacheKey) {
        updates.architectureCacheKey = repoCacheKey;
        setArchitectureInMemoryCache(id, repoCacheKey, analyzedArch);
      }

      await Project.updateOne({ _id: id }, { $set: updates });
      console.log("Project architecture saved successfully.");
      const updatedProject = await getProjectWithSteps(id);
      invalidateProjectCache(project);
      return res.json(updatedProject);
    }

    console.warn("Analysis returned empty or null.");
    const full = await getProjectWithSteps(id);
    invalidateProjectCache(project);
    res.json(full);
  } catch (error) {
    console.error("Architecture analysis failed:", error);
    res.status(500).json({ message: 'Failed to analyze architecture', error: error.message });
  }
});

router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    const ownerUid = req.user.uid;

    if (!name || !description) {
      return res.status(400).json({ message: 'Name and description are required' });
    }

    const owner = await User.findOne({ uid: ownerUid }).lean();
    if (!owner) return res.status(404).json({ message: 'User not found' });

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

      Ensure the steps are ordered logically for development. Each step should act as a phase and contain multiple granular tasks.
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

    const newProject = await Project.create({
      name,
      description,
      ownerId: owner._id,
      ownerUid: owner.uid,
      architecture: generatedData.architecture || {},
      team: [],
    });

    // Create steps and tasks (bulk insert)
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
    cache.invalidate(`projects:${ownerUid}`);
    res.status(201).json(fullProject);

  } catch (error) {
    console.error('Error generating project:', error);
    res.status(500).json({ message: 'Failed to generate project', error: error.message });
  }
});


router.get('/', authMiddleware, async (req, res) => {
  try {
    const ownerUid = req.user.uid;
    const cacheKey = `projects:${ownerUid}`;

    const cached = await cache.getJson(cacheKey);
    if (cached) return res.json(cached);

    // Fetch owned/team projects and assigned tasks in parallel
    const [projects, assignedTasks] = await Promise.all([
      getProjectsWithSteps({
        $or: [
          { ownerUid },
          { team: ownerUid }
        ]
      }),
      ProjectTask.find({ assignedTo: ownerUid }).select('stepId').lean()
    ]);
    const assignedStepIds = [...new Set(assignedTasks.map(t => t.stepId.toString()))];

    let assignedProjects = [];
    if (assignedStepIds.length > 0) {
      const assignedSteps = await Step.find({ _id: { $in: assignedStepIds } }).select('projectId').lean();
      const assignedProjectIds = [...new Set(assignedSteps.map(s => s.projectId.toString()))];

      if (assignedProjectIds.length > 0) {
        assignedProjects = await getProjectsWithSteps({
          _id: { $in: assignedProjectIds }
        });
      }
    }

    // Merge and deduplicate
    const projectMap = new Map();
    [...projects, ...assignedProjects].forEach(p => projectMap.set(p.id, p));
    const allProjects = Array.from(projectMap.values());
    const { items, pagination } = paginateArray(allProjects, req.query);
    setPaginationHeaders(res, pagination);

    cache.setJson(cacheKey, allProjects, 60);
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


router.post('/:id/team', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    const project = await Project.findById(req.params.id).lean();

    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.ownerUid !== req.user.uid) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (!project.team.includes(userId) && project.ownerUid !== userId) {
      const newTeam = [...project.team, userId];
      await Project.updateOne({ _id: req.params.id }, { $set: { team: newTeam } });
    }

    const full = await getProjectWithSteps(req.params.id);
    invalidateProjectCache({ ownerUid: project.ownerUid, team: [...project.team, userId] });
    res.json(full);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.ownerUid !== req.user.uid && !project.team.includes(req.user.uid)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const stepCount = await Step.countDocuments({ projectId: project._id });
    if (stepCount === 0) {
      const defaultSteps = [
        { title: 'Planning', description: 'Initial requirements and design', type: 'Design', order: 0, projectId: project._id },
        { title: 'Frontend', description: 'Client-side implementation', type: 'Frontend', order: 1, projectId: project._id },
        { title: 'Backend', description: 'Server-side logic and APIs', type: 'Backend', order: 2, projectId: project._id },
        { title: 'Database', description: 'Schema design and data management', type: 'Database', order: 3, projectId: project._id },
        { title: 'Deployment', description: 'CI/CD and hosting setup', type: 'Other', order: 4, projectId: project._id }
      ];
      await Step.insertMany(defaultSteps);
    }

    const full = await getProjectWithSteps(req.params.id);
    res.json(full);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.ownerUid !== req.user.uid) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Delete tasks, steps, then project
    const steps = await Step.find({ projectId: project._id }).select('_id').lean();
    const stepIds = steps.map(s => s._id);
    if (stepIds.length > 0) {
      await ProjectTask.deleteMany({ stepId: { $in: stepIds } });
    }
    await Step.deleteMany({ projectId: project._id });
    await Project.findByIdAndDelete(req.params.id);

    invalidateProjectCache(project);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.ownerUid !== req.user.uid && !project.team.includes(req.user.uid)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const updates = req.body;
    const allowedUpdates = ['name', 'description', 'githubRepoName', 'githubRepoOwner', 'isTrackingActive'];
    const filteredUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    await Project.updateOne({ _id: id }, { $set: filteredUpdates });

    const updatedProject = await getProjectWithSteps(id);
    invalidateProjectCache(project);
    res.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


router.post('/:projectId/steps/:stepId/tasks', authMiddleware, async (req, res) => {
  try {
    const { projectId, stepId } = req.params;
    const { title, description, assignedTo, assignedToName, assignedBy } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    const project = await Project.findById(projectId).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.ownerUid !== req.user.uid && !project.team.includes(req.user.uid)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const step = await Step.findOne({ _id: stepId, projectId: project._id }).lean();
    if (!step) return res.status(404).json({ message: 'Step not found' });

    // Send assignment email
    if (assignedTo) {
      const assigneeUser = await User.findOne({ uid: assignedTo }).lean();
      if (assigneeUser && assigneeUser.email) {
        const subject = `New Task Assigned: ${title}`;
        const text = `You have been assigned a new task in project "${project.name}".\n\nTask: ${title}\nDescription: ${description || 'No description'}\nAssigned By: ${assignedBy || 'Admin'}`;
        const html = getTaskAssignmentEmailHtml({
          projectName: project.name,
          lines: [
            { label: 'Step', value: step.title },
            { label: 'Task', value: title },
            { label: 'Description', value: description || 'No description' },
            { label: 'Assigned By', value: assignedBy || 'Admin' },
          ],
        });
        try {
          await sendZyncEmail(assigneeUser.email, subject, html, text);
        } catch (emailError) {
          console.error("Failed to send assignment email:", emailError);
        }
      }
    }

    await ProjectTask.create({
      title,
      description: description || null,
      status: 'Pending',
      assignedTo,
      assignedToName,
      assignedBy: assignedBy || 'Admin',
      createdBy: req.user ? req.user.uid : (assignedBy || 'Admin'),
      stepId
    });

    const updatedProject = await getProjectWithSteps(projectId);
    invalidateProjectCache(project);
    res.status(201).json(updatedProject);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


router.put('/:projectId/steps/:stepId/tasks/:taskId', authMiddleware, async (req, res) => {
  try {
    const { projectId, stepId, taskId } = req.params;
    const { status, assignedTo, assignedToName, assignedBy } = req.body;

    const project = await Project.findById(projectId).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.ownerUid !== req.user.uid && !project.team.includes(req.user.uid)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const step = await Step.findOne({ _id: stepId, projectId: project._id }).lean();
    if (!step) return res.status(404).json({ message: 'Step not found' });

    const task = await ProjectTask.findOne({ _id: taskId, stepId }).lean();
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const taskUpdate = {};
    if (status) taskUpdate.status = status;

    if (assignedTo !== undefined) {
      const oldAssignee = task.assignedTo;
      taskUpdate.assignedTo = assignedTo;
      taskUpdate.assignedToName = assignedToName;

      if (assignedTo && assignedTo !== oldAssignee) {
        const assigneeUser = await User.findOne({ uid: assignedTo }).lean();

        if (assigneeUser && assigneeUser.email) {
          const subject = `New Task Assigned: ${task.title}`;
          const text = `You have been assigned a new task in project "${project.name}".\n\nStep: ${step.title}\nTask: ${task.title}\nAssigned By: ${assignedBy || 'Admin'}`;
          const html = getTaskAssignmentEmailHtml({
            projectName: project.name,
            lines: [
              { label: 'Task', value: task.title },
              { label: 'Step', value: step.title },
              { label: 'Assigned By', value: assignedBy || 'Admin' },
            ],
          });

          try {
            await sendZyncEmail(assigneeUser.email, subject, html, text);
          } catch (emailError) {
            console.error("Failed to send assignment email:", emailError);
          }
        }
      }
    }

    await ProjectTask.updateOne({ _id: taskId }, { $set: taskUpdate });

    const updatedProject = await getProjectWithSteps(projectId);

    req.app.get('io').emit('projectUpdate', {
      projectId: updatedProject.id,
      project: updatedProject
    });

    invalidateProjectCache(project);
    res.json(updatedProject);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


router.delete('/:projectId/steps/:stepId/tasks/:taskId', authMiddleware, async (req, res) => {
  try {
    const { projectId, stepId, taskId } = req.params;
    const userId = req.user ? req.user.uid : null;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const project = await Project.findById(projectId).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.ownerUid !== userId) {
      return res.status(403).json({ message: 'Permission denied. Only the project owner can delete tasks.' });
    }

    const task = await ProjectTask.findOne({ _id: taskId, stepId }).lean();
    if (!task) return res.status(404).json({ message: 'Task not found' });

    await ProjectTask.findByIdAndDelete(taskId);

    const updatedProject = await getProjectWithSteps(projectId);

    req.app.get('io').emit('projectUpdate', {
      projectId: updatedProject.id,
      project: updatedProject
    });

    res.json({ message: 'Task deleted successfully', projectId, stepId, taskId });
    invalidateProjectCache(project);
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/tasks/search', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.uid;

    if (!query) return res.json([]);

    // Get all projects user has access to
    const ownedProjects = await Project.find({ ownerUid: userId }).select('_id name').lean();
    const teamProjects = await Project.find({ team: userId }).select('_id name').lean();

    // Get projects via task assignment
    const assignedTasks = await ProjectTask.find({ assignedTo: userId }).select('stepId').lean();
    const assignedStepIds = [...new Set(assignedTasks.map(t => t.stepId.toString()))];
    let assignedProjectIds = [];
    if (assignedStepIds.length > 0) {
      const assignedSteps = await Step.find({ _id: { $in: assignedStepIds } }).select('projectId').lean();
      assignedProjectIds = assignedSteps.map(s => s.projectId.toString());
    }
    const assignedProjectDocs = assignedProjectIds.length > 0
      ? await Project.find({ _id: { $in: assignedProjectIds } }).select('_id name').lean()
      : [];

    const projectMap = new Map();
    [...ownedProjects, ...teamProjects, ...assignedProjectDocs].forEach(p => projectMap.set(p._id.toString(), p));
    const projectIds = Array.from(projectMap.keys());

    if (projectIds.length === 0) return res.json([]);

    // Get steps for these projects
    const steps = await Step.find({ projectId: { $in: projectIds } }).lean();
    const stepMap = new Map();
    steps.forEach(s => stepMap.set(s._id.toString(), s));

    const stepIds = steps.map(s => s._id);

    // Search tasks using MongoDB $regex instead of in-memory filtering
    const matchedTasks = await ProjectTask.find({
      stepId: { $in: stepIds },
      title: { $regex: query, $options: 'i' }
    }).limit(10).lean();

    const results = matchedTasks.map(task => {
      const step = stepMap.get(task.stepId.toString());
      const proj = step ? projectMap.get(step.projectId.toString()) : null;
      return {
        id: task._id.toString(),
        title: task.title,
        projectId: proj?._id?.toString() || '',
        projectName: proj?.name || '',
        status: task.status,
        stepName: step?.title || ''
      };
    });

    const { items, pagination } = paginateArray(results, req.query, { defaultLimit: 10, maxLimit: 50 });
    setPaginationHeaders(res, pagination);

    res.json(items);
  } catch (error) {
    console.error('Error searching tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/:projectId/quick-task', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, assignedTo, assignedToName } = req.body;

    const project = await Project.findById(projectId).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.ownerUid !== req.user.uid && !project.team.includes(req.user.uid)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const steps = await Step.find({ projectId: project._id }).sort({ order: 1 }).lean();

    let step = steps.find(s =>
      s.title.toLowerCase().includes('backlog') ||
      s.title.toLowerCase().includes('planning') ||
      s.title.toLowerCase().includes('general')
    );

    if (!step && steps.length > 0) {
      step = steps[0];
    }

    if (!step) {
      const created = await Step.create({
        title: 'Backlog',
        description: 'Auto-generated backlog',
        type: 'Other',
        order: 0,
        projectId: project._id
      });
      step = created.toObject();
    }

    const newTask = await ProjectTask.create({
      title,
      description: description || null,
      status: 'Backlog',
      assignedTo,
      assignedToName,
      assignedBy: req.user?.name || 'Admin',
      createdBy: req.user ? req.user.uid : 'Admin',
      stepId: step._id
    });

    if (assignedTo) {
      const assigneeUser = await User.findOne({ uid: assignedTo }).lean();
      if (assigneeUser && assigneeUser.email) {
        const subject = `New Task Assigned: ${newTask.title}`;
        const text = `You have been assigned a new task in project "${project.name}".\n\nTask: ${newTask.title}\nDescription: ${newTask.description || 'No description'}\nAssigned By: Admin`;
        const html = getTaskAssignmentEmailHtml({
          projectName: project.name,
          lines: [
            { label: 'Task', value: newTask.title },
            { label: 'Description', value: newTask.description || 'No description' },
            { label: 'Assigned By', value: 'Admin' },
          ],
        });
        try {
          await sendZyncEmail(assigneeUser.email, subject, html, text);
        } catch (emailError) {
          console.error("Failed to send assignment email:", emailError);
        }
      }
    }

    const updatedProject = await getProjectWithSteps(projectId);
    const taskObj = normalizeDoc(newTask.toObject());

    invalidateProjectCache(project);
    res.json({ message: 'Task created', task: taskObj, stepId: step._id?.toString() || step.id, project: updatedProject });
  } catch (error) {
    console.error('Error creating quick task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:projectId/collaborator-assignees', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const requesterUid = req.user.uid;

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const cacheKey = `collaborator-assignees:${projectId}:${requesterUid}`;

    try {
      const cached = await cache.getJson(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    } catch (cacheReadError) {
      console.warn(`[Cache] collaborator-assignees read failed for ${cacheKey}:`, cacheReadError.message);
    }

    const project = await Project.findById(projectId).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.ownerUid !== requesterUid) {
      return res.status(403).json({ message: 'Only the repository owner can manage collaborators' });
    }

    if (!project.githubRepoOwner || !project.githubRepoName) {
      return res.status(400).json({ message: 'Project is not linked to a GitHub repository' });
    }

    const requester = await User.findOne({ uid: requesterUid }).select('connections').lean();
    const connectionsUids = requester?.connections || [];
    const projectTeamUids = project.team || [];
    const teamUids = await getTeamUidsForUser(requesterUid);

    const allAssignableUids = [...new Set([
      ...teamUids,
      ...connectionsUids,
      ...projectTeamUids
    ])].filter(uid => uid !== requesterUid);

    const assignableUsers = await User.find({ uid: { $in: allAssignableUids } })
      .select('uid displayName email photoURL githubIntegration.username')
      .lean();

    const connectedTeamUsers = assignableUsers.filter((u) => u?.githubIntegration?.username);

    const octokit = await buildInstallationOctokitFromOwner(requesterUid);
    const collaboratorsResponse = await octokit.request('GET /repos/{owner}/{repo}/collaborators', {
      owner: project.githubRepoOwner,
      repo: project.githubRepoName,
      affiliation: 'all',
      per_page: 100,
    });

    const collaboratorLogins = new Set(
      (collaboratorsResponse.data || []).map((c) => String(c.login || '').toLowerCase())
    );

    const activeCollaborators = connectedTeamUsers
      .filter((u) => collaboratorLogins.has(String(u.githubIntegration.username).toLowerCase()))
      .map((u) => ({
        uid: u.uid,
        displayName: u.displayName,
        email: u.email,
        photoURL: u.photoURL,
        githubUsername: u.githubIntegration.username,
      }));

    const availableTeamMembers = assignableUsers
      .filter((u) => {
        const gh = String(u?.githubIntegration?.username || '').toLowerCase();
        return !gh || !collaboratorLogins.has(gh);
      })
      .map((u) => ({
        uid: u.uid,
        displayName: u.displayName,
        email: u.email,
        photoURL: u.photoURL,
        githubUsername: u.githubIntegration?.username || null,
        canInvite: Boolean(u.githubIntegration?.username),
        inviteDisabledReason: u.githubIntegration?.username
          ? null
          : 'User has not connected GitHub yet',
      }));

    const responsePayload = {
      activeCollaborators,
      availableTeamMembers,
    };

    try {
      await cache.setJson(cacheKey, responsePayload, 60);
    } catch (cacheWriteError) {
      console.warn(`[Cache] collaborator-assignees write failed for ${cacheKey}:`, cacheWriteError.message);
    }

    return res.json(responsePayload);
  } catch (error) {
    console.error('Error fetching collaborator assignees:', error);
    return res.status(500).json({ message: 'Failed to fetch collaborator assignees', error: error.message });
  }
});

router.post('/:projectId/invite-collaborator', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body || {};
    const requesterUid = req.user.uid;

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    if (userId === requesterUid) {
      return res.status(400).json({ message: 'You cannot invite yourself' });
    }

    const project = await Project.findById(projectId).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.ownerUid !== requesterUid) {
      return res.status(403).json({ message: 'Only the repository owner can invite collaborators' });
    }

    if (!project.githubRepoOwner || !project.githubRepoName) {
      return res.status(400).json({ message: 'Project is not linked to a GitHub repository' });
    }

    const requester = await User.findOne({ uid: requesterUid }).select('connections').lean();
    const connectionsUids = requester?.connections || [];
    const projectTeamUids = project.team || [];
    const teamUids = await getTeamUidsForUser(requesterUid);

    const allAssignableUids = [...new Set([
      ...teamUids,
      ...connectionsUids,
      ...projectTeamUids
    ])];

    if (!allAssignableUids.includes(userId)) {
      return res.status(400).json({ message: 'Selected user is not in your team, connections, or project team' });
    }

    const assignee = await User.findOne({ uid: userId }).select('uid displayName email photoURL githubIntegration.username').lean();
    if (!assignee?.githubIntegration?.username) {
      return res.status(400).json({ message: 'Selected user is not connected to GitHub' });
    }

    const octokit = await buildInstallationOctokitFromOwner(requesterUid);

    let alreadyCollaborator = false;
    try {
      await octokit.request('PUT /repos/{owner}/{repo}/collaborators/{username}', {
        owner: project.githubRepoOwner,
        repo: project.githubRepoName,
        username: assignee.githubIntegration.username,
        permission: 'push',
      });
    } catch (inviteError) {
      const status = inviteError?.status || inviteError?.response?.status;
      const message = inviteError?.response?.data?.message || inviteError?.message || '';
      if (status === 422 && /already.*collaborator/i.test(message)) {
        alreadyCollaborator = true;
      } else {
        throw inviteError;
      }
    }

    try {
      await cache.invalidate(`collaborator-assignees:${projectId}:${requesterUid}`);
    } catch (cacheInvalidateError) {
      console.warn(`[Cache] collaborator-assignees invalidate failed for ${projectId}:${requesterUid}:`, cacheInvalidateError.message);
    }

    return res.status(200).json({
      message: alreadyCollaborator
        ? 'User is already a collaborator on this repository.'
        : 'Repository invite sent successfully.',
      alreadyCollaborator,
      user: {
        uid: assignee.uid,
        displayName: assignee.displayName,
        email: assignee.email,
        photoURL: assignee.photoURL,
        githubUsername: assignee.githubIntegration.username,
      },
    });
  } catch (error) {
    console.error('Error inviting repository collaborator:', error);
    return res.status(500).json({ message: 'Failed to invite collaborator', error: error.message });
  }
});

module.exports = router;
