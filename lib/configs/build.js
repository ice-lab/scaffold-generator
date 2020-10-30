const _ = require('lodash');
const { getLatestVersion } = require('ice-npm-utils');

module.exports = async (api, build) => {
  if (build) {
    const { theme, buildConfig } = build;
    const pluginPackages = {};
    if (theme) {
      const packageName = typeof theme === 'string' ? theme : theme.package;
      api.modifyBuildConfig((config) => {
        const plugins = (config.plugins || []).map((plugin) => {
          const [pluginName, options = {}] = Array.isArray(plugin) ? plugin : [plugin];
          if (pluginName === 'build-plugin-fusion') {
            return [pluginName, {...options, themePackage: packageName }];
          }
          return plugin;
        });
        return { ...config, plugins };
      });
      const version = theme.version || `^${await getLatestVersion(theme)}`;
      pluginPackages[packageName] = version;
    }

    if (buildConfig) {
      const { plugins, ...rest } = buildConfig;
      api.modifyBuildConfig((config) => {
        const { plugins: currentPlugins, ...settings } = config;
        if (plugins) {
          plugins.forEach(async (plugin) => {
            const [pluginName] = Array.isArray(plugin) ? plugin : [plugin];
            const existPluginIndex = _.findIndex(currentPlugins, (item) => item === pluginName || item[0] === pluginName);
            if (existPluginIndex > -1) {
              currentPlugins[existPluginIndex] = plugin;
            } else {
              currentPlugins.push(plugin);
              try {
                const latestVersion = `^${await getLatestVersion(pluginName)}`;
                pluginPackages[pluginName] = latestVersion;
              } catch (error) {
                console.log('[plugin error]', error);
              }
            }
          });
        }
        
        return { ...settings, ...(rest || {}), plugins: currentPlugins };
      });
    }

    api.extendPackage({
      dependencies: {
        ...pluginPackages,
      },
    });
  }
};
