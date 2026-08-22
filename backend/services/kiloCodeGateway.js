/**
 * @fileoverview kiloCodeGateway.js
 * @module kiloCodeGateway
 *
 * Kilo Code Gateway client for architecture analysis with automatic fallback
 * to Groq / Gemini / deterministic baseline scaffolding when unconfigured or offline.
 */

const axios = require('axios');

const KILO_CODE_GATEWAY_URL = process.env.KILO_CODE_GATEWAY_URL || '';
const KILO_CODE_GATEWAY_API_KEY = process.env.KILO_CODE_GATEWAY_API_KEY || '';
const KILO_CODE_GATEWAY_MODEL = process.env.KILO_CODE_GATEWAY_MODEL || 'kilo-auto/free';

/**
 * Repair + parse a model reply into JSON. The model sometimes leaks stray
 * ASCII/smart quotes into string values (e.g. `JWT"s signature`) and fuzzy
 * apostrophes (`don't`), which break strict JSON.parse.
 */
const parseModelJson = (text, errorTag = 'response') => {
  // Clean markdown code blocks
  let jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

  // Handle common JSON formatting issues
  jsonString = jsonString
    .replace(/,\s*}/g, '}')              // trailing commas in objects
    .replace(/,\s*]/g, ']')              // trailing commas in arrays
    .replace(/[‘’]/g, "'")     // smart single quotes -> straight
    .replace(/[“”]/g, '"')     // smart double quotes -> straight
    .replace(/'/g, '"')                  // single quotes -> double quotes
    // Remove stray double quotes that sit between word characters
    // (e.g. `JWT"s`). Structural JSON quotes never sit between two word chars,
    // so this only deletes leaked prose quotes.
    .replace(/(\w)"(\w)/g, '$1$2')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    console.error(`Failed to parse AI ${errorTag}:`, jsonString);
    console.error('Parse error:', e.message);

    // Try to extract JSON from the response if it's embedded in other text
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
        console.log('Successfully extracted JSON from embedded text');
      } catch (retryError) {
        console.error(`Failed to parse extracted JSON: ${retryError.message}`);
        throw new Error(`Failed to parse architecture ${errorTag}`);
      }
    } else {
      throw new Error(`Failed to parse architecture ${errorTag}`);
    }
  }

  // Validate basic structure
  if (!parsed || typeof parsed !== 'object') {
    console.error('Invalid response structure:', parsed);
    throw new Error('Invalid architecture response structure');
  }

  return parsed;
};

/**
 * Generate a clean, deterministic baseline architecture blueprint when AI providers are unavailable.
 */
const generateFallbackArchitecture = (projectName, description = '', repoContext = '') => {
  const cleanName = projectName || 'Project';
  const cleanDesc = description || 'Full-stack application';
  
  // Extract technology hints from repo context or description
  const combinedText = `${cleanDesc} ${repoContext}`.toLowerCase();
  const integrations = [];
  
  if (combinedText.includes('next') || combinedText.includes('nextjs')) integrations.push('Next.js');
  else if (combinedText.includes('react')) integrations.push('React');
  else if (combinedText.includes('vue')) integrations.push('Vue');
  else integrations.push('React');

  if (combinedText.includes('tailwind')) integrations.push('Tailwind CSS');
  if (combinedText.includes('typescript') || combinedText.includes('.ts')) integrations.push('TypeScript');
  else integrations.push('JavaScript');

  if (combinedText.includes('express')) integrations.push('Express');
  integrations.push('Node.js');

  if (combinedText.includes('postgres') || combinedText.includes('prisma')) integrations.push('PostgreSQL');
  else if (combinedText.includes('mongo') || combinedText.includes('mongoose')) integrations.push('MongoDB');
  else integrations.push('MongoDB');

  if (combinedText.includes('firebase')) integrations.push('Firebase Auth');
  else if (combinedText.includes('jwt')) integrations.push('JWT');
  else integrations.push('JWT Auth');

  if (combinedText.includes('socket')) integrations.push('Socket.io');
  if (combinedText.includes('redis')) integrations.push('Redis');

  return {
    highLevel: `Modern full-stack client-server architecture designed for ${cleanName}. Features a decoupled frontend client communicating with a modular backend API layer and persistent datastore.`,
    frontend: {
      structure: 'Component-driven modular frontend with dedicated views, reusable components, and API integration hooks.',
      pages: ['Dashboard', 'Workspace', 'Projects', 'Analytics', 'Settings'],
      components: ['Navigation Header', 'Sidebar', 'Data Table', 'Action Modal', 'Status Card'],
      routing: 'Client-side SPA Router (React Router DOM / Next.js Pages)',
    },
    backend: {
      structure: 'Controller-Service-Repository pattern with structured middleware for authentication, request validation, and error handling.',
      apis: ['/api/auth/login', '/api/users/profile', '/api/projects', '/api/tasks', '/api/activity'],
      controllers: ['AuthController', 'UserController', 'ProjectController', 'TaskController'],
      services: ['AuthService', 'UserService', 'ProjectService', 'NotificationService'],
      authFlow: 'JWT Bearer token verification middleware with session validation.',
    },
    database: {
      design: 'Document-oriented or relational schema with indexed primary keys and referential integrity.',
      collections: ['Users', 'Projects', 'Tasks', 'ActivityLogs', 'Settings'],
      relationships: ['User has-many Projects', 'Project has-many Tasks', 'User has-many ActivityLogs'],
    },
    apiFlow: 'RESTful JSON request-response lifecycle over HTTPS with JWT header authentication.',
    integrations: Array.from(new Set(integrations)),
  };
};

