#!/usr/bin/env node

const { getSummary } = require("./helpers");

require("./docs.test");
require("./shared.test");
require("./unit-shared.test");
require("./unit-project-state.test");
require("./install.test");
require("./lab.test");
require("./validate.test");
require("./upgrade.test");
require("./e2e.test");
require("./lite.test");
require("./ide.test");
require("./examples.test");
require("./team.test");
require("./real-project-validation.test");

const { passed, failed } = getSummary();
process.stdout.write(`\nSummary: ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
