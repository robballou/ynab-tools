import { ICommand } from './ICommand';

export interface ICommands {
  [propName: string]: ICommand;
}
