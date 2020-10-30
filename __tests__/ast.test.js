const fse = require('fs-extra');
const path = require('path');
const traverse = require('@babel/traverse');
const generate = require('@babel/generator');
const t = require('@babel/types');
const { parseCode, addImportDeclaration, getRenderNode, wrapJSXNode } = require('../lib/utils/astHelper');

test('add import declaration', () => {
  const orignalCode = fse.readFileSync(path.join(__dirname, './case/index.sample.js'), 'utf-8');
  const ast = parseCode(orignalCode);
  traverse.default(ast, {
    Program(path) {
      const { node } = path;
      addImportDeclaration(node, 'LocaleProvider', '@/components/LocaleProvider');
    },
  });
  expect(generate.default(ast).code).toBe(fse.readFileSync(path.join(__dirname, './expects/expect.import.js'), 'utf-8'));
});

test('add entry wrap', () => {
  const orignalCode = fse.readFileSync(path.join(__dirname, './case/index.sample.js'), 'utf-8');
  const ast = parseCode(orignalCode);
  traverse.default(ast, {
    Program(path) {
      const { node } = path;
      const importIdentifier = 'LocaleProvider';
      addImportDeclaration(node, importIdentifier, '@/components/LocaleProvider');
      const renderNode = getRenderNode(node);
      wrapJSXNode(renderNode, importIdentifier, 'locale', 'locale');
    },
  });
  expect(generate.default(ast).code).toBe(fse.readFileSync(path.join(__dirname, './expects/expect.wrap.js'), 'utf-8'));
});
