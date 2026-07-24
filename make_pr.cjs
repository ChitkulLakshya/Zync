const fs = require('fs');
const { execSync } = require('child_process');

try { execSync('git restore src/pages/Login.tsx'); } catch(e) {}

let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');

// Step 1: Add loading wrapper
code = code.replace(
  '  const handleContinue = async () => {\n    if (currentUser) {\n      await postLoginRedirect(navigate, currentUser);\n    }\n  };',
  '  const handleContinue = async () => {\n    if (currentUser) {\n      setLoading(true);\n      try {\n        await postLoginRedirect(navigate, currentUser);\n      } finally {\n        setLoading(false);\n      }\n    }\n  };'
);
fs.writeFileSync('src/pages/Login.tsx', code);
execSync('git add src/pages/Login.tsx');
execSync('git commit -m "refactor(login): extract loading state handling in handleContinue" --author="Chitkul Lakshya <chitkullakshya@gmail.com>"');

// Step 2: Add disabled prop
code = code.replace(
  '<Button onClick={handleContinue} className="w-full h-12 text-lg">',
  '<Button onClick={handleContinue} className="w-full h-12 text-lg" disabled={loading}>'
);
fs.writeFileSync('src/pages/Login.tsx', code);
execSync('git add src/pages/Login.tsx');
execSync('git commit -m "feat(login): disable continue button during dashboard connection" --author="Chitkul Lakshya <chitkullakshya@gmail.com>"');

// Step 3: Add spinner
code = code.replace(
  '              Continue to Dashboard <ArrowRight className="ml-2 w-5 h-5" />',
  '              {loading ? (\n                <>\n                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />\n                  Connecting...\n                </>\n              ) : (\n                <>\n                  Continue to Dashboard <ArrowRight className="ml-2 w-5 h-5" />\n                </>\n              )}'
);
fs.writeFileSync('src/pages/Login.tsx', code);
execSync('git add src/pages/Login.tsx');
execSync('git commit -m "feat(login): add visual spinner feedback for dashboard connection" --author="Chitkul Lakshya <chitkullakshya@gmail.com>"');

console.log('3 commits created successfully.');
