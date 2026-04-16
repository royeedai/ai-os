#!/usr/bin/env node

const { assert, section } = require("./helpers");

section("shared.js exports");
const shared = require("../bin/shared");
assert(typeof shared.cleanYamlScalar === "function", "cleanYamlScalar exported");
assert(typeof shared.parseInlineArray === "function", "parseInlineArray exported");
assert(typeof shared.listProjectEvalFiles === "function", "listProjectEvalFiles exported");
assert(typeof shared.validateFailureModeGuards === "function", "validateFailureModeGuards exported");
assert(typeof shared.getProjectLanesRoot === "function", "getProjectLanesRoot exported");
assert(typeof shared.getLaneRelativePath === "function", "getLaneRelativePath exported");
assert(typeof shared.getLaneFilePath === "function", "getLaneFilePath exported");
assert(typeof shared.getLaneMetadataPath === "function", "getLaneMetadataPath exported");
assert(typeof shared.listProjectLanes === "function", "listProjectLanes exported");
assert(typeof shared.inspectLaneWorktreeImpact === "function", "inspectLaneWorktreeImpact exported");
assert(typeof shared.inspectProjectDeliveryLayout === "function", "inspectProjectDeliveryLayout exported");
assert(typeof shared.resolveProjectLane === "function", "resolveProjectLane exported");
assert(typeof shared.isLaneArtifactPath === "function", "isLaneArtifactPath exported");
assert(typeof shared.resolveDeliveryPath === "function", "resolveDeliveryPath exported");
assert(typeof shared.formatDeliveryPath === "function", "formatDeliveryPath exported");
assert(typeof shared.SYM_OK === "string", "SYM_OK exported");
assert(typeof shared.VALIDATION_SCHEMAS === "object", "VALIDATION_SCHEMAS exported");
assert(Array.isArray(shared.QUALITY_TIERS), "QUALITY_TIERS exported");
assert(Array.isArray(shared.IMPACT_TAGS), "IMPACT_TAGS exported");
assert(Array.isArray(shared.HIGH_RISK_SPECIAL_REVIEWS), "HIGH_RISK_SPECIAL_REVIEWS exported");
assert(shared.LANES_DIR === "lanes", "LANES_DIR exported");
assert(shared.DEFAULT_LANE_ID === "default", "DEFAULT_LANE_ID exported");
assert(typeof shared.validateLaneId === "function", "validateLaneId exported");
assert(typeof shared.createInitialBaselineContext === "function", "createInitialBaselineContext exported");
assert(typeof shared.buildLaneMetadata === "function", "buildLaneMetadata exported");
assert(typeof shared.writeLaneMetadata === "function", "writeLaneMetadata exported");
assert(shared.LANE_STATUS_ACTIVE === "active", "LANE_STATUS_ACTIVE exported");
assert(shared.LANE_STATUS_DRAFT === "draft", "LANE_STATUS_DRAFT exported");
assert(shared.LANE_STATUS_ARCHIVED === "archived", "LANE_STATUS_ARCHIVED exported");
assert(Array.isArray(shared.LANE_STATUSES), "LANE_STATUSES exported");

section("shared.js new exports");
assert(Array.isArray(shared.LITE_INCLUDES), "LITE_INCLUDES exported");
assert(Array.isArray(shared.LITE_DIR_PREFIXES), "LITE_DIR_PREFIXES exported");
assert(typeof shared.isLiteIncluded === "function", "isLiteIncluded exported");
assert(shared.isLiteIncluded("AGENTS.md") === true, "isLiteIncluded returns true for AGENTS.md");
assert(shared.isLiteIncluded(".agents/workflows/align.md") === true, "isLiteIncluded returns true for align workflow");
assert(shared.isLiteIncluded(".agents/skills/api-design/SKILL.md") === false, "isLiteIncluded returns false for supplementary skill");