/**
 * Execute AI prompt via Kilo, Groq, or Gemini fallback.
 */
const callAiProvider = async (prompt, selectedModel) => {
  // 1. Try Kilo Code Gateway if configured
  if (KILO_CODE_GATEWAY_URL && KILO_CODE_GATEWAY_API_KEY) {
    try {
      const response = await axios.post(
        `${KILO_CODE_GATEWAY_URL}/v1/chat/completions`,
        {
          model: selectedModel || KILO_CODE_GATEWAY_MODEL,
          messages: [
            { role: 'system', content: 'You are a helpful assistant that returns only valid JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${KILO_CODE_GATEWAY_API_KEY}`,
          },
          timeout: 60000,
        }
      );
      const text = response.data?.choices?.[0]?.message?.content || '';
      if (text) {
        return parseModelJson(text, 'kilo response');
      }
    } catch (kiloErr) {
      console.warn(`[kilo-gateway] Kilo request failed: ${kiloErr.message}. Attempting fallbacks...`);
    }
  }

  // 2. Try Groq if configured
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that returns only valid JSON.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          timeout: 45000,
        }
      );
      const text = response.data?.choices?.[0]?.message?.content || '';
      if (text) {
        return parseModelJson(text, 'groq response');
      }
    } catch (groqErr) {
      console.warn(`[kilo-gateway] Groq fallback failed: ${groqErr.message}.`);
    }
  }

  // 3. Try Gemini if configured
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_SECONDARY;
  if (geminiKey) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 45000,
        }
      );
      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text) {
        return parseModelJson(text, 'gemini response');
      }
    } catch (geminiErr) {
      console.warn(`[kilo-gateway] Gemini fallback failed: ${geminiErr.message}.`);
    }
  }

  return null;
};

const analyzeArchitectureWithKilo = async ({ repoContext, projectName, model }) => {
  const prompt = `
You are a Senior Software Architect. Analyze the following codebase context for the project "${projectName}".

Codebase Context:
${repoContext}

Based on the file structure and contents, deduce the architecture.
Return a STRICT JSON object matching this schema exactly:

{
  "highLevel": "Brief summary of the architecture",
  "frontend": {
    "structure": "Description of frontend organization",
    "pages": ["Inferred pages"],
    "components": ["Inferred key components"],
    "routing": "Inferred routing strategy"
  },
  "backend": {
    "structure": "Description of backend organization",
    "apis": ["Inferred API routes"],
    "controllers": ["Inferred controllers"],
    "services": ["Inferred services"],
    "authFlow": "Inferred authentication mechanism"
  },
  "database": {
    "design": "Description of data model",
    "collections": ["Inferred collections/tables"],
    "relationships": ["Inferred key relationships"]
  },
  "apiFlow": "How frontend communicates with backend",
  "integrations": ["Detected external libraries/SDKs as simple canonical names only, such as React, Vue, Angular, Next.js, Node.js, Express, NestJS, MongoDB, PostgreSQL, MySQL, Redis, Elasticsearch, Docker, Kubernetes, AWS, Firebase, GraphQL, TypeScript, JavaScript, Python, Java, Go, Tailwind CSS, Laravel, Django, Flask, Socket.io, Stripe, etc."]
}

CRITICAL RULES FOR INTEGRATIONS/SERVICES ARRAYS:
- Return ONLY simple canonical technology names.
- Do NOT include descriptions, explanations, or parenthetical notes.
- Do NOT include UI features, page names, or component names like "Profile Information", "Projects", "Experience Entries", "Skills", "Certifications", "Social Links".
- Do NOT include libraries with descriptive suffixes like "Framer Motion (for complex animations)". Just return "Framer Motion".
- Do NOT include animation/scroll utilities unless they are core architecture dependencies.
- Bad examples: "Framer Motion (for complex animations", "GSAP (likely for...)", "Lucide React (for vector icons)", "Sharp (likely for...)", "Profile Information".
- Good examples: "React", "Framer Motion", "GSAP", "Lenis", "Lucide React", "Tailwind CSS", "Sharp".
- If you cannot derive a specific detail, use "N/A" rather than making up descriptive text.
`;

  const parsed = await callAiProvider(prompt, model);
  if (parsed && typeof parsed === 'object') {
    return parsed;
  }

  // Baseline fallback
  console.log(`[kilo-gateway] Using deterministic baseline architecture for ${projectName}`);
  return generateFallbackArchitecture(projectName, '', repoContext);
};

