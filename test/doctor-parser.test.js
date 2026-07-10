#!/usr/bin/env node

"use strict";

const {
  test,
  assert,
  readRepo,
} = require("./helpers");
const doctorShared = require("../bin/doctor-shared");

const {
  CanonicalParseError,
  parseCanonicalToml,
  parseCanonicalYaml,
} = doctorShared;

function assertCanonicalError(block, { line, reason }) {
  assert.throws(block, (error) => {
    assert.equal(typeof CanonicalParseError, "function", "CanonicalParseError is exported");
    assert.equal(error instanceof CanonicalParseError, true, `unexpected error: ${error.stack}`);
    assert.equal(error.name, "CanonicalParseError");
    assert.equal(error.line, line);
    assert.equal(error.reason, reason);
    assert.match(error.message, new RegExp(`line ${line}.*${reason}`, "i"));
    return true;
  });
}

test("canonical parser APIs are exported", () => {
  assert.equal(typeof CanonicalParseError, "function");
  assert.equal(typeof parseCanonicalToml, "function");
  assert.equal(typeof parseCanonicalYaml, "function");
});

test("canonical TOML returns only allowlisted quoted strings on a null prototype", () => {
  const parsed = parseCanonicalToml([
    "# lane identity",
    'id = "default"',
    "",
    'status = "active"',
    'title = "默认交付线"',
    "  # trailing full-line comment",
    "",
  ].join("\r\n"), {
    requiredKeys: ["id", "status"],
    allowedKeys: ["id", "status", "title"],
  });

  assert.equal(Object.getPrototypeOf(parsed), null);
  assert.deepEqual(Object.keys(parsed), ["id", "status", "title"]);
  assert.equal(parsed.id, "default");
  assert.equal(parsed.status, "active");
  assert.equal(parsed.title, "默认交付线");
});

for (const fixture of [
  {
    name: "missing required key",
    content: 'id = "default"\n',
    options: { requiredKeys: ["id", "status"] },
    line: 0,
    reason: "missing key status",
  },
  {
    name: "duplicate key",
    content: 'id = "default"\nid = "other"\n',
    options: { requiredKeys: ["id"] },
    line: 2,
    reason: "duplicate key id",
  },
  {
    name: "single-quoted value",
    content: "id = 'default'\n",
    options: { requiredKeys: ["id"] },
    line: 1,
    reason: "unsupported TOML assignment",
  },
  {
    name: "unquoted value",
    content: "id = default\n",
    options: { requiredKeys: ["id"] },
    line: 1,
    reason: "unsupported TOML assignment",
  },
  {
    name: "inline comment",
    content: 'id = "default" # ambiguous\n',
    options: { requiredKeys: ["id"] },
    line: 1,
    reason: "unsupported TOML assignment",
  },
  {
    name: "unknown key",
    content: 'id = "default"\nextra = "value"\n',
    options: { requiredKeys: ["id"] },
    line: 2,
    reason: "unknown key extra",
  },
  {
    name: "table syntax",
    content: '[lane]\nid = "default"\n',
    options: { requiredKeys: ["id"] },
    line: 1,
    reason: "unsupported TOML assignment",
  },
]) {
  test(`canonical TOML rejects ${fixture.name}`, () => {
    assertCanonicalError(
      () => parseCanonicalToml(fixture.content, fixture.options),
      fixture,
    );
  });
}

test("canonical YAML parses the distributed tasks schema without field-order coupling", () => {
  const parsed = parseCanonicalYaml(readRepo("framework/.agents/templates/lane/tasks.yaml"));
  assert.equal(parsed.version, 5);
  assert.equal(parsed.scope.mode, "change");
  assert.equal(parsed.milestones.length, 2);
  assert.equal(parsed.tasks.length, 2);
  assert.equal(parsed.tasks[0].approval.required, false);
  assert.deepEqual(parsed.tasks[0].approval.approved_scope, []);
  assert.deepEqual(parsed.tasks[0].acceptance_refs, ["AC-001"]);
  assert.deepEqual(parsed.tasks[1].evidence_required, ["build-log", "test-log"]);
  assert.deepEqual(parsed.tasks[1].delivery_state, {
    code: "unknown",
    data: "unknown",
    runtime: "unknown",
  });
});

test("canonical YAML task field order is semantically irrelevant", () => {
  const parsed = parseCanonicalYaml(`
version: 5
tasks:
  - title: "Task"
    owner: AI
    id: TASK-001
`);
  assert.equal(parsed.tasks[0].id, "TASK-001");
  assert.equal(parsed.tasks[0].owner, "AI");
  assert.equal(parsed.tasks[0].title, "Task");
});

