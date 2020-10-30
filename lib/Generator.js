/* eslint-disable no-await-in-loop */
const path = require('path');
const fse = require('fs-extra');
const _ = require('lodash');
const merge = require('deepmerge');
const ejs = require('ejs');
const debug = require('debug')('scaffold');
const readDirFiles = require('fs-readdir-recursive');
const { getNpmTarball, getAndExtractTarball, getLatestVersion } = require('ice-npm-utils');
const prettierFormat = require('./utils/prettierFormat');
const spinner = require('./utils/spinner');

const builtInModules = ['formatFile'];
module.exports = class Generator {
  constructor({
    rootDir = process.cwd(),
    configFile = '.template/scaffold.json',
    template,
    useLocalBlocks,
  }) {
    this.useLocalBlocks = !!useLocalBlocks;
    this.rootDir = rootDir;
    this.config = this.getScaffoldConfig(configFile);
    this.blockTemp = path.join(this.rootDir, './tmp');
    this.templateDir = path.join(__dirname, 'scaffold');
    this.customTemplate = template ?
      path.resolve(rootDir, template) : path.join(rootDir, '.template');
    this.pkg = this.getProjectPkg();
    this.buildConfig = this.getBuildConfig();
    this.blockList = [];
    this.blocks = {};
    this.copyFiles = [];
    this.eventHooks = {};
    this.pageList = [];
    // bind generator api
    ['onHook', 'addSource', 'addPage', 'addTemplate', 'getEntryCode', 'modifyBuildConfig', 'writeToProject', 'extendPackage'].forEach((api) => {
      this[api] = this[api].bind(this);
    });
  }

  async init() {
    await this.loadConfigModule();
    await this.downloadBlockList();
    await this.generatePages();
    this.generateFile();

    // write project pkg
    fse.writeJsonSync(path.join(this.rootDir, 'package.json'), this.pkg, { spaces: 2 });
    // write build json
    fse.writeJsonSync(path.join(this.rootDir, 'build.json'), this.buildConfig, { spaces: 2 });
    await this.applyHook('afterGenerate');
    this.cleanBlockTemp();
    this.applyHook('afterCleanUp');
  }

  // eslint-disable-next-line
  getScaffoldConfig(configFile) {
    const configPath = path.join(this.rootDir, configFile);
    try {
      return fse.readJsonSync(configPath);
    } catch (error) {
      console.log('Fail to get scaffold config');
      throw error;
    }
  }

  getProjectPkg() {
    const pkgPath = path.resolve(this.templateDir, '_package.json');
    let pkg = {};
    if (fse.existsSync(pkgPath)) {
      try {
        pkg = fse.readJsonSync(pkgPath);
      } catch (err) {
        debug(`Fail to load config file ${pkgPath}.`);
      }
    }
    return pkg;
  }

  getBuildConfig() {
    const configPath = path.resolve(this.templateDir, 'build.json');
    let config = {};
    if (fse.existsSync(configPath)) {
      try {
        config = fse.readJsonSync(configPath);
      } catch (err) {
        debug(`Fail to load config file ${configPath}.`);
      }
    }

    return config;
  }

  async loadConfigModule() {
    const modules = Array.from(new Set(Object.keys(this.config).concat(builtInModules)));
    for (const configKey of modules) {
      try {
        const requireFile = `./configs/${configKey}.js`;
        if (fse.existsSync(path.join(__dirname, requireFile))) {
          // eslint-disable-next-line
          await require(requireFile)({
            context: _.pick(this, ['pkg', 'rootDir', 'config', 'templateDir', 'customTemplate']),
            onHook: this.onHook,
            addSource: this.addSource,
            addPage: this.addPage,
            addTemplate: this.addTemplate,
            writeToProject: this.writeToProject,
            extendPackage: this.extendPackage,
            getEntryCode: this.getEntryCode,
            modifyBuildConfig: this.modifyBuildConfig,
          }, this.config[configKey], this.config);
        }
      } catch (error) {
        console.log('[require]', error);
      }
    }
  }

  onHook(key, fn) {
    if (!Array.isArray(this.eventHooks[key])) {
      this.eventHooks[key] = [];
    }
    this.eventHooks[key].push(fn);
  }

  async applyHook(key, opts = {}) {
    const hooks = this.eventHooks[key] || [];

    for (const fn of hooks) {
      await fn(opts);
    }
  }

  getEntryCode() {
    const projectEntry = path.join(this.rootDir, 'src/app.tsx');
    const templateEntry = path.join(this.templateDir, 'src/app.tsx');
    const entryPath = fse.existsSync(projectEntry) ? projectEntry : templateEntry;
    return fse.readFileSync(entryPath, 'utf-8');
  }

  /**
   * modify build.json
   */
  modifyBuildConfig(fn) {
    this.buildConfig = fn(this.buildConfig);
  }

  /**
   * Extend package.json by block dependencies
   */
  extendPackage(fileds, overwrite) {
    const { pkg } = this;
    // eslint-disable-next-line guard-for-in
    for (const key in fileds) {
      const value = fileds[key] || {};
      const currentValue = pkg[key];
      if (key === 'dependencies' || key === 'devDependencies') {
        pkg[key] = pkg[key] || {};
        // TODO check conflict versions
        if (overwrite) {
          pkg[key] = { ...pkg[key], ...value };
        } else {
          for (const packageName in value) {
            if (pkg[key][packageName] && pkg[key][packageName] !== value[packageName]) {
              console.log(`conflicting versions of ${key}(${packageName})`);
              console.log(`incoming change is ${packageName}: ${value[packageName]}`);
              console.log(`Using ${packageName}: ${pkg[key][packageName]}`);
            } else {
              pkg[key][packageName] = value[packageName];
            }
          }
        }
      } else if (_.isObject(value) && _.isObject(currentValue)) {
        pkg[key] = merge(currentValue, value);
      } else if (_.isArray(value) && _.isArray(currentValue)) {
        pkg[key] = [...new Set([...currentValue, ...value])];
      } else {
        pkg[key] = value;
      }
    }
  }

  /**
   * get block from local
   */
  getBlockFromLocal(npmName) {
    console.log('read block from local', npmName);
    if (!this.blocks[npmName]) {
      const localDir = path.join(this.rootDir, '../../blocks');
      const blocksList = fse.readdirSync(localDir);
      let pkg = {};
      const blockMatch = blocksList.find((block) => {
        const blockPkgjson = path.join(localDir, block, 'package.json');
        pkg = require(blockPkgjson);
        return pkg.name === npmName;
      });

      if (blockMatch) {
        const destDir = path.join(localDir, blockMatch, 'src');
        this.blocks[npmName] = {
          destDir: path.join(localDir, blockMatch),
          files: readDirFiles(destDir),
          pkg,
        };
        this.extendPackage({ dependencies: pkg.dependencies || {} });
        return this.blocks[npmName];
      }
      return false;
    }

    return this.blocks[npmName];
  }

  /**
   * download block content to the specified directory
   */
  async downloadBlock(npmName) {
    if (!this.blocks[npmName]) {
      try {
        // TODO support npm version
        const destDir = path.join(this.blockTemp, npmName);
        let files = [];

        if (!fse.existsSync(destDir)) {
          spinner.startSpinner(`getNpmTarball ${npmName}`);
          const tarballUrl = await getNpmTarball(npmName, 'latest');
          spinner.stopSpinner();
          spinner.startSpinner(`downloading ${tarballUrl}`);
          // spinner.succeed(`${tarballUrl}`);
          files = await getAndExtractTarball(destDir, tarballUrl);
        } else {
          files = readDirFiles(destDir);
        }

        const pkg = fse.readJsonSync(path.join(destDir, 'package.json')) || {};
        this.blocks[npmName] = {
          destDir,
          files,
          pkg,
        };
        // extend dependencies
        this.extendPackage({ dependencies: pkg.dependencies || {} });
        spinner.stopSpinner();
      } catch (error) {
        spinner.fail();
        console.log('[ERROR]', `Fail to get ${npmName}`);
      }
    }
    return this.blocks[npmName];
  }

  /**
   * download block list
   */
  async downloadBlockList() {
    for (const blockInfo of this.blockList) {
      const { source, targetDir, name } = blockInfo;
      const blockData = (this.useLocalBlocks && this.getBlockFromLocal(source)) || await this.downloadBlock(source);
      this.copyFiles.push({
        source: `${blockData.destDir}/src`,
        targetDir: path.join(targetDir, name || ''),
      });
    }
  }

  /**
   *  store page
   */
  addPage(page) {
    if (Array.isArray(page)) {
      this.pageList = this.pageList.concat(page);
    } else {
      this.pageList.push(page);
    }
  }

  async formatBlocks(packages, pageDir) {
    const blocks = [];
    for (const blockSource of packages) {
      if (Array.isArray(blockSource)) {
        blocks.push(await this.formatBlocks(blockSource, pageDir));
      } else if (typeof blockSource === 'string' || (
        blockSource.name && !blockSource.source
      )) {
        const npmName = blockSource.name || blockSource;
        const blockData = (this.useLocalBlocks && this.getBlockFromLocal(npmName)) || await this.downloadBlock(npmName);
        const blockName = _.startCase(blockData.pkg.blockConfig && blockData.pkg.blockConfig.name).replace(/\s/g, '');
        blocks.push({
          ...(blockSource.name ? blockSource : {}),
          name: blockName,
          type: blockSource.type || 'block',
        });
        this.copyFiles.push({
          source: `${blockData.destDir}/src`,
          targetDir: blockSource.type === 'common'
            ? path.join(this.rootDir, `src/components/${blockName}`)
            : path.join(this.rootDir, `${pageDir}/components/${blockName}`),
        });
      } else if (blockSource.name && blockSource.source) {
        const { name, source } = blockSource;
        blocks.push({
          ...blockSource,
        });
        if (blockSource.type !== 'bizComponent') {
          this.copyFiles.push({
            source: blockSource.type === 'builtIn' ? path.join(this.templateDir, source) : path.join(this.customTemplate, source),
            targetDir: path.join(this.rootDir, `${pageDir}/components/${name}`),
          });
        } else {
          // add dependencies
          const version = blockSource.version || `^${await getLatestVersion(source)}`;
          this.extendPackage({ dependencies: { [source]: version } });
        }
      }
    }
    return blocks;
  }

  /**
   * generate page by combine blocks
   */
  async generatePages() {
    const defaultContainer = 'block.common';
    for (const page of this.pageList) {
      // set default gap 20
      const { name, props = { gap: 20 }, blocks: { container, packages } } = page;
      console.log(`\n=== generate page ${name} ===`);
      const pageName = _.upperFirst(name);
      const pageDir = `src/pages/${pageName}`;
      const blocks = await this.formatBlocks(packages, pageDir);

      const templatePath = path.resolve(__dirname, `./template/${container || defaultContainer}.ejs`);
      if (!fse.existsSync(templatePath)) {
        throw new Error(`fail to read template ${container}`);
      }
      console.log('[blocks]', blocks);
      console.log('[page props]', props);
      const templateData = {
        blockList: Array.from(new Set(_.flattenDeep(blocks).map((block) => ({
          name: block.name,
          npmName: (block.type === 'common' && `@/components/${block.name}`)
            || (block.type === 'bizComponent' && block.source),
        })))),
        blocks,
        pageName,
        pageProps: props,
      };

      debug(`render ejs ${JSON.stringify(templateData)}`);

      const templateContent = fse.readFileSync(templatePath, 'utf-8');
      const pageCode = ejs.render(templateContent, templateData);
      this.writeToProject(path.join(this.rootDir, pageDir, 'index.tsx'), prettierFormat(pageCode));
    }
  }

  /**
   * copy file to the specified directory
   */
  generateFile() {
    this.copyFiles.forEach(({ source, targetDir }) => {
      if (source.indexOf('ice-scaffold-generator/lib/scaffold/') !== -1) {
        const stat = fse.lstatSync(source);
        let files = [];

        if (stat.isFile()) {
          files = [{
            sourcePath: source,
            targetPath: targetDir,
          }];
        } else {
          const allFiles = readDirFiles(source);
          files = allFiles.map(item => {
            return {
              sourcePath: path.join(source, item),
              targetPath: path.join(targetDir, item),
            };
          });
        }

        files.forEach(item => {
          const templateContent = fse.readFileSync(item.sourcePath, 'utf-8');
          const realData = ejs.render(templateContent, {
            description: this.config.pkgData.description,
            title: this.config.pkgData.scaffoldConfig.title,
          });
          fse.ensureFileSync(item.targetPath);
          fse.writeFileSync(item.targetPath, realData);
          debug(`copy ${item.sourcePath} to ${item.targetPath}`);
        });
      } else {
        try {
          fse.copySync(source, targetDir);
          if (this.useLocalBlocks) {
            fse.removeSync(path.join(targetDir, 'style.d.ts'));
          }
          debug(`copy ${source} to ${targetDir}`);
        } catch (err) {
          console.error(err);
        }
      }
    });
  }

  /**
   * add block source (local source or npm package)
   */
  addSource({ name, source, targetDir, isBlock }) {
    // local source
    if (path.isAbsolute(source) || fse.existsSync(path.resolve(this.customTemplate, source))) {
      this.copyFiles.push({
        source: path.isAbsolute(source) ? source : path.resolve(this.customTemplate, source),
        targetDir: path.join(targetDir, name || ''),
      });
    } else if (isBlock) {
      this.blockList.push({ name, source, targetDir });
    }
  }

  /**
   * add default file if it is not exisit in custom template
   */
  addTemplate({ source, formatDot }) {
    let targetDir = path.resolve(this.rootDir, source);
    let sourcePath = null;
    if (fse.existsSync(path.resolve(this.customTemplate, source))) {
      sourcePath = path.join(this.customTemplate, source);
    } else {
      sourcePath = path.join(this.templateDir, source);
    }
    if (formatDot) {
      const basename = path.basename(targetDir);
      const dirname = path.dirname(targetDir);
      targetDir = path.join(dirname, basename.replace(/^_/, '.'));
    }
    this.copyFiles.push({
      source: sourcePath,
      targetDir,
    });
  }

  /**
   * write content to specified path
   */
  writeToProject(writePath, content) {
    let filePath = writePath;
    if (!path.isAbsolute(filePath)) {
      filePath = path.join(this.rootDir, writePath);
    }
    fse.ensureDirSync(path.dirname(filePath));
    if (fse.existsSync(filePath) && fse.readFileSync(filePath, 'utf-8') === content) {
      return;
    }
    fse.writeFileSync(filePath, content, 'utf-8');
  }

  cleanBlockTemp() {
    fse.removeSync(this.blockTemp);
    debug('remove block temp folder');
  }
};
