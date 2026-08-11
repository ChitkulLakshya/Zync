/**
 * Architecture Agent chat — non-JSON conversational assistant backed by the
 * Kilo Code Gateway (same provider as architecture analysis).
 */
const express = require('express');
const axios = require('axios');

const authMiddleware = require('../middleware/authMiddleware');
const Project = require('../models/Project');
const { chatThrottle, getUserQuota } = require('../services/usageService');

const router = express.Router();

const KILO_CODE_GATEWAY_URL = process.env.KILO_CODE_GATEWAY_URL || '';
const KILO_CODE_GATEWAY_API_KEY = process.env.KILO_CODE_GATEWAY_API_KEY || '';
const KILO_CODE_GATEWAY_MODEL = process.env.KILO_CODE_GATEWAY_MODEL || 'kilo-auto/free';

router.post('/chat', authMiddleware, async (req, res) => {
  if (!KILO_CODE_GATEWAY_URL || !KILO_CODE_GATEWAY_API_KEY) {
    // Client falls back to canned replies when gateway unconfigured.
    return res.status(503).json({ error: 'Architecture agent is not configured.' });
  }

  const { projectId, message, history = [] } = req.body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  // Soft chat throttle (min-gap per user) — pacing, never a hard block.
  const waitMs = await chatThrottle(req.user.uid);
  if (waitMs > 0) {
    await new Promise((r) => setTimeout(r, waitMs));
  }

  let projectContext = '';
  if (projectId) {
    try {
      const project = await Project.findById(projectId).lean();
      if (project) {
        const arch = project.architecture || {};
        projectContext = `
Project: ${project.name || 'Unnamed'}
Description: ${project.description || 'N/A'}
Repo: ${project.githubRepoOwner || ''}/${project.githubRepoName || ''}
High-level architecture: ${arch.highLevel || 'N/A'}
Frontend: ${JSON.stringify(arch.frontend || {})}
Backend: ${JSON.stringify(arch.backend || {})}
Database: ${JSON.stringify(arch.database || {})}
Integrations: ${Array.isArray(arch.integrations) ? arch.integrations.join(', ') : 'N/A'}
`;
      }
    } catch (err) {
      console.error('[ArchitectureAgent] Failed to load project context:', err.message);
    }
  }

  const systemPrompt = `You are the Zync Architecture Agent, a helpful assistant embedded in a visual architecture-diagram tool.
You help users understand, modify, and regenerate architecture diagrams.
You may recommend concrete changes (add/remove components, change tech stack) but never mutate the diagram yourself.
Be concise and concrete. When proposing changes, match the user's plan to actual component names (Frontend, Backend, Database, external services).

Current project architecture (may be empty):
${projectContext || 'No project context.'}
`;

  try {
    const response = await axios.post(
      `${KILO_CODE_GATEWAY_URL}/v1/chat/completions`,
      {
        model: KILO_CODE_GATEWAY_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...(Array.isArray(history) ? history.slice(-10) : []),
          { role: 'user', content: message },
        ],
        temperature: 0.7,
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
    return res.json({ reply: text.trim() || 'Sorry, I could not come up with a response.' });
  } catch (err) {
    console.error('[ArchitectureAgent] Upstream error:', err.message);
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      return res.status(status).json({ error: 'Architecture agent authentication failed.' });
    }
    if (status >= 500 || !status) {
      return res.status(502).json({ error: 'Architecture agent upstream unavailable.' });
    }
    return res.status(400).json({ error: err.response?.data?.error?.message || 'Architecture agent request failed.' });
  }
});

router.get('/quota', authMiddleware, async (req, res) => {
  const quota = await getUserQuota(req.user.uid);
  return res.json(quota);
});

module.exports = router;