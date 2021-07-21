const path = require('path');
const fse = require('fs-extra');
const glob = require('glob');

const getFileList = (patterns, options) => {
  let fileList = [];
  patterns.forEach((pattern) => {
    fileList = [...fileList, ...glob.sync(pattern, options)];
  });
  return fileList;
};

module.exports = (api, typescript) => {
  const { context } = api;
  const lintFile = typescript ? '_eslintrcts.js' : '_eslintrcjs.js';
  if (!typescript) {
    api.onHook('afterCleanUp', () => {
      // complie ts -> ts
      const fileList = getFileList(['**/*.tsx', '**/*.ts'], {
        cwd: context.rootDir,
        ignore: ['**/*.d.ts', 'node_modules/**/*'],
      });
      // TODO: This statement is temporary, and it should be moved to the top.
      // reason: transform-ts-to-js package requires the @iceworks/spec, which requires the eslint configs.
      // When using webpack to bundle application, it can't find the the eslint config files when creating the JS scaffold.
      const transformTsToJs = require('transform-ts-to-js');
      transformTsToJs(fileList, {
        cwd: context.rootDir,
        action: 'overwrite',
      });
    });
    api.addTemplate({ source: 'jsconfig.json' });
  } else {
    api.addTemplate({ source: 'src/typings.d.ts' });

    api.onHook('afterGenerate', () => {
      const pkgPath = path.join(context.rootDir, 'package.json');
      const pkgData = fse.readJSONSync(pkgPath);

      delete pkgData.dependencies['@types/react'];
      delete pkgData.dependencies['@types/react-dom'];

      pkgData.devDependencies['@types/react'] = '^17.0.2';
      pkgData.devDependencies['@types/react-dom'] = '^17.0.2';

      fse.writeJsonSync(pkgPath, pkgData, {
        spaces: 2,
      });
    });
  }

  api.addTemplate({ source: 'tsconfig.json' });
  const lintCode = fse.readFileSync(path.join(context.templateDir, lintFile), 'utf-8');
  api.writeToProject('./_eslintrc.js', lintCode);
};
