const path = require('path');

module.exports = (api, files) => {
  const { context } = api;
  files.forEach(({ source, targetDir, name }) => {
    api.addSource({ source, targetDir: path.join(context.rootDir, targetDir), name });
  });
};
