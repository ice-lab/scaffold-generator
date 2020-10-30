const path = require('path');

module.exports = (api, store) => {
  const { context } = api;
  if (store) {
    api.addSource({
      source: path.join(context.templateDir, 'src/models/tasks.ts'),
      targetDir: path.join(context.rootDir, 'src/pages/Solution/models/tasks.ts'),
    });
  }
};