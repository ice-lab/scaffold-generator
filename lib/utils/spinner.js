const ora = require('ora');
const chalk = require('chalk');

const spinner = ora();
let lastMsg = null;

module.exports = {
  ...spinner,
  startSpinner: (text) => {
    const symbol = chalk.green('✔');
    if (lastMsg) {
      spinner.stopAndPersist({
        symbol,
        text,
      });
    }
    spinner.text = text;
    lastMsg = {
      symbol,
      text,
    };
    spinner.start();
  },
  stopSpinner: () => {
    if (lastMsg) {
      spinner.stopAndPersist({
        symbol: lastMsg.symbol,
        text: lastMsg.text,
      });
    }
    spinner.stop();
    lastMsg = null;
  },
};
