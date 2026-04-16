const fs = require('fs');
const filePath = '/Users/dai/Downloads/test_skill2/test/gate.test.js';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(
  /run\("create-ai-os\.js", \[(.+?), "--with-project-files"\]\)/g,
  'run("create-ai-os.js", [$1, "--with-project-files", "--legacy-layout"])'
);
fs.writeFileSync(filePath, content, 'utf8');
console.log("gate.test.js updated.");
