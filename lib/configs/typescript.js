const path = require('path');
const fse = require('fs-extra');
const transformTsToJs = require('transform-ts-to-js');
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
      transformTsToJs(fileList, {
        cwd: context.rootDir,
        action: 'overwrite',
      });
    });
    api.addTemplate({ source: 'jsconfig.json' });
  } else {
    api.addTemplate({ source: 'src/typings.d.ts' });
  }

  api.addTemplate({ source: 'tsconfig.json' });
  const lintCode = fse.readFileSync(path.join(context.templateDir, lintFile), 'utf-8');
  api.writeToProject('./_eslintrc.js', lintCode);
};
