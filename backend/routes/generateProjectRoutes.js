/**
 * @fileoverview generateProjectRoutes.js
 * @module generateProjectRoutes
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
const express = require('express'); // Imports the Express framework, which is a fast, unopinionated, minimalist web framework for Node.js, needed to create and manage server routes.
const router = express.Router(); // Creates a new router object from Express, which allows defining modular, mountable route handlers for specific paths.
const authMiddleware = require('../middleware/authMiddleware'); // Imports a custom authentication middleware, which is used to verify user authentication before allowing access to certain routes.
const User = require('../models/User'); // Imports the Mongoose User model, which provides an interface to interact with the 'users' collection in the database.
const Project = require('../models/Project'); // Imports the Mongoose Project model, which provides an interface to interact with the 'projects' collection in the database.
const Step = require('../models/Step'); // Imports the Mongoose Step model, which provides an interface to interact with the 'steps' collection in the database.
const ProjectTask = require('../models/ProjectTask'); // Imports the Mongoose ProjectTask model, which provides an interface to interact with the 'projecttasks' collection in the database.
const { normalizeDoc } = require('../utils/normalize'); // Imports the 'normalizeDoc' utility function, which is likely used to standardize document structures, though not directly used in this specific route.
const { getProjectWithSteps } = require('../utils/projectHelper'); // Imports the 'getProjectWithSteps' utility function, which is used to fetch a project along with its associated steps from the database.
const cache = require('../utils/cache');
const { invalidateInstallationCaches } = require('../utils/githubInstallation');
const axios = require('axios');
const CryptoJS = require('crypto-js');
const { generateArchitectureWithKilo } = require('../services/kiloCodeGateway');
const { checkAndReserveGen, refundGen } = require('../services/usageService');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'fallback-encryption-key-123';

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

const fetchRepoContext = async (accessToken, owner, repo, description) => {
  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    };

    const treeResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents`,
      { headers }
    );
    const files = treeResponse.data.map((f) => f.name);

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
          return '';
        }
        return '';
      });

    const fileContents = await Promise.all(filePromises);
    context += fileContents.join('');

    return context;
  } catch (error) {
    return `Repository Name: ${repo}\nDescription: ${description || 'No description'}`;
  }
};


const commitFileToGitHub = async (accessToken, owner, repo, filePath, contentString, commitMessage) => {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github.v3+json',
  };
  const base64Content = Buffer.from(contentString).toString('base64');

  let sha;
  try {
    const existingFile = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      { headers }
    );
    sha = existingFile.data?.sha;
  } catch (err) {
    // File doesn't exist yet, which is expected for new files
  }

  await axios.put(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      message: commitMessage,
      content: base64Content,
      sha,
    },
    { headers }
  );
};


router.post('/', authMiddleware, async (req, res) => { // Defines a POST route handler for the root path ('/'), applying the 'authMiddleware' first to ensure the user is authenticated, and then an asynchronous function to handle the request.
  try { // Starts a try-catch block to gracefully handle any synchronous or asynchronous errors that might occur during the execution of the route logic.
    const { name, description, ownerId } = req.body; // Destructures 'name', 'description', and 'ownerId' from the request body, extracting the data sent by the client for creating a new project.
    const uid = req.user.uid; // Extracts the 'uid' (user ID) from the 'req.user' object, which is populated by the 'authMiddleware' after successful authentication, identifying the current user.

    if (!name || !description) { // Checks if either 'name' or 'description' is missing from the request body.
      return res.status(400).json({ message: 'Name and description are required' }); // If either is missing, sends a 400 Bad Request response with an error message, indicating that essential project details were not provided.
    }


    let user = await User.findOne({ uid }).lean(); // Queries the database to find a user document where the 'uid' field matches the extracted 'uid', using '.lean()' for faster retrieval of plain JavaScript objects.
    if (!user) { // Checks if a user document was found.
      return res.status(404).json({ message: 'User not found' }); // If no user is found with the given UID, sends a 404 Not Found response, indicating that the authenticated user does not exist in the database.
    }

    let documentationCommitWarning = null; // Track documentation commit issues

    const github = user.githubIntegration;
    if (!github || !github.connected || !github.accessToken) {
      return res.status(400).json({ message: 'GitHub account is not connected. Please connect it first.' });
    }

    const decryptedAccessToken = decryptToken(github.accessToken);
    if (!decryptedAccessToken) {
      return res.status(500).json({ message: 'Failed to decrypt GitHub access token' });
    }

    let githubRepoName = '';
    let githubRepoOwner = '';

    // GitHub rejects control characters (incl. newlines) in repo descriptions.
    const repoDescription = String(description || '')
      .replace(/[ -]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 350); // GitHub API limit is 350 chars

    try {
      const response = await axios.post(
        'https://api.github.com/user/repos',
        {
          name: name,
          description: repoDescription,
          private: true,
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
      const newRepoId = response.data.id;

      // WHAT: Grant the Zync GitHub App access to the newly created repo.
      // WHY: The repo is created with the user's personal token. On a
      // "selected repositories" installation the App would not see it
      // otherwise, which previously looked like "app not installed".
      if (github.installationId && newRepoId) {
        try {
          await axios.put(
            `https://api.github.com/user/installations/${github.installationId}/repositories/${newRepoId}`,
            {},
            {
              headers: {
                Authorization: `Bearer ${decryptedAccessToken}`,
                Accept: 'application/vnd.github.v3+json',
              },
            }
          );
        } catch (grantError) {
          const grantStatus = grantError.response?.status;
          if (grantStatus !== 304) {
            console.warn(
              `[GitHub] Could not add repo ${githubRepoName} to installation ${github.installationId}:`,
              grantError.response?.data?.message || grantError.message
            );
          }
        }
      }

      await invalidateInstallationCaches(uid);
    } catch (ghError) {
      console.error('Failed to create GitHub repository:', ghError.response?.data || ghError.message);
      return res.status(400).json({ 
        message: 'Please install and configure the Zync GitHub App for your account first to allow repository creation.', 
        error: ghError.response?.data?.message || ghError.message 
      });
    }

    const newProject = await Project.create({ // Creates a new project document in the database using the Project Mongoose model.
      name, // Assigns the project name from the request body.
      description, // Assigns the project description from the request body.
      ownerId: user._id, // Assigns the MongoDB ObjectId of the authenticated user as the project owner.
      ownerUid: user.uid,
      githubRepoName,
      githubRepoOwner,
      isTrackingActive: true,
      architecture: {},
      team: [], // Initializes the 'team' array as empty for the new project.
    });

    try {
      console.log(`Generating initial architecture plan for new project: ${name} using Kilo...`);
      let context = `Project Description:\n${description}\n\n`;
      const fetchedContext = await fetchRepoContext(decryptedAccessToken, githubRepoOwner, githubRepoName, description);
      if (fetchedContext) {
        context += fetchedContext;
      }

      // Quota gate before the expensive gen. Over-limit → skip gen (project still
      // created, not stranded). Transient kilo failure → refund (retry is free).
      let analyzedArch = null;
      const reserve = await checkAndReserveGen(req.user.uid);
      if (reserve.ok) {
        try {
          analyzedArch = await generateArchitectureWithKilo({
            projectName: name,
            projectDescription: description || '',
            model: 'kilo-auto/free',
          });
        } catch (genError) {
          await refundGen(req.user.uid, reserve.key);
          throw genError;
        }
      } else {
        console.warn(`[usage] ${req.user.uid} exceeded weekly architecture gen limit`);
      }

      if (analyzedArch && Object.keys(analyzedArch).length > 0) {
        await Project.updateOne(
          { _id: newProject._id },
          {
            $set: {
              architecture: analyzedArch,
              architectureAnalyzedAt: new Date(),
            },
          }
        );
        console.log('Initial architecture plan successfully generated and saved.');

        // Commit custom docs to GitHub
        try {
          console.log(`Committing custom initial documentation (README.md, docs/ARCHITECTURE.md, docs/TODO.md) to GitHub repo...`);
          
          const readmeContent = `# ${name}\n\n${description}\n\n## 🏛️ Architecture Overview\n${analyzedArch.highLevel || 'N/A'}\n\n## 🚀 Quick Start\n1. Clone the repository:\n   \`\`\`bash\n   git clone https://github.com/${githubRepoOwner}/${githubRepoName}.git\n   \`\`\`\n2. Install dependencies.\n3. Run the development server.\n\nSee [ARCHITECTURE.md](./docs/ARCHITECTURE.md) and [TODO.md](./docs/TODO.md) for more details.`;

          const architectureContent = `# Project Architecture: ${name}\n\n## High-Level Overview\n${analyzedArch.highLevel || 'N/A'}\n\n## Frontend\n- **Structure**: ${analyzedArch.frontend?.structure || 'N/A'}\n- **Routing**: ${analyzedArch.frontend?.routing || 'N/A'}\n- **Pages**:\n${(analyzedArch.frontend?.pages || []).map(p => `  - ${p}`).join('\n') || '  - N/A'}\n- **Key Components**:\n${(analyzedArch.frontend?.components || []).map(c => `  - ${c}`).join('\n') || '  - N/A'}\n\n## Backend\n- **Structure**: ${analyzedArch.backend?.structure || 'N/A'}\n- **Auth Flow**: ${analyzedArch.backend?.authFlow || 'N/A'}\n- **APIs**:\n${(analyzedArch.backend?.apis || []).map(a => `  - ${a}`).join('\n') || '  - N/A'}\n- **Controllers**:\n${(analyzedArch.backend?.controllers || []).map(c => `  - ${c}`).join('\n') || '  - N/A'}\n- **Services**:\n${(analyzedArch.backend?.services || []).map(s => `  - ${s}`).join('\n') || '  - N/A'}\n\n## Database\n- **Design**: ${analyzedArch.database?.design || 'N/A'}\n- **Collections/Tables**:\n${(analyzedArch.database?.collections || []).map(c => `  - ${c}`).join('\n') || '  - N/A'}\n- **Relationships**:\n${(analyzedArch.database?.relationships || []).map(r => `  - ${r}`).join('\n') || '  - N/A'}\n\n## API Communication Flow\n${analyzedArch.apiFlow || 'N/A'}\n\n## Tech Stack & Integrations\n${(analyzedArch.integrations || []).map(i => `- ${i}`).join('\n') || '- N/A'}`;

          const todoContent = `# Zync Project Roadmap & Tasks: ${name}\n\n## 📋 Planning & Design\n- [ ] Refine system architecture & requirements\n- [ ] Database schema validation & indexing strategy\n\n## 💻 Frontend Tasks\n${(analyzedArch.frontend?.pages || []).map(p => `- [ ] Design page layout and views for **${p}**`).join('\n') || '- [ ] Design UI screens'}\n${(analyzedArch.frontend?.components || []).map(c => `- [ ] Implement component: **${c}**`).join('\n') || '- [ ] Create reusable components'}\n- [ ] Configure client-side routing (${analyzedArch.frontend?.routing || 'N/A'})\n\n## ⚙️ Backend & API Tasks\n- [ ] Set up server structure & middlewares\n- [ ] Configure database connection & schema\n- [ ] Implement authentication flow (${analyzedArch.backend?.authFlow || 'N/A'})\n${(analyzedArch.backend?.apis || []).map(a => `- [ ] Create API route: **${a}**`).join('\n') || '- [ ] Develop REST API endpoints'}\n${(analyzedArch.backend?.services || []).map(s => `- [ ] Implement service logic for **${s}**`).join('\n') || '- [ ] Write business logic services'}\n\n## 💾 Database Tasks\n${(analyzedArch.database?.collections || []).map(c => `- [ ] Define model/schema for **${c}**`).join('\n') || '- [ ] Set up database collections/tables'}\n\n## 🚀 Deployment & Integrations\n${(analyzedArch.integrations || []).map(i => `- [ ] Integrate and configure **${i}**`).join('\n') || '- [ ] Setup CI/CD and deployment environment'}`;

          // Overwrite default README.md
          await commitFileToGitHub(decryptedAccessToken, githubRepoOwner, githubRepoName, 'README.md', readmeContent, 'docs: initialize README with architecture overview');

          // Commit ARCHITECTURE.md
          await commitFileToGitHub(decryptedAccessToken, githubRepoOwner, githubRepoName, 'docs/ARCHITECTURE.md', architectureContent, 'docs: add ARCHITECTURE.md detailed specification');

          // Commit TODO.md
          await commitFileToGitHub(decryptedAccessToken, githubRepoOwner, githubRepoName, 'docs/TODO.md', todoContent, 'docs: add project todo roadmap');

          console.log(`Successfully committed all initial documentation to GitHub.`);
        } catch (commitErr) {
          const detail = commitErr.response?.data?.message || commitErr.message;
          console.error(`Failed to commit documentation to GitHub:`, detail);
          documentationCommitWarning = `Documentation commit failed: ${detail}`;
          if (commitErr.response?.data) {
            console.error(`GitHub API Error Details:`, JSON.stringify(commitErr.response.data));
            if (detail === 'Resource not accessible by integration') {
              console.error('PROTIP: Please check your GitHub App configuration at https://github.com/settings/apps and ensure that "Repository permissions -> Contents" is set to "Read & Write".');
            }
          }
        }
      }
    } catch (kiloErr) {
      console.error('Failed to generate initial architecture plan using Kilo Code Gateway:', kiloErr.message);
      throw kiloErr; // Propagate the Kilo Gateway error so client/backend creation explicitly fails
    }

    await cache.invalidate(`projects:${user.uid}`);
    const fullProject = await getProjectWithSteps(newProject._id); // Fetches the newly created project along with all its associated steps and tasks using a utility function, providing a complete view of the project.
    
    // Include documentation warning if commits failed
    const responsePayload = { ...fullProject };
    if (documentationCommitWarning) {
      responsePayload.warning = documentationCommitWarning;
    }
    
    res.status(201).json(responsePayload); // Sends a 201 Created status response along with the fully populated project object, indicating successful project generation and creation.
  } catch (error) { // Catches any error that occurred within the try block.
    console.error('Error generating project:', error); // Logs the error message to the console for debugging purposes.
    res.status(500).json({ message: 'Failed to generate project', error: error.message }); // Sends a 500 Internal Server Error response with a generic failure message and the specific error message, informing the client about the server-side issue.
  }
});

module.exports = router; // Exports the router object, making it available for use in other parts of the application (e.g., in the main Express app file) to define routes.