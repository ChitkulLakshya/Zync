/**
 * @fileoverview projectRoutes.js
 * @module projectRoutes
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Server-Side API & Business Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
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
const {
  getProjectWithSteps,
  getProjectsWithSteps,
} = require('../utils/projectHelper');
const cache = require('../utils/cache');

async function invalidateProjectCache(project) {
  if (!project) return;
  const uids = [project.ownerUid, ...(project.team || [])];
  const keys = uids.map((uid) => `projects:${uid}`);
  await cache.invalidate(...keys);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_SECONDARY);
const MODEL_NAME = 'gemini-2.5-flash';
console.log(`[Config] Using Gemini Model: ${MODEL_NAME}`);
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ARCHITECTURE_CACHE_TTL_MS = Number.parseInt(
  process.env.ARCHITECTURE_CACHE_TTL_MS || '21600000',
  10
);
const ARCHITECTURE_CACHE_MAX_ENTRIES = Number.parseInt(
  process.env.ARCHITECTURE_CACHE_MAX_ENTRIES || '100',
  10
);
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
    console.error('Token decryption failed:', error);
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

const makeArchitectureCacheId = (projectId, repoCacheKey) =>
  `${projectId}:${repoCacheKey}`;

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

const setArchitectureInMemoryCache = (
  projectId,
  repoCacheKey,
  architecture
) => {
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
    Accept: 'application/vnd.github.v3+json',
  };

  const repoRes = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}`,
    { headers }
  );
  const repoData = repoRes.data || {};

  return [
    repoData.full_name || `${owner}/${repo}`,
    repoData.default_branch || '',
    repoData.pushed_at || '',
    repoData.updated_at || '',
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

const slugify = (text) => (text || '').toString().toLowerCase().trim().replace(/[\s\W-]+/g, '-').replace(/^-+|-+$/g, '');

const handleTaskAssignment = async (project, task, assignedTo, assignedToName) => {
  const taskUpdate = {
    assignedTo,
    assignedToName
  };

  // Only create branch if there is a github repo linked and the task doesn't already have one
  if (project.githubRepoOwner && project.githubRepoName && !task.githubBranchName) {
    try {
      const octokit = await buildInstallationOctokitFromOwner(project.ownerUid);
      
      // Fetch default branch SHA
      const repoRes = await octokit.request('GET /repos/{owner}/{repo}', {
        owner: project.githubRepoOwner,
        repo: project.githubRepoName
      });
      const defaultBranch = repoRes.data.default_branch;
      
      const refRes = await octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
        owner: project.githubRepoOwner,
        repo: project.githubRepoName,
        ref: `heads/${defaultBranch}`
      });
      const sha = refRes.data.object.sha;

      const slug = slugify(task.title).substring(0, 30);
      const branchName = `task/${slug}-${task._id}`;
      
      await octokit.request('POST /repos/{owner}/{repo}/git/refs', {
        owner: project.githubRepoOwner,
        repo: project.githubRepoName,
        ref: `refs/heads/${branchName}`,
        sha: sha
      });

      taskUpdate.githubBranchName = branchName;
      taskUpdate.completionCommitMessage = `Complete Task: ${task._id}`;
    } catch (err) {
      console.error('Failed to create task branch on GitHub:', err.message);
      // We don't fail the assignment if branch creation fails
    }
  }

  return taskUpdate;
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
      Accept: 'application/vnd.github.v3+json',
    };

    logDebug(`Requesting file tree...`);
    const treeResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents`,
      { headers }
    );
    const files = treeResponse.data.map((f) => f.name);
    logDebug(`Found files: ${files.join(', ')}`);

    let context = `Repository File Structure (Root):\n${files.join('\n')}\n\n`;

    const interestingFiles = [
      'package.json',
      'requirements.txt',
      'go.mod',
      'README.md',
      'schema.prisma',
      'Genre.js',
      'App.js',
      'server.js',
      'index.js',
    ];

    const filePromises = interestingFiles
      .filter((file) => files.includes(file))
      .map(async (file) => {
        try {
          logDebug(`Fetching content of ${file}...`);
          const contentRes = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/contents/${file}`,
            { headers }
          );
          if (contentRes.data.content) {
            const content = Buffer.from(
              contentRes.data.content,
              'base64'
            ).toString('utf-8');
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
    if (error.response)
      logDebug(`Response data: ${JSON.stringify(error.response.data)}`);
    return 'Failed to fetch repository context.';
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

    const jsonString = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    logDebug(`Gemini response received. Length: ${jsonString.length}`);

    const parsed = JSON.parse(jsonString);
    logDebug(`Parsed JSON keys: ${Object.keys(parsed).join(', ')}`);
    return parsed;
  } catch (error) {
    logDebug(`Gemini analysis failed: ${error.message}`);
    throw error;
  }
};

router.post('/new-repo', authMiddleware, async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    const ownerUid = req.user.uid;

    if (!name) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    const owner = await User.findOne({ uid: ownerUid }).lean();
    if (!owner) return res.status(404).json({ message: 'User not found' });

    const github = owner.githubIntegration;
    if (!github || !github.connected || !github.accessToken) {
      return res.status(400).json({ message: 'GitHub account is not connected. Please connect it first.' });
    }

    const decryptedAccessToken = decryptToken(github.accessToken);
    if (!decryptedAccessToken) {
      return res.status(500).json({ message: 'Failed to decrypt GitHub access token' });
    }

    let githubRepoName = '';
    let githubRepoOwner = '';

    try {
      const response = await axios.post(
        'https://api.github.com/user/repos',
        {
          name: name,
          description: description || '',
          private: !!isPrivate,
          auto_init: true
        },
        {
          headers: {
            Authorization: `Bearer ${decryptedAccessToken}`,
            Accept: 'application/vnd.github.v3+json',
          }
        }
      );
      githubRepoName = response.data.name;
      githubRepoOwner = response.data.owner.login;
      await cache.invalidate(`gh:user-repos:${ownerUid}`);
    } catch (ghError) {
      console.error('Failed to create GitHub repository:', ghError.response?.data || ghError.message);
      return res.status(400).json({ message: 'Failed to create GitHub repository', error: ghError.response?.data?.message || ghError.message });
    }

    const defaultSteps = [
      { title: 'Planning', description: 'Initial requirements and design', type: 'Design', order: 0 },
      { title: 'Frontend', description: 'Client-side implementation', type: 'Frontend', order: 1 },
      { title: 'Backend', description: 'Server-side logic and APIs', type: 'Backend', order: 2 },
      { title: 'Database', description: 'Schema design and data management', type: 'Database', order: 3 },
      { title: 'Deployment', description: 'CI/CD and hosting setup', type: 'Other', order: 4 },
    ];

    const newProject = await Project.create({
      name,
      description: description || 'No description',
      ownerId: owner._id,
      ownerUid: owner.uid,
      githubRepoName,
      githubRepoOwner,
      isTrackingActive: true,
    });

    await Step.insertMany(
      defaultSteps.map((s) => ({ ...s, projectId: newProject._id }))
    );

    const result = await getProjectWithSteps(newProject._id);
    cache.invalidate(`projects:${ownerUid}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating project with new repo:', error);
    res.status(500).json({ message: 'Failed to create project', error: error.message });
  }
});

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
      {
        title: 'Planning',
        description: 'Initial requirements and design',
        type: 'Design',
        order: 0,
      },
      {
        title: 'Frontend',
        description: 'Client-side implementation',
        type: 'Frontend',
        order: 1,
      },
      {
        title: 'Backend',
        description: 'Server-side logic and APIs',
        type: 'Backend',
        order: 2,
      },
      {
        title: 'Database',
        description: 'Schema design and data management',
        type: 'Database',
        order: 3,
      },
      {
        title: 'Deployment',
        description: 'CI/CD and hosting setup',
        type: 'Other',
        order: 4,
      },
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


    await Step.insertMany(
      defaultSteps.map((s) => ({ ...s, projectId: newProject._id }))
    );

    const result = await getProjectWithSteps(newProject._id);
    cache.invalidate(`projects:${ownerUid}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating project:', error);
    res
      .status(500)
      .json({ message: 'Failed to create project', error: error.message });
  }
});

router.post('/:id/analyze-architecture', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const forceRefresh =
      req.query.forceRefresh === 'true' || req.body?.forceRefresh === true;
    const project = await Project.findById(id).lean();

    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.ownerUid !== req.user.uid) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { githubRepoName, githubRepoOwner } = project;

    if (!githubRepoName || !githubRepoOwner) {
      return res
        .status(400)
        .json({ message: 'Project is not linked to a GitHub repository' });
    }

    const owner = await User.findById(project.ownerId).lean();
    const github = owner?.githubIntegration;
    if (!github?.accessToken) {
      return res
        .status(400)
        .json({ message: 'Owner is not connected to GitHub' });
    }

    const accessToken = decryptToken(github.accessToken);
    if (!accessToken) {
      return res
        .status(500)
        .json({ message: 'Failed to decrypt GitHub token' });
    }

    let repoCacheKey = null;
    try {
      repoCacheKey = await buildRepoFreshnessKey(
        accessToken,
        githubRepoOwner,
        githubRepoName
      );
    } catch (cacheKeyError) {
      logDebug(`Failed to build repo freshness key: ${cacheKeyError.message}`);
    }

    if (!forceRefresh && repoCacheKey) {
      const memoryCachedArch = getArchitectureFromMemoryCache(id, repoCacheKey);
      if (memoryCachedArch) {
        await Project.updateOne(
          { _id: id },
          {
            $set: {
              architecture: memoryCachedArch,
              architectureCacheKey: repoCacheKey,
            },
          }
        );
        const cachedProject = await getProjectWithSteps(id);
        return res.json(cachedProject);
      }

      if (
        project.architecture &&
        project.architectureCacheKey === repoCacheKey
      ) {
        setArchitectureInMemoryCache(id, repoCacheKey, project.architecture);
        const cachedProject = await getProjectWithSteps(id);
        return res.json(cachedProject);
      }
    }

    console.log(
      `Analyzing GitHub Repo: ${githubRepoOwner}/${githubRepoName}...`
    );
    const context = await fetchRepoContext(
      accessToken,
      githubRepoOwner,
      githubRepoName
    );
    const analyzedArch = await analyzeWithGemini(context, project.name);

    console.log('Analysis Result:', JSON.stringify(analyzedArch, null, 2));

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
      console.log('Project architecture saved successfully.');
      const updatedProject = await getProjectWithSteps(id);
      invalidateProjectCache(project);
      return res.json(updatedProject);
    }

    console.warn('Analysis returned empty or null.');
    const full = await getProjectWithSteps(id);
    invalidateProjectCache(project);
    res.json(full);
  } catch (error) {
    console.error('Architecture analysis failed:', error);
    res
      .status(500)
      .json({
        message: 'Failed to analyze architecture',
        error: error.message,
      });
  }
});

router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    const ownerUid = req.user.uid;

    if (!name || !description) {
      return res
        .status(400)
        .json({ message: 'Name and description are required' });
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

    const jsonString = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    let generatedData;
    try {
      generatedData = JSON.parse(jsonString);
    } catch (e) {
      console.error('Failed to parse Gemini response:', jsonString);
      return res
        .status(500)
        .json({
          message: 'Failed to generate valid project structure',
          error: e.message,
        });
    }

    const newProject = await Project.create({
      name,
      description,
      ownerId: owner._id,
      ownerUid: owner.uid,
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
      stepsData[i].tasks.map((task) => ({
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
    res
      .status(500)
      .json({ message: 'Failed to generate project', error: error.message });
  }
});

router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const ownerUid = req.user.uid;
    const user = await User.findOne({ uid: ownerUid }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const github = user.githubIntegration;
    if (!github || !github.connected || !github.accessToken) {
      return res.json({ updatedCount: 0, deletedCount: 0 });
    }

    const accessToken = decryptToken(github.accessToken);
    if (!accessToken) {
      return res.json({ updatedCount: 0, deletedCount: 0 });
    }

    const projects = await Project.find({ ownerUid, githubRepoName: { $exists: true, $ne: '' } });
    if (projects.length === 0) {
      return res.json({ updatedCount: 0, deletedCount: 0 });
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    };

    let updatedCount = 0;
    let deletedCount = 0;

    const syncPromises = projects.map(async (p) => {
      try {
        const repoRes = await axios.get(`https://api.github.com/repos/${p.githubRepoOwner}/${p.githubRepoName}`, { headers });
        if (repoRes.data && repoRes.data.name !== p.githubRepoName) {
          p.githubRepoName = repoRes.data.name;
          p.name = repoRes.data.name;
          await p.save();
          updatedCount++;
        }
      } catch (err) {
        if (err.response && (err.response.status === 404 || err.response.status === 401)) {
          await Project.deleteOne({ _id: p._id });
          await Step.deleteMany({ projectId: p._id });
          deletedCount++;
        }
      }
    });

    await Promise.allSettled(syncPromises);

    if (updatedCount > 0 || deletedCount > 0) {
      invalidateProjectCache({ ownerUid, team: [] });
    }

    res.json({ updatedCount, deletedCount });
  } catch (error) {
    console.error('Error syncing GitHub repos:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const ownerUid = req.user.uid;
    const cacheKey = `projects:${ownerUid}`;

    const cached = await cache.getJson(cacheKey);
    if (cached) return res.json(cached);


    const [projects, assignedTasks] = await Promise.all([
      getProjectsWithSteps({
        $or: [{ ownerUid }, { team: ownerUid }],
      }),
      ProjectTask.find({ assignedTo: ownerUid }).select('stepId').lean(),
    ]);
    const assignedStepIds = [
      ...new Set(assignedTasks.map((t) => t.stepId.toString())),
    ];

    let assignedProjects = [];
    if (assignedStepIds.length > 0) {
      const assignedSteps = await Step.find({ _id: { $in: assignedStepIds } })
        .select('projectId')
        .lean();
      const assignedProjectIds = [
        ...new Set(assignedSteps.map((s) => s.projectId.toString())),
      ];

      if (assignedProjectIds.length > 0) {
        assignedProjects = await getProjectsWithSteps({
          _id: { $in: assignedProjectIds },
        });
      }
    }


    const projectMap = new Map();
    [...projects, ...assignedProjects].forEach((p) => projectMap.set(p.id, p));
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
      await Project.updateOne(
        { _id: req.params.id },
        { $set: { team: newTeam } }
      );
    }

    const full = await getProjectWithSteps(req.params.id);
    invalidateProjectCache({
      ownerUid: project.ownerUid,
      team: [...project.team, userId],
    });
    res.json(full);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (
      project.ownerUid !== req.user.uid &&
      !project.team.includes(req.user.uid)
    ) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const stepCount = await Step.countDocuments({ projectId: project._id });
    if (stepCount === 0) {
      const defaultSteps = [
        {
          title: 'Planning',
          description: 'Initial requirements and design',
          type: 'Design',
          order: 0,
          projectId: project._id,
        },
        {
          title: 'Frontend',
          description: 'Client-side implementation',
          type: 'Frontend',
          order: 1,
          projectId: project._id,
        },
        {
          title: 'Backend',
          description: 'Server-side logic and APIs',
          type: 'Backend',
          order: 2,
          projectId: project._id,
        },
        {
          title: 'Database',
          description: 'Schema design and data management',
          type: 'Database',
          order: 3,
          projectId: project._id,
        },
        {
          title: 'Deployment',
          description: 'CI/CD and hosting setup',
          type: 'Other',
          order: 4,
          projectId: project._id,
        },
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


    const steps = await Step.find({ projectId: project._id })
      .select('_id')
      .lean();
    const stepIds = steps.map((s) => s._id);
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

    if (
      project.ownerUid !== req.user.uid &&
      !project.team.includes(req.user.uid)
    ) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const updates = req.body;
    const allowedUpdates = [
      'name',
      'description',
      'githubRepoName',
      'githubRepoOwner',
      'isTrackingActive',
    ];
    const filteredUpdates = {};

    Object.keys(updates).forEach((key) => {
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

router.post(
  '/:projectId/steps/:stepId/tasks',
  authMiddleware,
  async (req, res) => {
    try {
      const { projectId, stepId } = req.params;
      const { title, description, assignedTo, assignedToName, assignedBy } =
        req.body;

      if (!title) {
        return res.status(400).json({ message: 'Task title is required' });
      }

      const project = await Project.findById(projectId).lean();
      if (!project)
        return res.status(404).json({ message: 'Project not found' });

      if (
        project.ownerUid !== req.user.uid &&
        !project.team.includes(req.user.uid)
      ) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const step = await Step.findOne({
        _id: stepId,
        projectId: project._id,
      }).lean();
      if (!step) return res.status(404).json({ message: 'Step not found' });


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
            console.error('Failed to send assignment email:', emailError);
          }
        }
      }

      const newTask = new ProjectTask({
        title,
        description: description || null,
        status: 'Pending',
        assignedBy: assignedBy || 'Admin',
        createdBy: req.user ? req.user.uid : assignedBy || 'Admin',
        stepId,
      });

      if (assignedTo) {
        const taskUpdate = await handleTaskAssignment(project, newTask, assignedTo, assignedToName);
        Object.assign(newTask, taskUpdate);
      }
      
      await newTask.save();

      const updatedProject = await getProjectWithSteps(projectId);
      invalidateProjectCache(project);
      res.status(201).json(updatedProject);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

router.put(
  '/:projectId/steps/:stepId/tasks/:taskId',
  authMiddleware,
  async (req, res) => {
    try {
      const { projectId, stepId, taskId } = req.params;
      const { status, assignedTo, assignedToName, assignedBy } = req.body;

      const project = await Project.findById(projectId).lean();
      if (!project)
        return res.status(404).json({ message: 'Project not found' });

      if (
        project.ownerUid !== req.user.uid &&
        !project.team.includes(req.user.uid)
      ) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const step = await Step.findOne({
        _id: stepId,
        projectId: project._id,
      }).lean();
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
              console.error('Failed to send assignment email:', emailError);
            }
          }
        }
      }

      await ProjectTask.updateOne({ _id: taskId }, { $set: taskUpdate });

      const updatedProject = await getProjectWithSteps(projectId);

      req.app.get('io').emit('projectUpdate', {
        projectId: updatedProject.id,
        project: updatedProject,
      });

      invalidateProjectCache(project);
      res.json(updatedProject);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

router.delete(
  '/:projectId/steps/:stepId/tasks/:taskId',
  authMiddleware,
  async (req, res) => {
    try {
      const { projectId, stepId, taskId } = req.params;
      const userId = req.user ? req.user.uid : null;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const project = await Project.findById(projectId).lean();
      if (!project)
        return res.status(404).json({ message: 'Project not found' });

      if (project.ownerUid !== userId) {
        return res
          .status(403)
          .json({
            message:
              'Permission denied. Only the project owner can delete tasks.',
          });
      }

      const task = await ProjectTask.findOne({ _id: taskId, stepId }).lean();
      if (!task) return res.status(404).json({ message: 'Task not found' });

      await ProjectTask.findByIdAndDelete(taskId);

      const updatedProject = await getProjectWithSteps(projectId);

      req.app.get('io').emit('projectUpdate', {
        projectId: updatedProject.id,
        project: updatedProject,
      });

      res.json({
        message: 'Task deleted successfully',
        projectId,
        stepId,
        taskId,
      });
      invalidateProjectCache(project);
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

router.get('/tasks/search', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.uid;

    if (!query) return res.json([]);


    const ownedProjects = await Project.find({ ownerUid: userId })
      .select('_id name')
      .lean();
    const teamProjects = await Project.find({ team: userId })
      .select('_id name')
      .lean();


    const assignedTasks = await ProjectTask.find({ assignedTo: userId })
      .select('stepId')
      .lean();
    const assignedStepIds = [
      ...new Set(assignedTasks.map((t) => t.stepId.toString())),
    ];
    let assignedProjectIds = [];
    if (assignedStepIds.length > 0) {
      const assignedSteps = await Step.find({ _id: { $in: assignedStepIds } })
        .select('projectId')
        .lean();
      assignedProjectIds = assignedSteps.map((s) => s.projectId.toString());
    }
    const assignedProjectDocs =
      assignedProjectIds.length > 0
        ? await Project.find({ _id: { $in: assignedProjectIds } })
            .select('_id name')
            .lean()
        : [];

    const projectMap = new Map();
    [...ownedProjects, ...teamProjects, ...assignedProjectDocs].forEach((p) =>
      projectMap.set(p._id.toString(), p)
    );
    const projectIds = Array.from(projectMap.keys());

    if (projectIds.length === 0) return res.json([]);


    const steps = await Step.find({ projectId: { $in: projectIds } }).lean();
    const stepMap = new Map();
    steps.forEach((s) => stepMap.set(s._id.toString(), s));

    const stepIds = steps.map((s) => s._id);


    const matchedTasks = await ProjectTask.find({
      stepId: { $in: stepIds },
      title: { $regex: query, $options: 'i' },
    })
      .limit(10)
      .lean();

    const results = matchedTasks.map((task) => {
      const step = stepMap.get(task.stepId.toString());
      const proj = step ? projectMap.get(step.projectId.toString()) : null;
      return {
        id: task._id.toString(),
        title: task.title,
        projectId: proj?._id?.toString() || '',
        projectName: proj?.name || '',
        status: task.status,
        stepName: step?.title || '',
      };
    });

    const { items, pagination } = paginateArray(results, req.query, {
      defaultLimit: 10,
      maxLimit: 50,
    });
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

    if (
      project.ownerUid !== req.user.uid &&
      !project.team.includes(req.user.uid)
    ) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const steps = await Step.find({ projectId: project._id })
      .sort({ order: 1 })
      .lean();

    let step = steps.find(
      (s) =>
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
        projectId: project._id,
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
      stepId: step._id,
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
            {
              label: 'Description',
              value: newTask.description || 'No description',
            },
            { label: 'Assigned By', value: 'Admin' },
          ],
        });
        try {
          await sendZyncEmail(assigneeUser.email, subject, html, text);
        } catch (emailError) {
          console.error('Failed to send assignment email:', emailError);
        }
      }
    }

    const updatedProject = await getProjectWithSteps(projectId);
    const taskObj = normalizeDoc(newTask.toObject());

    invalidateProjectCache(project);
    res.json({
      message: 'Task created',
      task: taskObj,
      stepId: step._id?.toString() || step.id,
      project: updatedProject,
    });
  } catch (error) {
    console.error('Error creating quick task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get(
  '/:projectId/collaborator-assignees',
  authMiddleware,
  async (req, res) => {
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
        console.warn(
          `[Cache] collaborator-assignees read failed for ${cacheKey}:`,
          cacheReadError.message
        );
      }

      const project = await Project.findById(projectId).lean();
      if (!project)
        return res.status(404).json({ message: 'Project not found' });

      if (project.ownerUid !== requesterUid) {
        return res
          .status(403)
          .json({
            message: 'Only the repository owner can manage collaborators',
          });
      }

      if (!project.githubRepoOwner || !project.githubRepoName) {
        return res
          .status(400)
          .json({ message: 'Project is not linked to a GitHub repository' });
      }

      const requester = await User.findOne({ uid: requesterUid })
        .select('connections')
        .lean();
      const connectionsUids = requester?.connections || [];
      const projectTeamUids = project.team || [];
      const teamUids = await getTeamUidsForUser(requesterUid);

      const allAssignableUids = [
        ...new Set([...teamUids, ...connectionsUids, ...projectTeamUids]),
      ].filter((uid) => uid !== requesterUid);

      const assignableUsers = await User.find({
        uid: { $in: allAssignableUids },
      })
        .select('uid displayName email photoURL githubIntegration')
        .lean();

      const connectedTeamUsers = assignableUsers.filter(
        (u) => u?.githubIntegration?.username
      );

      let collaboratorLogins = new Set();
      let githubAppNotInstalled = false;
      try {
        const octokit = await buildInstallationOctokitFromOwner(requesterUid);
        const collaboratorsResponse = await octokit.request(
          'GET /repos/{owner}/{repo}/collaborators',
          {
            owner: project.githubRepoOwner,
            repo: project.githubRepoName,
            affiliation: 'all',
            per_page: 100,
          }
        );

        collaboratorLogins = new Set(
          (collaboratorsResponse.data || []).map((c) =>
            String(c.login || '').toLowerCase()
          )
        );
      } catch (ghError) {
        console.warn(`[GitHub] Installation octokit failed for ${project.githubRepoName}:`, ghError.message);
        // Fallback: use the owner's personal access token to fetch collaborators
        try {
          const ownerUser = await User.findOne({ uid: requesterUid }).select('githubIntegration').lean();
          const ownerGh = ownerUser?.githubIntegration;
          if (ownerGh?.accessToken) {
            const personalToken = decryptToken(ownerGh.accessToken);
            if (personalToken) {
              const fallbackResponse = await axios.get(
                `https://api.github.com/repos/${project.githubRepoOwner}/${project.githubRepoName}/collaborators`,
                {
                  headers: {
                    Authorization: `Bearer ${personalToken}`,
                    Accept: 'application/vnd.github.v3+json',
                  },
                  params: { affiliation: 'all', per_page: 100 },
                }
              );
              collaboratorLogins = new Set(
                (fallbackResponse.data || []).map((c) =>
                  String(c.login || '').toLowerCase()
                )
              );
            }
          }
          if (collaboratorLogins.size === 0) {
            githubAppNotInstalled = true;
          }
        } catch (fallbackError) {
          console.warn(`[GitHub] Personal token fallback also failed:`, fallbackError.message);
          githubAppNotInstalled = true;
        }
      }

      const activeCollaborators = connectedTeamUsers
        .filter((u) =>
          collaboratorLogins.has(
            String(u.githubIntegration.username).toLowerCase()
          )
        )
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
        githubAppNotInstalled,
      };

      try {
        await cache.setJson(cacheKey, responsePayload, 60);
      } catch (cacheWriteError) {
        console.warn(
          `[Cache] collaborator-assignees write failed for ${cacheKey}:`,
          cacheWriteError.message
        );
      }

      return res.json(responsePayload);
    } catch (error) {
      console.error('Error fetching collaborator assignees:', error);
      return res
        .status(500)
        .json({
          message: 'Failed to fetch collaborator assignees',
          error: error.message,
        });
    }
  }
);

router.post(
  '/:projectId/invite-collaborator',
  authMiddleware,
  async (req, res) => {
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
      if (!project)
        return res.status(404).json({ message: 'Project not found' });

      if (project.ownerUid !== requesterUid) {
        return res
          .status(403)
          .json({
            message: 'Only the repository owner can invite collaborators',
          });
      }

      if (!project.githubRepoOwner || !project.githubRepoName) {
        return res
          .status(400)
          .json({ message: 'Project is not linked to a GitHub repository' });
      }

      const requester = await User.findOne({ uid: requesterUid })
        .select('connections')
        .lean();
      const connectionsUids = requester?.connections || [];
      const projectTeamUids = project.team || [];
      const teamUids = await getTeamUidsForUser(requesterUid);

      const allAssignableUids = [
        ...new Set([...teamUids, ...connectionsUids, ...projectTeamUids]),
      ];

      if (!allAssignableUids.includes(userId)) {
        return res
          .status(400)
          .json({
            message:
              'Selected user is not in your team, connections, or project team',
          });
      }

      const assignee = await User.findOne({ uid: userId })
        .select('uid displayName email photoURL githubIntegration')
        .lean();
      if (!assignee?.githubIntegration?.username) {
        return res
          .status(400)
          .json({ message: 'Selected user is not connected to GitHub' });
      }

      let octokit;
      try {
        octokit = await buildInstallationOctokitFromOwner(requesterUid);
      } catch (err) {
        return res
          .status(400)
          .json({ message: 'GitHub App not installed or configured on the repository owner' });
      }

      let alreadyCollaborator = false;
      try {
        await octokit.request(
          'PUT /repos/{owner}/{repo}/collaborators/{username}',
          {
            owner: project.githubRepoOwner,
            repo: project.githubRepoName,
            username: assignee.githubIntegration.username,
            permission: 'push',
          }
        );
      } catch (inviteError) {
        const status = inviteError?.status || inviteError?.response?.status;
        const message =
          inviteError?.response?.data?.message || inviteError?.message || '';
        if (status === 422 && /already.*collaborator/i.test(message)) {
          alreadyCollaborator = true;
        } else {
          throw inviteError;
        }
      }

      try {
        await cache.invalidate(
          `collaborator-assignees:${projectId}:${requesterUid}`
        );
      } catch (cacheInvalidateError) {
        console.warn(
          `[Cache] collaborator-assignees invalidate failed for ${projectId}:${requesterUid}:`,
          cacheInvalidateError.message
        );
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
      return res
        .status(500)
        .json({
          message: 'Failed to invite collaborator',
          error: error.message,
        });
    }
  }
// WHAT: Edit Github Repository Settings. WHY: Feature 1 - allows users to edit description, website, and topics.
router.patch('/:id/github-settings', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, homepage, topics } = req.body;
    const project = await Project.findById(id).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.ownerUid !== req.user.uid) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (!project.githubRepoOwner || !project.githubRepoName) {
      return res.status(400).json({ message: 'Project is not linked to a GitHub repository' });
    }

    // Validation
    if (description && description.length > 350) {
      return res.status(400).json({ message: 'Description must be 350 characters or less' });
    }
    if (topics && Array.isArray(topics)) {
      if (topics.length > 20) {
        return res.status(400).json({ message: 'A repository can have a maximum of 20 topics' });
      }
      for (const topic of topics) {
        if (topic.length > 50 || !/^[a-z0-9-]+$/.test(topic)) {
          return res.status(400).json({ message: 'Topics must be lowercase, alphanumeric, hyphens only, and max 50 chars' });
        }
      }
    }

    let octokit;
    try {
      octokit = await buildInstallationOctokitFromOwner(project.ownerUid);
    } catch (err) {
      return res.status(400).json({ message: 'GitHub App not installed or configured on the repository owner' });
    }

    try {
      if (description !== undefined || homepage !== undefined) {
        await octokit.request('PATCH /repos/{owner}/{repo}', {
          owner: project.githubRepoOwner,
          repo: project.githubRepoName,
          description: description,
          homepage: homepage
        });
      }

      if (topics !== undefined && Array.isArray(topics)) {
        await octokit.request('PUT /repos/{owner}/{repo}/topics', {
          owner: project.githubRepoOwner,
          repo: project.githubRepoName,
          names: topics
        });
      }

      // Also update Zync Project model to match
      const updateData = {};
      if (description !== undefined) updateData.description = description;
      if (homepage !== undefined) updateData.homepage = homepage;
      if (topics !== undefined) updateData.tags = topics; // Map topics to Zync tags

      if (Object.keys(updateData).length > 0) {
        await Project.findByIdAndUpdate(id, { $set: updateData });
        await invalidateProjectCache(project);
      }

      return res.status(200).json({ message: 'Repository settings updated successfully' });
    } catch (apiError) {
      console.error('GitHub API Error:', apiError.response?.data || apiError.message);
      return res.status(400).json({ 
        message: 'Failed to update GitHub repository settings. Ensure your GitHub App has "Repository Administration" Read & Write permissions.', 
        error: apiError.response?.data?.message || apiError.message 
      });
    }
  } catch (error) {
    console.error('Error updating github settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// WHAT: Merge PR and delete branch. WHY: Feature 2 - Automated Task Workflow.
router.post('/tasks/:taskId/merge-pr', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await ProjectTask.findById(taskId).lean();
    
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!task.githubPrNumber || !task.githubBranchName) {
      return res.status(400).json({ message: 'Task does not have an active PR or GitHub branch linked' });
    }

    const step = await Step.findById(task.stepId).lean();
    if (!step) return res.status(404).json({ message: 'Step not found' });
    const project = await Project.findById(step.projectId).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Ensure the requester is the project owner (Admin)
    if (project.ownerUid !== req.user.uid) {
      return res.status(403).json({ message: 'Only the project owner can merge this PR via Zync' });
    }

    let octokit;
    try {
      octokit = await buildInstallationOctokitFromOwner(project.ownerUid);
    } catch (err) {
      return res.status(400).json({ message: 'GitHub App not installed or configured on the repository owner' });
    }

    try {
      // 1. Merge PR
      await octokit.request('PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge', {
        owner: project.githubRepoOwner,
        repo: project.githubRepoName,
        pull_number: task.githubPrNumber,
        merge_method: 'squash'
      });

      // 2. Delete Branch
      try {
        await octokit.request('DELETE /repos/{owner}/{repo}/git/refs/{ref}', {
          owner: project.githubRepoOwner,
          repo: project.githubRepoName,
          ref: `heads/${task.githubBranchName}`
        });
      } catch (delError) {
        console.warn(`Could not delete branch ${task.githubBranchName}:`, delError.message);
        // We don't fail the request if branch deletion fails, as the merge was successful.
      }

      // 3. Mark task fully completed in Zync
      await ProjectTask.findByIdAndUpdate(taskId, {
        $set: {
          status: 'Completed',
          updatedAt: Date.now()
        }
      });

      return res.status(200).json({ message: 'PR successfully merged and branch deleted. Task completed.' });
    } catch (apiError) {
      console.error('GitHub API Error on Merge PR:', apiError.response?.data || apiError.message);
      return res.status(400).json({ 
        message: 'Failed to merge PR. Ensure your GitHub App has "Pull Requests" Read & Write permissions.', 
        error: apiError.response?.data?.message || apiError.message 
      });
    }
  } catch (error) {
    console.error('Error merging PR:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

