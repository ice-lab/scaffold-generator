const _ = require('lodash');
const parser = require('@babel/parser');
const generate = require('@babel/generator');
const traverse = require('@babel/traverse');
const t = require('@babel/types');
const prettierFormat = require('./prettierFormat');

const addImportDeclaration = (node, specifiers, importPath) => {
  const { body } = node;
  const lastImportIndex = _.findLastIndex(body, (item) => t.isImportDeclaration(item));

  const importSpecifiers = (Array.isArray(specifiers) ? specifiers : [specifiers]).map((specifier) => {
    return specifier.imported
      ? t.importSpecifier(t.identifier(specifier.local), t.identifier(specifier.imported))
      : t.importDefaultSpecifier(t.identifier(specifier));
  });
  const newImport = t.importDeclaration(
    importSpecifiers,
    t.stringLiteral(importPath),
  );
  body.splice(lastImportIndex + 1, 0, newImport);
};

const getRenderNode = (node) => {
  const { body } = node;
  const reactDOMDeclaration = _.find(body, (item) => t.isImportDeclaration(item) && item.source.value === 'react-dom');

  let importDefaultSpecifier = false;
  let importSpecifier = false;
  if (reactDOMDeclaration.specifiers) {
    reactDOMDeclaration.specifiers.forEach((specifier) => {
      if (t.isImportDefaultSpecifier(specifier)) {
        importDefaultSpecifier = true;
      } else if (t.isImportSpecifier(specifier) && specifier.imported.name === 'render') {
        importSpecifier = true;
      }
    });
  }

  for (const item of body) {
    if (t.isExpressionStatement(item)) {
      const expressionNode = item.expression;
      if (importDefaultSpecifier
        && t.isMemberExpression(expressionNode.callee)
        && t.isIdentifier(expressionNode.callee.object, { name: 'ReactDOM' })
        && t.isIdentifier(expressionNode.callee.property, { name: 'render' })) {
        return item;
      } else if (importSpecifier && t.isIdentifier(expressionNode.callee, { name: 'render' })) {
        return item;
      }
    }
  }
};

const parseCode = (code) => {
  return parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript', 'decorators-legacy', 'dynamicImport', 'classProperties'],
  });
};

const insertCodeAfterImport = (ast, inserCode) => {
  let lastImport = null;
  traverse.default(ast, {
    ImportDeclaration(path) {
      lastImport = path;
    },
  });
  if (lastImport) {
    lastImport.insertAfter(parseCode(inserCode));
  } else {
    console.log('can not find import declaration');
  }
};

const generateCode = (ast) => {
  const { code } = generate.default(ast, {});
  return prettierFormat(code);
};

const wrapJSXNode = (node, importIdentifier, name, value) => {
  const jsxNode =
    t.jsxElement(
      t.jsxOpeningElement(t.jsxIdentifier(importIdentifier), [
        t.jsxAttribute(t.jsxIdentifier(name), t.JSXExpressionContainer(t.Identifier(value))),
      ]),
      t.jsxClosingElement(t.jsxIdentifier(importIdentifier)),
      [],
      false,
    );
  if (t.isCallExpression(node.expression.arguments[0])) {
    jsxNode.children = [t.jsxExpressionContainer(node.expression.arguments[0])];
  } else {
    jsxNode.children = [node.expression.arguments[0]];
  }
  // eslint-disable-next-line no-param-reassign
  node.expression.arguments[0] = jsxNode;
};

module.exports = {
  addImportDeclaration,
  getRenderNode,
  parseCode,
  insertCodeAfterImport,
  generateCode,
  wrapJSXNode,
};
