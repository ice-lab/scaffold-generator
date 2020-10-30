#!/usr/bin/env node
const program = require('commander');
const inquirer = require('inquirer');
const path = require('path');
const fse = require('fs-extra');
const rimraf = require('rimraf');
const Generator = require('../lib/Generator');

program
  .option('-c, --config <config>', 'specify scaffold json config file')
  .option('-r, --root <rootDir>', 'specify generate directory')
  .option('-t, --tempate <templateDir>', 'specify template directory')
  .option('-l, --local <local>', 'use local blocks');

program.parse(process.argv);

(async () => {
  let rootPath = process.cwd();
  if (program.root) {
    rootPath = path.isAbsolute(program.root) ? program.root : path.join(process.cwd(), program.root);
  }

  let overwrite = true;
  if (fse.existsSync(rootPath)) {
    const files = fse.readdirSync(rootPath);
    if (files && files.length) {
      const question = {
        type: 'confirm',
        name: 'overwrite',
        message: '生成目录不为空，是否确定生成？',
        default: true,
      };
      overwrite = (await inquirer.prompt(question)).overwrite;
    }
    rimraf.sync(path.join(rootPath, '!(template|node_modules|tmp)'));
  }

  if (overwrite) {
    const generate = new Generator({
      rootDir: rootPath,
      configFile: program.config,
      tempate: program.tempate,
      useLocalBlocks: program.local,
    });
    generate.init();
  }
})();
