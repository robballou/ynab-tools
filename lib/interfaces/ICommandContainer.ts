import { ICommand } from './ICommand';

export interface ICommandContainer {
  register (command: ICommand);
  get (commandName: string): ICommand;
}
