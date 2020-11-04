const path = require('path');

module.exports = (api, store) => {
  const { context } = api;
  if (store) {
    api.addSource({
      source: path.join(context.templateDir, 'src/models/tasks.ts'),
      targetDir: path.join(context.rootDir, 'src/pages/Solution/models/tasks.ts'),
    });
    api.addSource({
      source: path.join(context.templateDir, 'src/stores/tasks.ts'),
      targetDir: path.join(context.rootDir, 'src/pages/Solution/store.ts'),
    });
    api.addSource({
      source: path.join(context.templateDir, 'src/stores/user.ts'),
      targetDir: path.join(context.rootDir, 'src/store.ts'),
    });
  }
};
