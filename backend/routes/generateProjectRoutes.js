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
const Groq = require('groq-sdk'); // Imports the Groq SDK, which provides an interface to interact with Groq's AI models for generating content.
const authMiddleware = require('../middleware/authMiddleware'); // Imports a custom authentication middleware, which is used to verify user authentication before allowing access to certain routes.
const User = require('../models/User'); // Imports the Mongoose User model, which provides an interface to interact with the 'users' collection in the database.
const Project = require('../models/Project'); // Imports the Mongoose Project model, which provides an interface to interact with the 'projects' collection in the database.
const Step = require('../models/Step'); // Imports the Mongoose Step model, which provides an interface to interact with the 'steps' collection in the database.
const ProjectTask = require('../models/ProjectTask'); // Imports the Mongoose ProjectTask model, which provides an interface to interact with the 'projecttasks' collection in the database.
const { normalizeDoc } = require('../utils/normalize'); // Imports the 'normalizeDoc' utility function, which is likely used to standardize document structures, though not directly used in this specific route.
const { getProjectWithSteps } = require('../utils/projectHelper'); // Imports the 'getProjectWithSteps' utility function, which is used to fetch a project along with its associated steps from the database.

const groq = process.env.GROQ_API_KEY // Checks if the GROQ_API_KEY environment variable is set.
  ? new Groq({ apiKey: process.env.GROQ_API_KEY }) // If the API key is present, initializes a new Groq SDK instance with the provided API key, enabling communication with Groq's AI services.
  : null; // If the API key is not present, sets 'groq' to null, indicating that the AI generation service is not configured.


