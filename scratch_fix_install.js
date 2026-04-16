const fs = require('fs');
const testPath = '/Users/dai/Downloads/test_skill2/test/install.test.js';
let content = fs.readFileSync(testPath, 'utf8');

content = content.replace(
  'const validateResult = run("ai-os-validate.js", [initDir]);',
  `const legacyInitDir = tmpDir();
run("create-ai-os.js", [legacyInitDir, "--with-project-files", "--legacy-layout"]);
const validateResult = run("ai-os-validate.js", [legacyInitDir]);
cleanup(legacyInitDir);`
);

fs.writeFileSync(testPath, content, 'utf8');
console.log("install.test.js updated.");
