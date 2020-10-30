const path = require('path');
const fse = require('fs-extra');
const ejs = require('ejs');
const prettier = require('prettier');
const { getNpmTarball, getAndExtractTarball } = require('ice-npm-utils');

test('download block', async () => {
  const npmName = '@icedesign/ability-introduction-block';
  const version = '3.0.1';
  const registry = 'https://registry.npm.taobao.org';
  const tarballUrl = await getNpmTarball(npmName, version, registry);
  const destDir = path.join(__dirname, './temp');
  await getAndExtractTarball(destDir, tarballUrl);
  const pkg = fse.readJsonSync(path.join(destDir, 'package.json'));
  fse.removeSync(destDir);
  expect(tarballUrl).toBe(`${registry}/${npmName}/download/${npmName}-${version}.tgz`);
  expect(pkg.name).toBe(npmName);
});

test('render common template', () => {
  const templateContent = fse.readFileSync(path.join(__dirname, '../lib/template/block.common.ejs'), 'utf-8');
  [{
    blockList: [{ name: 'BlockA' }, { name: 'BlockB', npmName: 'test' }],
    blocks: [{ name: 'BlockA' }, { name: 'BlockB' }],
    pageName: 'main',
    pageProps: { gap: 0 },
    resultFile: 'expect.block.platten.js',
  }, {
    blockList: [{ name: 'BlockA' }, { name: 'BlockB' }, { name: 'BlockC' }],
    blocks: [{ name: 'BlockA' }, [{ name: 'BlockB' }, { name: 'BlockC' }]],
    pageName: 'main',
    pageProps: { gap: 20 },
    resultFile: 'expect.block.nets.js',
  }].forEach((blockConfig) => {
    const result = ejs.render(templateContent, blockConfig);
    const expectContent = fse.readFileSync(path.join(__dirname, 'expects', blockConfig.resultFile), 'utf-8');
    expect(prettier.format(result, { parser: 'babel', singleQuote: true }).replace(/[\n ]/g, '')).toBe(expectContent.replace(/[\n ]/g, ''));
  });
});
