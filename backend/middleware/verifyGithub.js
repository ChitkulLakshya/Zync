const crypto = require('crypto');

const verifyGithub = (req, res, next) => {
    try {
        const signature = req.headers['x-hub-signature-256'];
        const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

        if (!WEBHOOK_SECRET) {
            console.warn("GITHUB_WEBHOOK_SECRET is missing. Webhook signature verification skipped.");
            return next();
        }

        if (!signature) {
            return res.status(401).json({ message: 'No signature provided' });
        }

        if (!req.rawBody) {
            console.error("req.rawBody is missing. Ensure json parser verify option is set.");
            return res.status(500).json({ message: 'Server configuration error' });
        }

        const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
        const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');

        if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
            return next();
        } else {
            return res.status(401).json({ message: 'Invalid signature' });
        }
    } catch (error) {
        console.error("Webhook Verification Error:", error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = verifyGithub;