test("canonical YAML parses nested approval, evidence, comments, and exact scalars", () => {
  const parsed = parseCanonicalYaml(String.raw`# document comment
version: +5 # decimal integer
enabled: true
offset: -2
nothing: null
empty: []
quoted: "hash # retained"
escaped: "slash\\quote\"line\ncarriage\rindent\t"
plain: enum-value # inline comment
tasks:
  - id: TASK-001
    approval:
      required: false
      conditions: []
    evidence_produced:
      - id: "test-log"
        kind: test
        exit_code: 0
`);

  assert.equal(parsed.version, 5);
  assert.equal(parsed.enabled, true);
  assert.equal(parsed.offset, -2);
  assert.equal(parsed.nothing, null);
  assert.deepEqual(parsed.empty, []);
  assert.equal(parsed.quoted, "hash # retained");
  assert.equal(parsed.escaped, "slash\\quote\"line\ncarriage\rindent\t");
  assert.equal(parsed.plain, "enum-value");
  assert.deepEqual(parsed.tasks[0].approval.conditions, []);
  assert.equal(parsed.tasks[0].evidence_produced[0].exit_code, 0);
});

test("canonical YAML leaves duplicate task IDs for the schema validator", () => {
  const parsed = parseCanonicalYaml(`tasks:
  - id: TASK-001
  - id: TASK-001
`);
  assert.deepEqual(parsed.tasks.map((task) => task.id), ["TASK-001", "TASK-001"]);
});

test("canonical YAML defines prototype-named keys as safe own data properties", () => {
  const parsed = parseCanonicalYaml(`__proto__: explicit
constructor: canonical
prototype: retained
`);
  assert.equal(Object.getPrototypeOf(parsed), Object.prototype);
  assert.equal(Object.hasOwn(parsed, "__proto__"), true);
  assert.equal(Object.hasOwn(parsed, "constructor"), true);
  assert.equal(parsed.__proto__, "explicit");
  assert.equal(parsed.constructor, "canonical");
  assert.equal(parsed.prototype, "retained");
  assert.equal({}.polluted, undefined);
});

test("canonical YAML comment scanning respects escaped quotes", () => {
  const parsed = parseCanonicalYaml(String.raw`value: "quote \" # retained" # removed
next: canonical
`);
  assert.equal(parsed.value, 'quote " # retained');
  assert.equal(parsed.next, "canonical");
});

for (const [name, content, line, reason] of [
  ["duplicate mapping keys", "id: A\nid: B\n", 2, "duplicate key id"],
  ["tabs", "tasks:\n\t- id: A\n", 2, "tabs are not supported"],
  ["odd indentation", "tasks:\n   - id: A\n", 2, "indentation must use multiples of two spaces"],
  ["skipped indentation level", "tasks:\n    - id: A\n", 2, "invalid indentation"],
  ["unexpected nested content", "id: A\n  owner: AI\n", 2, "invalid indentation"],
  ["empty implicit scalar", "id:\nowner: AI\n", 1, "empty scalar id"],
  ["root sequence", "- id: A\n", 1, "root must be a mapping"],
  ["empty document", "# only a comment\n", 0, "empty YAML document"],
  ["single-quoted scalar", "id: 'A'\n", 1, "unsupported YAML scalar"],
  ["flow sequence", "ids: [A, B]\n", 1, "unsupported YAML form"],
  ["floating point", "version: 5.0\n", 1, "unsupported YAML scalar"],
  ["malformed escape", String.raw`value: "bad\u1234"` + "\n", 1, "unsupported escape"],
  ["unterminated quote", 'value: "bad\n', 1, "unterminated double-quoted string"],
  ["quoted mapping key", '"id": A\n', 1, "unsupported YAML mapping"],
  ["unrecognized whole line", "id: A\nthis is not YAML\nowner: AI\n", 2, "unsupported YAML mapping"],
]) {
  test(`canonical YAML rejects ${name}`, () => {
    assertCanonicalError(() => parseCanonicalYaml(content), { line, reason });
  });
}

for (const unsupported of ["&anchor", "*anchor", "!tag", "|", ">", "{ id: A }"]) {
  test(`canonical YAML rejects unsupported form ${unsupported}`, () => {
    assertCanonicalError(
      () => parseCanonicalYaml(`tasks:\n  - id: A\n    value: ${unsupported}\n`),
      { line: 3, reason: "unsupported YAML form" },
    );
  });
}