router.post('/', authMiddleware, async (req, res) => { // Defines a POST route handler for the root path ('/'), applying the 'authMiddleware' first to ensure the user is authenticated, and then an asynchronous function to handle the request.
  try { // Starts a try-catch block to gracefully handle any synchronous or asynchronous errors that might occur during the execution of the route logic.
    const { name, description, ownerId } = req.body; // Destructures 'name', 'description', and 'ownerId' from the request body, extracting the data sent by the client for creating a new project.
    const uid = req.user.uid; // Extracts the 'uid' (user ID) from the 'req.user' object, which is populated by the 'authMiddleware' after successful authentication, identifying the current user.

    if (!name || !description) { // Checks if either 'name' or 'description' is missing from the request body.
      return res.status(400).json({ message: 'Name and description are required' }); // If either is missing, sends a 400 Bad Request response with an error message, indicating that essential project details were not provided.
    }

    if (!groq) { // Checks if the 'groq' instance is null, meaning the GROQ_API_KEY was not configured.
      return res.status(503).json({ message: 'AI generation service not configured (missing GROQ_API_KEY)' }); // If Groq is not configured, sends a 503 Service Unavailable response, informing the client that the AI service is not operational.
    }


    let user = await User.findOne({ uid }).lean(); // Queries the database to find a user document where the 'uid' field matches the extracted 'uid', using '.lean()' for faster retrieval of plain JavaScript objects.
    if (!user) { // Checks if a user document was found.
      return res.status(404).json({ message: 'User not found' }); // If no user is found with the given UID, sends a 404 Not Found response, indicating that the authenticated user does not exist in the database.
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
}`; // Defines the prompt string using template literals, instructing the AI to act as a senior software architect and generate a project plan in a specific JSON format based on the provided project name and description.

    const completion = await groq.chat.completions.create({ // Makes an asynchronous call to the Groq API to generate a chat completion.
      messages: [{ role: 'user', content: prompt }], // Specifies the input messages for the AI, with a single user message containing the detailed project plan prompt.
      model: 'openai/gpt-oss-120b', // Sets the specific AI model to be used for generating the completion.
      temperature: 0.7, // Sets the sampling temperature, controlling the randomness of the AI's output (higher values mean more creative, lower values mean more deterministic).
      max_tokens: 8192, // Sets the maximum number of tokens the AI can generate in its response, limiting the length of the output.
      response_format: { type: 'json_object' }, // Instructs the AI to return its response strictly as a JSON object, ensuring the output can be directly parsed.
    });

    const responseText = completion.choices?.[0]?.message?.content; // Safely accesses the content of the AI's response message from the completion object, using optional chaining to prevent errors if the structure is unexpected.
    if (!responseText) { // Checks if the AI returned an empty or undefined response.
      return res.status(500).json({ message: 'AI returned empty response' }); // If the response is empty, sends a 500 Internal Server Error, indicating a problem with the AI generation.
    }

    let generatedData; // Declares a variable to hold the parsed JSON data from the AI response.
    try { // Starts another try-catch block specifically for parsing the AI's response, as parsing can fail if the JSON is malformed.
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim(); // Cleans the AI's response by removing common markdown code block delimiters (```json and ```) and trimming whitespace, preparing it for JSON parsing.
      generatedData = JSON.parse(cleaned); // Parses the cleaned string into a JavaScript object, assuming it's valid JSON.
    } catch (e) { // Catches any error that occurs during the JSON parsing process.
      console.error('Failed to parse AI response:', responseText); // Logs the parsing error and the raw AI response to the console for debugging.
      return res.status(500).json({ message: 'Failed to parse AI response', error: e.message }); // Sends a 500 Internal Server Error response, indicating that the AI's output could not be processed.
    }


    const newProject = await Project.create({ // Creates a new project document in the database using the Project Mongoose model.
      name, // Assigns the project name from the request body.
      description, // Assigns the project description from the request body.
      ownerId: user._id, // Assigns the MongoDB ObjectId of the authenticated user as the project owner.
      architecture: generatedData.architecture || {}, // Assigns the 'architecture' object generated by the AI, defaulting to an empty object if not present.
      team: [], // Initializes the 'team' array as empty for the new project.
    });


    const stepsData = (generatedData.steps || []).map((stepData, idx) => ({ // Processes the 'steps' array from the AI-generated data, mapping each step into a new object suitable for database insertion.
      title: stepData.title, // Assigns the title of the step.
      description: stepData.description || '', // Assigns the description of the step, defaulting to an empty string if not provided.
      type: stepData.type || 'Other', // Assigns the type of the step (e.g., Frontend, Backend), defaulting to 'Other'.
      page: stepData.page || 'General', // Assigns the page associated with the step, defaulting to 'General'.
      order: idx, // Assigns the order of the step based on its index in the array, maintaining the sequence.
      projectId: newProject._id, // Links the step to the newly created project using its MongoDB ObjectId.
      tasks: stepData.tasks || [], // Includes the tasks associated with this step, defaulting to an empty array if not provided, to be processed separately.
    }));

    const createdSteps = await Step.insertMany( // Inserts multiple step documents into the database using the Step Mongoose model.
      stepsData.map(({ tasks, ...stepFields }) => stepFields) // Maps over the 'stepsData' array, destructuring each object to extract 'tasks' and collect all other fields ('stepFields'), then returns only 'stepFields' for insertion, as tasks will be inserted separately.
    );

    const allTasks = createdSteps.flatMap((step, i) => // Flattens an array of arrays into a single array, processing each created step to generate its associated tasks.
      stepsData[i].tasks.map(task => ({ // Maps over the original tasks associated with each step (from 'stepsData').
        title: task.title, // Assigns the title of the task.
        description: task.description || '', // Assigns the description of the task, defaulting to an empty string.
        status: 'Pending', // Sets the initial status of the task to 'Pending'.
        stepId: step._id, // Links the task to its parent step using the MongoDB ObjectId of the newly created step.
      }))
    );

    if (allTasks.length > 0) { // Checks if there are any tasks to insert.
      await ProjectTask.insertMany(allTasks); // If tasks exist, inserts all generated tasks into the database using the ProjectTask Mongoose model.
    }

    const fullProject = await getProjectWithSteps(newProject._id); // Fetches the newly created project along with all its associated steps and tasks using a utility function, providing a complete view of the project.
    res.status(201).json(fullProject); // Sends a 201 Created status response along with the fully populated project object, indicating successful project generation and creation.
  } catch (error) { // Catches any error that occurred within the try block.
    console.error('Error generating project:', error); // Logs the error message to the console for debugging purposes.
    res.status(500).json({ message: 'Failed to generate project', error: error.message }); // Sends a 500 Internal Server Error response with a generic failure message and the specific error message, informing the client about the server-side issue.
  }
});

module.exports = router; // Exports the router object, making it available for use in other parts of the application (e.g., in the main Express app file) to define routes.