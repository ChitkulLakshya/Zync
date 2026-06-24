const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { Octokit } = require('octokit');
const { getRedisClient } = require('../utils/redisClient');
const crypto = require('crypto');
const { google } = require('googleapis');

// Helper to create an OAuth2 transporter
const createTransporter = async () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  const accessToken = await new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        console.error("Failed to create access token:", err);
        reject("Failed to create access token");
      }
      resolve(token);
    });
  });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.GMAIL_USER,
      accessToken,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN
    }
  });

  return transporter;
};

// POST /api/collaborator/request-otp
router.post('/request-otp', async (req, res) => {
  const { githubUsername, email } = req.body;

  if (!githubUsername || !email) {
    return res.status(400).json({ error: 'GitHub username and email are required.' });
  }

  try {
    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Store in Redis with an expiration of 10 minutes (600 seconds)
    const redisClient = getRedisClient();
    if (redisClient) {
      await redisClient.setEx(`collaborator_otp:${email}`, 600, otp);
    } else {
      console.warn("Redis client not available, OTP will not be stored.");
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    // Send OTP via email using OAuth2
    try {
      const transporter = await createTransporter();
      
      const mailOptions = {
        from: `"Zync Onboarding" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: `Your Zync Collaborator OTP Code`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
            <h2 style="color: #333;">Zync Collaborator Verification</h2>
            <p style="color: #555; line-height: 1.5;">You requested to join the Zync Beta program with the GitHub username <strong>${githubUsername}</strong>.</p>
            <p style="color: #555; line-height: 1.5;">Please use the following 6-digit code to verify your email and complete your registration:</p>
            
            <div style="background-color: #f4f4f5; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #18181b;">${otp}</span>
            </div>
            
            <p style="color: #555; font-size: 14px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      res.status(200).json({ success: true, message: 'OTP sent successfully.' });
    } catch (emailError) {
      console.error('Error sending OTP email:', emailError);
      return res.status(500).json({ error: 'Failed to send OTP email.' });
    }

  } catch (error) {
    console.error('Error in request-otp:', error);
    res.status(500).json({ error: 'Failed to process OTP request.' });
  }
});

// POST /api/collaborator/verify-otp
router.post('/verify-otp', async (req, res) => {
  const { email, githubUsername, otp } = req.body;

  if (!email || !githubUsername || !otp) {
    return res.status(400).json({ error: 'Email, GitHub username, and OTP are required.' });
  }

  try {
    const redisClient = getRedisClient();
    if (!redisClient) {
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    // Retrieve the stored OTP
    const storedOtp = await redisClient.get(`collaborator_otp:${email}`);

    if (!storedOtp) {
      return res.status(400).json({ error: 'OTP has expired or was not requested.' });
    }

    if (storedOtp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP.' });
    }

    // Clear the OTP
    await redisClient.del(`collaborator_otp:${email}`);

    // Proceed to add user as GitHub collaborator
    const githubToken = process.env.GITHUB_ADMIN_TOKEN;
    const repoOwner = process.env.GITHUB_REPO_OWNER;
    const repoName = process.env.GITHUB_REPO_NAME;
    let githubInviteStatus = 'Not configured';

    if (githubToken && repoOwner && repoName) {
      try {
        const octokit = new Octokit({ auth: githubToken });
        const response = await octokit.request('PUT /repos/{owner}/{repo}/collaborators/{username}', {
          owner: repoOwner,
          repo: repoName,
          username: githubUsername,
          permission: 'push',
          headers: {
            'X-GitHub-Api-Version': '2022-11-28'
          }
        });
        
        if (response.status === 201) {
          githubInviteStatus = 'Invitation sent successfully.';
        } else if (response.status === 204) {
          githubInviteStatus = 'User is already a collaborator.';
        } else {
          githubInviteStatus = `Unexpected status: ${response.status}`;
        }
      } catch (ghError) {
        console.error(`[BETA SIGNUP] Failed to invite ${githubUsername} to GitHub:`, ghError.message);
        return res.status(500).json({ error: `Verification successful, but GitHub invite failed: ${ghError.message}` });
      }
    } else {
      console.warn('[BETA SIGNUP] GitHub token or repo details missing. Skipping automated invite.');
      return res.status(500).json({ error: 'Verification successful, but GitHub integration is not configured.' });
    }

    // Optional: Notify Admin
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
      const transporter = await createTransporter();
      await transporter.sendMail({
        from: `"Zync System" <${process.env.GMAIL_USER}>`,
        to: adminEmail,
        subject: `New verified collaborator: ${githubUsername}`,
        text: `User ${githubUsername} (${email}) has verified their OTP and received a GitHub invitation.`
      });
    } catch (e) {
      console.warn('Could not send admin notification:', e.message);
    }

    res.status(200).json({ success: true, message: 'Verification successful. GitHub invitation sent!' });
  } catch (error) {
    console.error('Error in verify-otp:', error);
    res.status(500).json({ error: 'Failed to verify OTP.' });
  }
});

module.exports = router;
