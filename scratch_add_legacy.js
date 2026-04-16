const fs = require('fs');

function addLegacy(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(
    /run\("create-ai-os\.js", \[(.+?), "--with-project-files"\]\)/g,
    'run("create-ai-os.js", [$1, "--with-project-files", "--legacy-layout"])'
  );
  // for commands that might be `ai-os-lab.js ...`
  // Actually lab.test.js tests ai-os-lab, not create-ai-os.
  // But ai-os-lab creates scenarios. Does ai-os-lab call createProjectFiles?
  fs.writeFileSync(filePath, content, 'utf8');
}

addLegacy('/Users/dai/Downloads/test_skill2/test/validate.test.js');
console.log("validate.test.js updated.");
