const crypto = require('crypto');

// Do not throw at module load: the API must boot on hosts (e.g. Render) before env is fully wired.
// Missing secret still fails closed per request below.
if (
  process.env.NODE_ENV === 'production' &&
  !process.env.GITHUB_WEBHOOK_SECRET
) {
  console.warn(
    '[verifyGithub] GITHUB_WEBHOOK_SECRET is unset; GitHub webhook routes will return 500 until set.'
  );
}

const verifyGithub = (req, res, next) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      return res
        .status(500)
        .json({ message: 'Webhook secret is not configured' });
    }

    if (!signature) {
      return res.status(401).json({ message: 'No signature provided' });
    }

    if (!req.rawBody) {
      console.error(
        'req.rawBody is missing. Ensure json parser verify option is set.'
      );
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');

    const providedSig = Buffer.from(String(signature));
    const expectedSig = Buffer.from(String(digest));
    if (providedSig.length !== expectedSig.length) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    if (!crypto.timingSafeEqual(providedSig, expectedSig)) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    return next();
  } catch (error) {
    console.error('Webhook Verification Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = verifyGithub;
