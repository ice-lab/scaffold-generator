const path = require('path');
const t = require('@babel/types');
const traverse = require('@babel/traverse').default;
const { parseCode, generateCode } = require('../utils/astHelper');

module.exports = (api, menu, config) => {
  const { context } = api;
  const { layouts } = config;

  if (menu && layouts) {
    const defaultCode = `
const headerMenuConfig = [];
const asideMenuConfig = [];
export { headerMenuConfig, asideMenuConfig };
    `;
    const ast = parseCode(defaultCode);
    const menuConfig = {
      asideMenuConfig: 'asideMenu',
      headerMenuConfig: 'headerMenu',
    };
    const targetPath = {};
    traverse(ast, {
      VariableDeclaration(nodePath) {
        const { node } = nodePath;
        if (t.isVariableDeclarator(node.declarations[0])) {
          Object.keys(menuConfig).forEach((configKey) => {
            if (t.isIdentifier(node.declarations[0].id, { name: configKey })) {
              targetPath[configKey] = nodePath;
            }
          });
        }
      },
    });

    Object.keys(targetPath).forEach((configKey) => {
      targetPath[configKey].replaceWith(parseCode(`const ${configKey} = ${JSON.stringify(menu[menuConfig[configKey]] || [])}`));
    });
    layouts.forEach((layoutConfig) => {
      const { name } = layoutConfig;
      if (layoutConfig.menuConfig) {
        const menuConfigPath = path.join(context.rootDir, `./src/layouts/${name}/menuConfig.ts`);
        api.writeToProject(menuConfigPath, generateCode(ast));
      }
    });
  }
};
