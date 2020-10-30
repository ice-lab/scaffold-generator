const fse = require('fs-extra');
const path = require('path');
const traverse = require('@babel/traverse');
const t = require('@babel/types');
const { parseCode, generateCode, addImportDeclaration } = require('../utils/astHelper');

module.exports = (api, auth) => {
  const { context } = api;
  if (auth) {
    ['src/components/Auth', 'src/components/Exception'].forEach((source) => {
      api.addSource({ source: path.join(context.templateDir, source), targetDir: path.join(context.rootDir, source) });
    });
    api.extendPackage({
      dependencies: {
        '@icedesign/container': '^1.0.5',
      },
    });
    
    // TODO addSource of components/Exception
    api.onHook('afterGenerate', () => {
      // get first page
      const dirPath = path.join(context.rootDir, 'src/pages');
      const dirs = fse.readdirSync(dirPath);
      if (dirs && dirs.length) {
        const filePath = path.join(dirPath, dirs[0], 'index.tsx');
        try {
          const pageCode  = fse.readFileSync(filePath, 'utf-8');
          const ast = parseCode(pageCode);
          traverse.default(ast, {
            Program(nodePath) {
              const { node } = nodePath;
              addImportDeclaration(node, { local: 'withAuth', imported: 'withAuth' }, '@/components/Auth');
            },
            ExportDefaultDeclaration(nodePath) {
              if (t.isIdentifier(nodePath.node.declaration)) {
                nodePath.replaceWith(t.exportDefaultDeclaration(t.callExpression(
                  t.callExpression(
                    t.identifier('withAuth'),
                    [t.objectExpression([
                      t.objectProperty(
                        t.identifier('authorities'),
                        t.arrayExpression([
                          t.stringLiteral('admin'),
                          t.stringLiteral('user'),
                        ]),
                      ),
                    ])],
                  ),
                  [t.identifier(nodePath.node.declaration.name)],
                )));
              }
            },
          });
          api.writeToProject(filePath, generateCode(ast));
        } catch (error) {
          console.log(error);
          console.log(`fail to read content of ${filePath}`);
        }
      }
    });
  }
};
