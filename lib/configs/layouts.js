const path = require('path');

module.exports = (api, layouts) => {
  const { context } = api;
  layouts.forEach((layout) => {
    const { source, targetDir = 'src/layouts', name, type, layoutConfig } = layout;
    const sourceUrl = type === 'builtIn' ? path.join(context.templateDir, `src/layouts/${name}`) : source;
    api.addSource({ source: sourceUrl, targetDir: path.join(context.rootDir, targetDir), name, isBlock: type === 'block' });
    if (layoutConfig) {
      const layoutPath = path.join(context.rootDir, targetDir, name);
      try {
        // eslint-disable-next-line global-require
        require('./layoutConfig')(api, layoutPath, layoutConfig);
      } catch (error) {
        console.log(error);
      }
    }
  });
};
