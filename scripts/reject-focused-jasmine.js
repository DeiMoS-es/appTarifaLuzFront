const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const focusedNames = new Set(['fit', 'fdescribe']);

function findFocusedDeclarations(source, fileName) {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const findings = [];

  function visit(node) {
    if (ts.isIdentifier(node) && focusedNames.has(node.text)) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      findings.push(`${fileName}:${position.line + 1}:${position.character + 1} ${node.text}`);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

function specFiles(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      return specFiles(entryPath);
    }
    return entry.isFile() && entry.name.endsWith('.spec.ts') ? [entryPath] : [];
  }).sort();
}

function assertNoFocusedSpecs(root) {
  const findings = specFiles(root).flatMap(file =>
    findFocusedDeclarations(fs.readFileSync(file, 'utf8'), path.relative(root, file))
  );

  if (findings.length > 0) {
    throw new Error(`Focused Jasmine declarations are forbidden:\n${findings.join('\n')}`);
  }
}

module.exports = { assertNoFocusedSpecs, findFocusedDeclarations };

if (require.main === module) {
  assertNoFocusedSpecs(path.resolve(process.argv[2] || 'src'));
  console.log('Focused Jasmine guard passed.');
}
