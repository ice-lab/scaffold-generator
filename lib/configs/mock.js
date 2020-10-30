const path = require('path');

module.exports = async (api, mock) => {
  const { context } = api;
  if (mock) {
    ['mock', 'src/models/user.ts'].forEach((source) => {
      api.addSource({
        source: path.join(context.templateDir, source),
        targetDir: path.join(context.rootDir, source),
      });
    });
  }
};
