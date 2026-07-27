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
    "relationships": "Inferred key relationships"
  },
  "apiFlow": "How frontend communicates with backend",
  "integrations": ["Detected external libraries/SDKs"]
}

If you cannot derive specific details, ANY logical inference is better than null. Use "N/A" only if absolutely unknown.
`;

  const response = await axios.post(
    `${KILO_CODE_GATEWAY_URL}/v1/chat/completions`,
    {
      model,
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
