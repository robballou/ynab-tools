import { ICommand } from './interfaces/ICommand';

export class CommandContainer {
  commands: ICommand[] = [];
  commandIndex: object = {};

  register(command: ICommand) {
    this.commands.push(command);
    this.commandIndex[command.keyword] = this.commands.length - 1;
  }

  get(commandName: string) {
    return this.commands[this.commandIndex[commandName]];
  }

  names() {
    return Object.keys(this.commandIndex);
  }
}
