const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  assertNoFocusedSpecs,
  findFocusedDeclarations
} = require('./reject-focused-jasmine');

test('detects focused Jasmine calls with whitespace', () => {
  const source = `describe('suite', () => {\n  fit  ('case', () => {});\n});\nfdescribe\n('other', () => {});`;

  assert.deepEqual(findFocusedDeclarations(source, 'focused.spec.ts'), [
    'focused.spec.ts:2:3 fit',
    'focused.spec.ts:4:1 fdescribe'
  ]);
});

test('ignores comments, strings, and longer identifiers', () => {
  const source = `// fit('comment')\nconst text = "fdescribe('string')";\nbenefit();\nfitResult();`;

  assert.deepEqual(findFocusedDeclarations(source, 'clean.spec.ts'), []);
});

test('rejects focused calls found in project spec files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'focused-jasmine-'));
  fs.writeFileSync(path.join(root, 'guard.spec.ts'), `fit('only', () => {});`);

  assert.throws(
    () => assertNoFocusedSpecs(root),
    /guard\.spec\.ts:1:1 fit/
  );
});
