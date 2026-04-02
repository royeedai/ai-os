#!/usr/bin/env node

const { assert, section } = require("./helpers");

section("shared.js exports");
const shared = require("../bin/shared");
assert(typeof shared.cleanYamlScalar === "function", "cleanYamlScalar exported");
assert(typeof shared.parseInlineArray === "function", "parseInlineArray exported");
assert(typeof shared.SYM_OK === "string", "SYM_OK exported");
assert(typeof shared.VALIDATION_SCHEMAS === "object", "VALIDATION_SCHEMAS exported");
assert(Array.isArray(shared.QUALITY_TIERS), "QUALITY_TIERS exported");
assert(Array.isArray(shared.IMPACT_TAGS), "IMPACT_TAGS exported");
assert(Array.isArray(shared.HIGH_RISK_SPECIAL_REVIEWS), "HIGH_RISK_SPECIAL_REVIEWS exported");

section("shared.js new exports");
assert(Array.isArray(shared.LITE_INCLUDES), "LITE_INCLUDES exported");
assert(Array.isArray(shared.LITE_DIR_PREFIXES), "LITE_DIR_PREFIXES exported");
assert(typeof shared.isLiteIncluded === "function", "isLiteIncluded exported");
assert(shared.isLiteIncluded("AGENTS.md") === true, "isLiteIncluded returns true for AGENTS.md");
assert(shared.isLiteIncluded(".agents/workflows/align.md") === true, "isLiteIncluded returns true for align workflow");
assert(shared.isLiteIncluded(".agents/skills/api-design/SKILL.md") === false, "isLiteIncluded returns false for supplementary skill");