const generateArchitectureWithKilo = async ({ projectName, projectDescription, model }) => {
  const prompt = `
You are an expert AI Software Architect Agent.
Your task is to design a complete, production-ready system architecture blueprint for a new project based on its name and description.

Project Name: ${projectName}
Project Description: ${projectDescription}

Design a modern, scalable architecture for this project. State clear design decisions.
Return a STRICT JSON object matching this schema exactly:

{
  "highLevel": "Detailed explanation of the high-level architecture design, choice of patterns (MVC, microservices, etc.), and execution flow.",
  "frontend": {
    "structure": "Organization strategy for the frontend codebase (e.g. Next.js, Vite React, components, hooks, views structure).",
    "pages": ["List of critical pages/screens required for this application"],
    "components": ["List of key reusable UI components to build"],
    "routing": "Frontend routing strategy (e.g. Next.js App Router, React Router DOM)"
  },
  "backend": {
    "structure": "Organization strategy for the backend codebase (e.g. modular controller-service-repository pattern in Node.js/Express).",
    "apis": ["List of key REST API endpoints required (e.g. /api/auth/register, /api/tasks, etc.)"],
    "controllers": ["List of required controllers"],
    "services": ["List of required services/handlers"],
    "authFlow": "Authentication and authorization mechanism (e.g., Firebase Auth JWT token validation middleware)"
  },
  "database": {
    "design": "Data modeling approach (e.g. Document-based NoSQL collections, relational schemas).",
    "collections": ["List of collections/tables needed (e.g. users, tasks, projects)"],
    "relationships": ["List of relationships between collections/tables (e.g. User has-many Tasks)"]
  },
  "apiFlow": "Description of the request-response lifecycle and communication flow between client and backend.",
  "integrations": ["List of key canonical technology names (e.g. React, Node.js, Express, MongoDB, Firebase Auth, Tailwind CSS, Axios)"]
}

CRITICAL RULES FOR INTEGRATIONS/SERVICES ARRAYS:
- Return ONLY simple canonical technology names.
- Do NOT include descriptions, explanations, or parenthetical notes.
- Do NOT include UI features, page names, or component names like "Profile Information", "Projects", "Experience Entries", "Skills", "Certifications", "Social Links".
- Do NOT include libraries with descriptive suffixes like "Framer Motion (for complex animations)". Just return "Framer Motion".
- Do NOT include animation/scroll utilities unless they are core architecture dependencies.
- Bad examples: "Framer Motion (for complex animations", "GSAP (likely for...)", "Lucide React (for vector icons)", "Sharp (likely for...)", "Profile Information".
- Good examples: "React", "Framer Motion", "GSAP", "Lenis", "Lucide React", "Tailwind CSS", "Sharp".
- If you cannot derive a specific detail, use "N/A" rather than making up descriptive text.
`;

  const parsed = await callAiProvider(prompt, model);
  if (parsed && typeof parsed === 'object') {
    return parsed;
  }

  // Baseline fallback
  console.log(`[kilo-gateway] Using deterministic baseline architecture generation for ${projectName}`);
  return generateFallbackArchitecture(projectName, projectDescription, '');
};

module.exports = {
  analyzeArchitectureWithKilo,
  generateArchitectureWithKilo,
  generateFallbackArchitecture,
};
