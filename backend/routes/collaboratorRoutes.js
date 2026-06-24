const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { Octokit } = require('octokit');

router.post('/', async (req, res) => {
  const { githubUsername, githubProfileUrl, email } = req.body;

  if (!githubUsername || !email) {
    return res.status(400).json({ error: 'GitHub username and email are required.' });
  }

  try {
    // 1. GitHub API Integration for automatic collaborator invite
    const githubToken = process.env.GITHUB_ADMIN_TOKEN;
    const repoOwner = process.env.GITHUB_REPO_OWNER;
    const repoName = process.env.GITHUB_REPO_NAME;
    let githubInviteStatus = 'Not configured';

    if (githubToken && repoOwner && repoName) {
      try {
        const octokit = new Octokit({ auth: githubToken });
        // Invite the user as a collaborator with 'push' permission
        // 'push' allows them to push feature branches. Branch protection on 'main' restricts merging.
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
        console.log(`[BETA SIGNUP] GitHub invite status for ${githubUsername}: ${githubInviteStatus}`);
      } catch (ghError) {
        console.error(`[BETA SIGNUP] Failed to invite ${githubUsername} to GitHub:`, ghError.message);
        githubInviteStatus = `Failed: ${ghError.message}`;
      }
    } else {
      console.warn('[BETA SIGNUP] GitHub token or repo details missing. Skipping automated invite.');
    }

    // Determine the admin email from environment, or fallback for safety
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

    // If SMTP credentials are provided, try to send an email
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: `"Zync Beta Onboarding" <${process.env.SMTP_USER}>`,
        to: adminEmail,
        subject: `New Zync Beta Collaborator: ${githubUsername}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
            <h2 style="color: #333;">New Beta Collaborator Signup</h2>
            <p style="color: #555; line-height: 1.5;">A new user has requested to join the Zync Beta program!</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>GitHub Username:</strong> ${githubUsername}</p>
              <p style="margin: 0 0 10px 0;"><strong>GitHub Profile:</strong> <a href="${githubProfileUrl}" style="color: #0366d6;">${githubProfileUrl}</a></p>
              <p style="margin: 0;"><strong>Email Address:</strong> <a href="mailto:${email}" style="color: #0366d6;">${email}</a></p>
            </div>
            
            <p style="color: #888; font-size: 12px; margin-top: 30px;">This message was generated automatically by the Zync Onboarding System.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
    } else {
      console.warn('SMTP credentials not found in .env. Skipping actual email dispatch.');
      console.log(`[BETA SIGNUP] User: ${githubUsername}, Email: ${email}`);
    }

    res.status(200).json({ success: true, message: 'Application received successfully.' });
  } catch (error) {
    console.error('Error dispatching collaborator beta email:', error);
    res.status(500).json({ error: 'Failed to process your application. Please try again later.' });
  }
});

module.exports = router;
