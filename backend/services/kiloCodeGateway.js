/**
 * @fileoverview kiloCodeGateway.js
 * @module kiloCodeGateway
 *
 * Kilo Code Gateway client for architecture analysis.
 * Placeholder implementation - user will add API key and configure endpoint.
 */

const axios = require('axios');

const KILO_CODE_GATEWAY_URL = process.env.KILO_CODE_GATEWAY_URL || '';
const KILO_CODE_GATEWAY_API_KEY = process.env.KILO_CODE_GATEWAY_API_KEY || '';
const KILO_CODE_GATEWAY_MODEL = process.env.KILO_CODE_GATEWAY_MODEL || 'autofree';

const analyzeArchitectureWithKilo = async ({ repoContext, projectName, model }) => {
  const selectedModel = model || KILO_CODE_GATEWAY_MODEL;
  if (!KILO_CODE_GATEWAY_URL || !KILO_CODE_GATEWAY_API_KEY) {
    throw new Error('Kilo Code Gateway is not configured. Set KILO_CODE_GATEWAY_URL and KILO_CODE_GATEWAY_API_KEY.');
  }

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

  const response = await axios.post(
    `${KILO_CODE_GATEWAY_URL}/v1/chat/completions`,
    {
      model: selectedModel,
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
      timeout: 120000,
    }
  );

  const text = response.data?.choices?.[0]?.message?.content || '';
  const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    console.error('Failed to parse Kilo Code Gateway response:', jsonString);
    throw new Error('Failed to parse architecture analysis response');
  }

  return parsed;
};

module.exports = {
  analyzeArchitectureWithKilo,
};
