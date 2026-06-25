const express = require('express');
const router = express.Router();
const verifyGithub = require('../middleware/verifyGithub');
const { processGithubWebhookJob } = require('../services/githubWebhookWorker');
const {
  registerWebhookProcessor,
  enqueueWebhookJob,
  getWebhookJobStatus,
} = require('../services/webhookQueue');

const isDebugWebhookEnabled =
  process.env.DEBUG_WEBHOOKS === 'true' || String(process.env.LOG_LEVEL || '').toLowerCase() === 'debug';

const debugWebhookLog = (...args) => {
  if (!isDebugWebhookEnabled) return;
  console.log(...args);
};

registerWebhookProcessor(processGithubWebhookJob);


router.post('/webhook', verifyGithub, async (req, res) => {
  try {
    const event = req.headers['x-github-event'];
    const deliveryId = req.headers['x-github-delivery'];
    const normalizedDeliveryId = String(deliveryId || '').trim();

    if (!normalizedDeliveryId) {
      return res.status(400).json({
        message: 'Missing x-github-delivery header',
      });
    }

    const enqueueResult = enqueueWebhookJob({
      deliveryId: normalizedDeliveryId,
      event,
      payload: req.body,
      getIo: () => req.app.get('io'),
    });

    debugWebhookLog(
      `[GitHub App Webhook] delivery=${normalizedDeliveryId} event=${event || 'unknown'} duplicate=${enqueueResult.duplicate}`
    );

    return res.status(202).json({
      message: enqueueResult.duplicate ? 'Duplicate delivery already queued/processed' : 'Webhook accepted',
      duplicate: enqueueResult.duplicate,
      deliveryId: normalizedDeliveryId,
      job: enqueueResult.job,
    });
  } catch (error) {
    console.error('[GitHub App Webhook] Error:', error);
    return res.status(500).json({ message: 'Webhook enqueue failed', error: error.message });
  }
});


router.get('/webhook/jobs/:deliveryId', (req, res) => {
  const { deliveryId } = req.params;
  const job = getWebhookJobStatus(deliveryId);
  if (!job) {
    return res.status(404).json({ message: 'Job not found', deliveryId });
  }
  return res.json({ job });
});

module.exports = router;
