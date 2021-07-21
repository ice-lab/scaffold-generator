const fse = require('fs-extra');
const path = require('path');

module.exports = (api) => {
  const { context: { rootDir } } = api;
  const entryFile = 'app.tsx';
  const entryCode = api.getEntryCode();
  if (!fse.existsSync(path.join(rootDir, 'src/app.ts')) && !fse.existsSync(path.join(rootDir, 'src/app.tsx'))) {
    api.writeToProject(`./src/${entryFile}`, entryCode);
  }
  [
    '_gitignore', 'public', 'src/global.scss', 'README.md', '.vscode',
    '_prettierrc.js', '_prettierignore',
    '_editorconfig', '_eslintignore',
    '_stylelintignore', '_stylelintrc.js',
  ].forEach((source) => {
    api.addTemplate({ source, formatDot: false });
  });
};
