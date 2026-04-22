#!/usr/bin/env node

const { getSummary } = require("./helpers");

require("./docs.test");
require("./shared.test");
require("./install.test");
require("./doctor.test");
require("./upgrade.test");

const { passed, failed } = getSummary();
process.stdout.write(`\nSummary: ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
