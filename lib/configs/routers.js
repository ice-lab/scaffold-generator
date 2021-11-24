const _ = require('lodash');
const traverse = require('@babel/traverse');
const t = require('@babel/types');
const { parseCode, generateCode, addImportDeclaration, addLazyImport } = require('../utils/astHelper');

const analyzeRoute = (routerConfig) => {
  const imports = [];
  const pages = [];
  function parseRoute(routers) {
    return routers.map((router) => {
      return t.objectExpression(Object.keys(router).map((key) => {
        const value = router[key];
        if (key === 'children' && Array.isArray(value) && value.length > 0) {
          return t.objectProperty(t.identifier('children'), t.arrayExpression(parseRoute(value)));
        } else if (key === 'page' || key === 'component') {
          const componentName = _.upperFirst(value.name || value);
          imports.push({ name: componentName, path: `@/${key === 'component' ? 'layouts' : 'pages'}/${componentName}` });
          if (key === 'page' && value.blocks) pages.push(value);
          return t.objectProperty(t.identifier('component'), t.identifier(componentName));
        } else {
          return t.objectProperty(t.identifier(key), typeof value === 'boolean' ? t.booleanLiteral(value) : t.stringLiteral(value));
        }
      }).filter(Boolean));
    });
  }
  const elements = parseRoute(routerConfig);

  return {
    imports,
    pages,
    elements,
  };
};

const ROUTER_CONFIG_IDENTIFIER = 'routerConfig';
const SOLUTION_COMPONENTS = {
  store: {
    source: 'src/components/Tasks',
    name: 'Tasks',
  },
  mock: {
    source: 'src/components/UserInfo',
    name: 'UserInfo',
  },
  i18n: {
    source: 'src/components/SelectLang',
    name: 'SelectLang',
  },
};
module.exports = async (api, routerConfig, scaffoldConfig) => {
  const sampleKeys = ['store', 'mock', 'i18n', 'auth'];
  const addSample = sampleKeys.some((configKey) => {
    return scaffoldConfig[configKey];
  });
  if (addSample) {
    // find root path
    const rootItem = routerConfig.find((router) => router.path === '/');
    if (!rootItem) {
      console.log('[ERROR]', 'Fail to get root router');
    } else {
      // TODO check name conflict
      const samplePage = {
        path: '/solution',
        page: {
          name: 'solution',
          blocks: {
            packages: [
              {
                name: '@alifd/fusion-page-header',
                type: 'common',
                props: {
                  title: '官方推荐方案',
                  description: '包括状态管理方案、多语言切换的示例',
                  breadcrumbs: [],
                },
              },
              ...(sampleKeys.map((key) => {
                const configValue = scaffoldConfig[key];
                if (configValue) {
                  return SOLUTION_COMPONENTS[key] ? {
                    type: 'builtIn',
                    ...SOLUTION_COMPONENTS[key],
                  } : false;
                }
                return false;
              }).filter(Boolean)),
            ],
          },
        },
      };
      if (rootItem.children) {
        rootItem.children.unshift(samplePage);
      } else {
        rootItem.children = [samplePage];
      }
    }
  }
  const defaultCode = "import { IRouterConfig, lazy } from 'ice';const routerConfig: IRouterConfig[] = [];export default routerConfig;";
  const ast = parseCode(defaultCode);
  const { elements, pages, imports } = analyzeRoute(routerConfig);
  traverse.default(ast, {
    Program(path) {
      const { node } = path;
      let index = 0;
      imports.forEach(({ name, path: importPath }) => {
        index++;
        if (name.includes('Layout')) {
          addImportDeclaration(node, name, importPath);
        } else {
          // add lazy import
          addLazyImport(node, name, importPath, index);
        }
      });
    },
    VariableDeclarator(path) {
      const { node } = path;
      if (t.isIdentifier(node.id, { name: ROUTER_CONFIG_IDENTIFIER }) && t.isArrayExpression(node.init)) {
        node.init.elements = [...node.init.elements, ...elements];
      }
    },
  });
  api.addPage(pages);
  api.writeToProject('./src/routes.ts', generateCode(ast));
};
