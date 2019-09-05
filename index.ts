import debug from 'debug';
import * as dotenv from 'dotenv';
import * as minimist from 'minimist';
import * as commands from './lib/commands';
import { CommandContainer } from './lib/CommandContainer';
import { YNAB } from './lib/YNAB';
import { clearCache } from './lib/cache';

dotenv.config();

const ynab = new YNAB(process.env.YNAB_TOKEN);

const _commands: CommandContainer = new CommandContainer();
Object.keys(commands).forEach((command) => {
  _commands.register(new commands[command](ynab));
});

const mainDebug = debug('ynab-tools:main');
const main = function main(args) {
  if (args._.length === 0) {
    args._.push('help');
  }

  const command: string = args._.shift();

  if (args.verbose) {
    debug.enable('ynab-tools:*');
  }

  mainDebug({ args });

  if (_commands.names().indexOf(command) === -1) {
    console.error('Invalid command', command);
    process.exit(1);
  }

  const prereqs = [Promise.resolve()];
  if (args.cache === false || args.cache === 0) {
    prereqs.push(clearCache());
  }

  const thisCommand = _commands.get(command);
  mainDebug(`Found command for ${command}`, thisCommand);
  Promise.all(prereqs).then(() => {
    thisCommand.run(args);
  });
}

main(minimist(process.argv.slice(2)));
