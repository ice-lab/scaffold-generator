const prettier = require('prettier');
const { CLIEngine } = require('eslint');

const engine = new CLIEngine({
  useEslintrc: true,
  fix: true,
});

const eslintFormat = (code) => {
  try {
    const report = engine.executeOnText(code);
    if (report.results[0].output) {
      return report.results[0].output;
    }
    return code;
  } catch (error) {
    console.log(error);
    return code;
  }
};

module.exports = (code) => prettier.format(eslintFormat(code), {
  singleQuote: true,
  trailingComma: 'es5',
  parser: 'typescript',
});
