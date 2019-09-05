import debug from 'debug';
import { ICommand } from '../interfaces/ICommand';

import * as commands from './index';

export class HelpCommand implements ICommand {
  debug = debug('ynab-tools:help');
  keyword = 'help';

  run() {
    console.log('Usage: yarn start [command]');

    let usedSeparator = false;

    Object.keys(commands).forEach((commandName) => {
      const command = new commands[commandName]();
      if (typeof command.help === 'function') {
        if (!usedSeparator) {
          console.log('\nCommands:');
        }
        command.help();
      }
    });

    return true;
  }
}
