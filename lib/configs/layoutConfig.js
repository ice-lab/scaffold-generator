const fse = require('fs-extra');
const path = require('path');
const t = require('@babel/types');
const traverse = require('@babel/traverse').default;
const { parseCode, generateCode, addImportDeclaration } = require('../utils/astHelper');

const SHELL_CONFIG = {
  nav: {
    property: 'Navigation',
  },
  navHoz: {
    property: 'Navigation',
    attribute: [
      [
        {
          method: 'isJSXIdentifier',
          property: 'name',
          value: {
            name: 'direction',
          },
        },
        {
          method: 'isLiteral',
          property: 'value',
          value: {
            value: 'hoz',
          },
        },
      ],
    ],
  },
  action: {
    property: 'Action',
  },
  branding: {
    property: 'Branding',
  },
  footer: {
    property: 'Footer',
  },
};

module.exports = (api, layoutTarget, layoutConfig) => {
  const { shell/* , mode, fixHeader */ } = layoutConfig;
  const { context } = api;
  if (shell) {
    const shellKeys = Object.keys(shell);
    const copySources = [];
    const imports = [];
    shellKeys.forEach((shellKey) => {
      const config = shell[shellKey];
      const data = Array.isArray(config) ? config : [config];
      data.forEach(({ type, source, name }) => {
        copySources.push({
          source: type === 'builtIn'
            ? path.join(context.templateDir, `src/components/${name}`)
            : path.join(context.customTemplate, source),
          targetDir: path.join(layoutTarget, `components/${name}`),
        });
        imports.push({ importIdentifier: name, importPath: `./components/${name}` });
      });
    });
    copySources.forEach((data) => {
      api.addSource(data);
    });
    api.onHook('afterGenerate', () => {
      const layoutPath = path.join(layoutTarget, 'index.tsx');
      const layoutCode = fse.readFileSync(layoutPath, 'utf-8');
      const ast = parseCode(layoutCode);
      traverse(ast, {
        Program(nodePath) {
          imports.forEach(({ importIdentifier, importPath }) => {
            addImportDeclaration(nodePath.node, importIdentifier, importPath);
          });
        },
        JSXElement(nodePath) {
          const { node } = nodePath;
          if (t.isJSXOpeningElement(node.openingElement)
            && t.isJSXMemberExpression(node.openingElement.name)
            && t.isJSXIdentifier(node.openingElement.name.object, { name: 'Shell' })) {
            const propertyNode = node.openingElement.name.property;
            shellKeys.forEach((shellKey) => {
              const astData = SHELL_CONFIG[shellKey];
              if (t.isJSXIdentifier(propertyNode, { name: astData.property })) {
                const config = shell[shellKey];
                const childrenData = Array.isArray(config) ? config : [config];
                let match = true;
                if (astData.attribute) {
                  match = false;
                  if (node.openingElement.attributes.length && astData.attribute.every((attributeItem, index) => {
                    const attribute = node.openingElement.attributes[index];
                    return attribute ? attributeItem.every((item) => {
                      const { method, property, value } = item;
                      return t[method](attribute[property], value);
                    }) : false;
                  })) {
                    match = true;
                  }
                }
                if (match) {
                  node.children = childrenData.map(({ name, props = {} }) => {
                    return t.jsxElement(
                      t.jsxOpeningElement(t.jsxIdentifier(name), Object.keys(props).map((key) => {
                        const value = props[key];
                        return t.jsxAttribute(t.jsxIdentifier(key), t.stringLiteral(value));
                      }), true),
                      null,
                      [],
                      true,
                    );
                  });
                }
              }
            });
          }
        },
      });
      api.writeToProject(layoutPath, generateCode(ast));
    });
  }
};
