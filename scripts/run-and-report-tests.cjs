const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const { sendEmail } = require('../backend/utils/emailService');
const { getTestReportEmailHtml } = require('../backend/utils/emailTemplates');

async function runAndReport() {
  console.log('Starting automated test execution...');
  let testOutput = '';
  let passed = 0;
  let failed = 0;
  let durationMs = 0;

  try {
    // Run Playwright tests with JSON reporter
    // We also run standard reporter to capture text output
    console.log('Running Playwright E2E tests...');
    process.env.PLAYWRIGHT_JSON_OUTPUT_NAME = 'test-results.json';
    
    // Using stdout so we capture what the user would see in console
    testOutput = execSync('npx playwright test --reporter=list,json', { 
      encoding: 'utf-8', 
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
  } catch (error) {
    // execSync throws if exit code > 0 (meaning tests failed)
    testOutput = error.stdout || error.message;
    console.log('Some tests failed during execution.');
  }

  // Parse the JSON output for accurate metrics
  const jsonReportPath = path.join(__dirname, '../test-results.json');
  if (fs.existsSync(jsonReportPath)) {
    try {
      const report = JSON.parse(fs.readFileSync(jsonReportPath, 'utf8'));
      passed = report.stats?.expected || 0;
      failed = report.stats?.unexpected || 0;
      durationMs = report.stats?.duration || 0;
    } catch (e) {
      console.error('Failed to parse test-results.json', e);
    }
  }

  const durationSecs = (durationMs / 1000).toFixed(1);
  const durationText = `${durationSecs}s`;

  console.log(`Execution complete. Passed: ${passed}, Failed: ${failed}, Time: ${durationText}`);

  // Generate Email HTML
  const html = getTestReportEmailHtml({
    passed,
    failed,
    duration: durationText,
    testOutput
  });

  // Send Email
  console.log('Dispatching email report to consolemaster@gmail.com...');
  await sendEmail({
    to: 'consolemaster@gmail.com',
    subject: `Weekly Zync Test Report: ${failed > 0 ? '❌ Failed' : '✅ Passed'}`,
    text: `Test Execution Complete. Passed: ${passed}, Failed: ${failed}. Check your HTML client to view the full report.`,
    html
  });

  console.log('Report dispatched successfully.');
  
  // Exit with correct code so CI fails if tests failed
  if (failed > 0) {
    process.exit(1);
  }
}

runAndReport().catch(err => {
  console.error('Fatal error during test reporting:', err);
  process.exit(1);
});
