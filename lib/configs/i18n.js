const path = require('path');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');
const { parseCode, generateCode, insertCodeAfterImport, addImportDeclaration } = require('../utils/astHelper');

module.exports = (api, i18n) => {
  const { context } = api;
  // i18n
  if (i18n) {
    const entryFile = 'app.tsx';
    const entryCode = `import * as React from 'react';${api.getEntryCode()}`;
    const importIdentifier = 'LocaleProvider';
    const astProvider = parseCode(`const appConfig = {
      LocalProvider: ({ children}) => (<LocaleProvider locale={locale}>{children}</LocaleProvider>)
    }`);
    let providerNode = null;
    traverse(astProvider, {
      ArrowFunctionExpression(nodePath) {
        providerNode = nodePath.node;
      },
    });
    const ast = parseCode(entryCode);
    traverse(ast, {
      Program(nodePath) {
        const { node } = nodePath;
        addImportDeclaration(node, importIdentifier, '@/components/LocaleProvider');
        addImportDeclaration(node, { local: 'getLocale', imported: 'getLocale' }, '@/utils/locale');
      },
      VariableDeclarator(nodePath) {
        const { node } = nodePath;
        if (t.isIdentifier(node.id, { name: 'appConfig' })) {
          // check identifier app
          const properties = node.init.properties;
          const appNode = properties.find((node) => t.isIdentifier(node.key, { name: 'app'}));
          // add addProvider of appConfig，暂不考虑多个 Provider 嵌套场景
          const appProviderNode = t.objectProperty(t.identifier('addProvider'), providerNode);
          if (appNode) {
            appNode.value.properties.push(appProviderNode);
          } else {
            // create app node
            node.init.properties.push(t.objectProperty(t.identifier('app'), t.objectExpression([appProviderNode])));
          } 
        }
      },
    });
    const insertCode = 'const locale = getLocale();';
    insertCodeAfterImport(ast, insertCode);
    // i18n resource
    ['components/LocaleProvider', 'utils/locale.ts', 'locales'].forEach((source) => {
      api.addSource({ source: path.join(context.templateDir, 'src', source), targetDir: path.join(context.rootDir, 'src', source) });
    });
    api.extendPackage({
      dependencies: {
        'react-intl': '^2.8.0',
      },
    });
    api.writeToProject(`./src/${entryFile}`, generateCode(ast));
  }
};
